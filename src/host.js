// znCRT E5a/E5b 探针（ADR-0003）：验证「插件挂载 → 进程内开 HTTP 端口」这一 A' 存活前提。
// 全绿判据：DSHM 重启挂载本插件后，curl http://127.0.0.1:8978/api/hello 返回 JSON。
import http from "node:http";

export const name = "zncrt-engine";

export function apply(ctx) {
  const log = (...a) => {
    try { ctx.logger.info(...a); } catch { console.log("[zncrt]", ...a); }
  };

  const server = http.createServer((req, res) => {
    const body = JSON.stringify({
      probe: "E5a/E5b",
      ok: true,
      url: req.url,
      startedAt: START_TS,
      now: new Date().toISOString(),
    });
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(body);
  });

  const START_TS = new Date().toISOString();
  server.on("error", (err) => log("probe server error:", err.message));
  server.listen(8978, "127.0.0.1", () => {
    log("zncrt E5a/E5b probe listening on http://127.0.0.1:8978");
  });

  ctx.on("dispose", () => {
    server.close();
    log("zncrt probe server closed");
  });
}
