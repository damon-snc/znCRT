#!/usr/bin/env python3
"""znCRT engine v0 —— 本机引擎骨架（stdlib-only，无第三方依赖）。

形态对标 hexhub 架构（Web 前端 + 本地引擎 RPC）：
- GET /            → web/index.html（前端入口）
- GET /api/status  → 引擎状态 JSON（能力自述，随差异矩阵演进）
- 其余             → 404

运行：python3 engine/server.py [port]   默认 8977，绑定 127.0.0.1（设备本机）
选型依据：docs/adr/ADR-0002（2026-10-28 夜战：python3 为本机当前唯一可完整监听端口的运行时）
"""
import json
import os
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

START = time.time()
ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
VERSION = "0.1.0-day1"


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802 - http.server API
        if self.path in ("/", "/index.html"):
            body = (WEB / "index.html").read_bytes()
            self._send(200, "text/html; charset=utf-8", body)
        elif self.path == "/api/status":
            payload = {
                "name": "znCRT-engine",
                "version": VERSION,
                "uptime_sec": round(time.time() - START, 1),
                "capabilities": {
                    "ssh": False,
                    "sftp": False,
                    "db": False,
                    "terminal": False,
                },
                "roadmap": "对标 hexhub：docs/02-diff-matrix.md",
            }
            self._send(200, "application/json; charset=utf-8",
                       json.dumps(payload, ensure_ascii=False).encode())
        else:
            rel = self.path.lstrip("/")
            if rel.startswith(("vendor/", "assets/")):
                target = (WEB / rel).resolve()
                if str(target).startswith(str(WEB.resolve()) + os.sep) and target.is_file():
                    ctype = {
                        ".css": "text/css; charset=utf-8",
                        ".js": "application/javascript; charset=utf-8",
                        ".map": "application/json",
                        ".woff": "font/woff", ".woff2": "font/woff2",
                    }.get(target.suffix, "application/octet-stream")
                    self._send(200, ctype, target.read_bytes())
                    return
            self._send(404, "text/plain; charset=utf-8", b"not found")

    def _send(self, code, ctype, body):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        sys.stdout.write("[znCRT] %s %s\n" % (self.address_string(), fmt % args))
        sys.stdout.flush()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8977
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"[znCRT] engine v{VERSION} listening on http://127.0.0.1:{port}", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
