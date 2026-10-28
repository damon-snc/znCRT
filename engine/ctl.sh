#!/usr/bin/env bash
# znCRT 引擎控制脚本（ADR-0002 部署生命周期 · 一键启动/停止/状态）
# 现状口径：DSH 终端人肉启动的临时形态；setsid 尽量脱离会话，但引擎仍在
# DSHM 进程树下，宿主消亡/设备重启后需重跑 start（如实标注，不宣称自愈）。
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$HERE/.engine.pid"
PORT="${ZNCRT_PORT:-8977}"

alive() {
  [ -f "$PIDFILE" ] || return 1
  curl -s -m 3 "http://127.0.0.1:$PORT/api/status" >/dev/null 2>&1
}

start() {
  if alive; then echo "already running: $(cat "$PIDFILE")"; return 0; fi
  local launcher="python3"
  command -v setsid >/dev/null 2>&1 && launcher="setsid python3"
  $launcher "$HERE/server.py" "$PORT" >> "$HERE/engine.log" 2>&1 &
  echo $! > "$PIDFILE"
  sleep 1
  if curl -s -m 3 "http://127.0.0.1:$PORT/api/status" >/dev/null 2>&1; then
    echo "STARTED pid=$(cat "$PIDFILE") port=$PORT"
  else
    echo "START FAILED（详见 $HERE/engine.log）"
    rm -f "$PIDFILE"
    return 1
  fi
}

stop() {
  if [ -f "$PIDFILE" ]; then
    kill "$(cat "$PIDFILE")" 2>/dev/null && echo "STOPPED $(cat "$PIDFILE")" || echo "no such process"
    rm -f "$PIDFILE"
  else
    echo "not running"
  fi
}

status() {
  if alive; then
    curl -s -m 3 "http://127.0.0.1:$PORT/api/status"
    echo
    echo "STATUS: running pid=$(cat "$PIDFILE") port=$PORT"
  else
    echo "STATUS: stopped"
    return 1
  fi
}

case "${1:-status}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  restart) stop; start ;;
  *) echo "usage: $0 start|stop|status|restart  (ZNCRT_PORT 默认 8977)"; exit 2 ;;
esac
