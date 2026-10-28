// znCRT E5e 预置模块：WS 终端通道（ssh2 shell 流 ↔ WebSocket 二进制透传）
// 状态：**预置未接线**——host.js v0.2.0-e5bcd 通过 E5b/c/d 验证后，
// 在 v0.3.0-e5e 中 import 本模块并调用 attachTermWs(server, require)。
// 设计口径（docs/04-rea-protocol.md）：对齐 hexhub Channel 三原语（open/close/send），
// v1 用 JSON 控制帧 + 二进制数据帧（简单可调试），不对齐线缆格式。
"use strict";

import { WebSocketServer } from "ws";

export function attachTermWs(httpServer, requireFn) {
  const wss = new WebSocketServer({ noServer: true });
  const sessions = new Map(); // ws -> {conn, stream}
  let nextId = 1;

  // 升级握手：/ws/term
  httpServer.on("upgrade", (req, socket, head) => {
    if (!req.url.startsWith("/ws/term")) return; // 非本模块路由，放行给其他处理器
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  wss.on("connection", (ws) => {
    const id = nextId++;
    ws.send(JSON.stringify({ t: "hello", id, proto: "zncrt-term-1" }));
    ws.on("message", (buf, isBinary) => {
      if (isBinary) {
        // 数据帧：终端输入透传（Channel.send 语义）
        const s = sessions.get(ws);
        if (s && s.stream) s.stream.write(buf);
        return;
      }
      // 控制帧（JSON）
      let msg;
      try { msg = JSON.parse(buf.toString("utf8")); } catch { return ws.send(JSON.stringify({ t: "error", error: "bad frame" })); }
      if (msg.t === "open") return openSession(ws, id, msg);
      if (msg.t === "close") return closeSession(ws);
      if (msg.t === "resize" && sessions.get(ws)) {
        const s = sessions.get(ws);
        try { s.stream.setWindow(msg.rows, msg.cols); } catch {}
      }
    });
    ws.on("close", () => closeSession(ws));
  });

  function openSession(ws, id, cfg) {
    const ssh2 = requireFn("ssh2");
    const conn = new ssh2.Client();
    conn.on("ready", () => {
      conn.shell({ term: "xterm-256color", cols: cfg.cols || 80, rows: cfg.rows || 24 }, (err, stream) => {
        if (err) return ws.send(JSON.stringify({ t: "error", stage: "shell", error: String(err.message || err) }));
        sessions.set(ws, { conn, stream });
        ws.send(JSON.stringify({ t: "ready", id }));
        stream.on("data", (d) => { if (ws.readyState === 1) ws.send(d); }); // 二进制回传
        stream.stderr.on("data", (d) => { if (ws.readyState === 1) ws.send(d); });
        stream.on("close", () => { ws.send(JSON.stringify({ t: "closed", id })); closeSession(ws); });
      });
    }).on("error", (err) => {
      ws.send(JSON.stringify({ t: "error", stage: "connect", error: String(err.message || err) }));
    }).connect({
      host: cfg.host, port: Number(cfg.port) || 22,
      username: cfg.user, password: cfg.pass,
      readyTimeout: 12000,
    });
    sessions.set(ws, { conn, stream: null }); // 占位：ready 后补 stream
  }

  function closeSession(ws) {
    const s = sessions.get(ws);
    if (!s) return;
    sessions.delete(ws);
    try { s.stream && s.stream.close(); } catch {}
    try { s.conn.end(); } catch {}
  }

  return { wss, sessions, closeAll: () => { for (const ws of sessions.keys()) closeSession(ws); wss.close(); } };
}
