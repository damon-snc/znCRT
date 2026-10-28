// znCRT ADR-0003 E5b/c/d 三合一探针：一次 DSHM 重启验证三步——
//   E5b  挂载即开 127.0.0.1:8978（curl /api/hello）
//   E5c  进程内 require ssh2 + ws（GET /api/modules）
//   E5d  ssh2 实弹连接（POST /api/ssh，凭证明文随请求、不落盘不缓存）
// 全绿判据见 docs/adr/ADR-0003-SSH栈与通信通道选型.md §E5 探针系列。
import http from "node:http";
import { createRequire } from "node:module";

export const name = "zncrt-engine";

// ESM 内构造 require：从本插件包位置解析依赖（pnpm 布局下指向 zncrt 的依赖树）
let require = null;
try {
  require = createRequire(import.meta.url);
} catch (e) {
  console.log("[zncrt] createRequire unavailable:", String(e && e.message || e));
}

export function apply(ctx) {
  const log = (...a) => {
    try { ctx.logger.info(...a); } catch { console.log("[zncrt]", ...a); }
  };
  const startedAt = new Date().toISOString();

  // E5c：进程内模块解析（在请求期做，装载失败不拖垮挂载；require 为 null 时如实报错）
  function probeModules() {
    const out = {};
    for (const m of ["ssh2", "ws"]) {
      if (!require) { out[m] = { ok: false, error: "createRequire unavailable in host loader" }; continue; }
      try {
        const mod = require(m);
        out[m] = { ok: true, keys: Object.keys(mod).slice(0, 6) };
      } catch (err) {
        out[m] = { ok: false, error: String(err && err.message || err) };
      }
    }
    return out;
  }

  async function readBody(req) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    return Buffer.concat(chunks).toString("utf8");
  }

  function sshSmoke({ host, port = 22, user, pass, cmd = "whoami && uname -a" }) {
    return new Promise((resolve) => {
      let Client;
      try {
        Client = require("ssh2").Client;
      } catch (err) {
        return resolve({ ok: false, stage: "require", error: String(err && err.message || err) });
      }
      const conn = new Client();
      const timer = setTimeout(() => {
        try { conn.end(); } catch {}
        resolve({ ok: false, stage: "timeout" });
      }, 15000);
      conn.on("ready", () => {
        conn.exec(cmd, (err, stream) => {
          if (err) { clearTimeout(timer); conn.end(); return resolve({ ok: false, stage: "exec", error: String(err) }); }
          let out = "";
          stream.on("data", (d) => { out += d; })
            .on("close", (code) => {
              clearTimeout(timer); conn.end();
              resolve({ ok: true, exitCode: code, output: out.trim(), smoke: "SMOKE_OK" });
            })
            .stderr.on("data", (d) => { out += d; });
        });
      }).on("error", (err) => {
        clearTimeout(timer);
        resolve({ ok: false, stage: "connect", error: String(err && err.message || err) });
      }).connect({
        host, port: Number(port), username: user, password: pass,
        readyTimeout: 12000,
      });
    });
  }

  const server = http.createServer(async (req, res) => {
    const send = (code, obj) => {
      res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(obj));
    };
    try {
      if (req.method === "GET" && req.url === "/api/hello") {
        return send(200, { probe: "E5b", ok: true, startedAt, now: new Date().toISOString() });
      }
      if (req.method === "GET" && req.url === "/api/modules") {
        return send(200, { probe: "E5c", modules: probeModules() });
      }
      if (req.method === "POST" && req.url === "/api/ssh") {
        const body = JSON.parse(await readBody(req) || "{}");
        const result = await sshSmoke(body);
        return send(result.ok ? 200 : 500, { probe: "E5d", ...result });
      }
      send(404, { error: "not found", hint: "GET /api/hello | GET /api/modules | POST /api/ssh" });
    } catch (err) {
      send(500, { error: String(err && err.message || err) });
    }
  });

  server.on("error", (err) => log("probe server error:", err.message));
  server.listen(8978, "127.0.0.1", () => {
    log("zncrt E5b/c/d probe listening on http://127.0.0.1:8978");
  });

  ctx.on("dispose", () => { server.close(); log("zncrt probe server closed"); });
}
