#!/usr/bin/env python3
"""znCRT SSH 链路冒烟 —— 差异矩阵 P0 项「SSH 连接」的第一滴血。

凭证一律走环境变量（绝不硬编码入库）：
  ZN_SSH_HOST / ZN_SSH_PORT / ZN_SSH_USER / ZN_SSH_PASS
用法：
  PYTHONPATH=vendor python3 engine/smoke_ssh.py [command]
默认命令：whoami && uname -a
"""
import os
import sys

import paramiko


def main():
    host = os.environ["ZN_SSH_HOST"]
    port = int(os.environ.get("ZN_SSH_PORT", "22"))
    user = os.environ["ZN_SSH_USER"]
    pw = os.environ["ZN_SSH_PASS"]
    cmd = sys.argv[1] if len(sys.argv) > 1 else "whoami && uname -a"

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=port, username=user, password=pw, timeout=12,
                   allow_agent=False, look_for_keys=False)
    _, out, err = client.exec_command(cmd, timeout=12)
    stdout = out.read().decode(errors="replace").strip()
    stderr = err.read().decode(errors="replace").strip()
    print(f"RC host={host}:{port} user={user} cmd={cmd!r}")
    print("STDOUT:", stdout[:400])
    if stderr:
        print("STDERR:", stderr[:200])
    client.close()
    print("SMOKE_OK")


if __name__ == "__main__":
    main()
