#!/usr/bin/env python3
"""znCRT GitHub 同步器（无子进程，纯 REST git data API）。

背景：本机（DSHM 沙箱）git CLI 无法 push——run-command 子进程被沙箱阻断
（BUG: run-command.c:525 disabling cancellation: Operation not permitted），
故远端同步改走 GitHub REST：把工作树（除 .git/）打包为单个远端提交，镜像到 origin/main。

凭证：从 ~/.git-credentials 读取（https://user:token@github.com），凭证不入库。
用法：python3 tools/github_sync.py "commit message"
"""
import base64
import json
import os
import ssl
import sys
import urllib.error
import urllib.request

REPO = os.environ.get("ZNCRT_REPO", "damon-snc/znCRT")
API = "https://api.github.com"

# 本机 python 无系统 CA 根证书：默认 cafile 为空时，改用 curl 引导下载的 ~/ .ssl/cacert.pem
if not ssl.get_default_verify_paths().cafile:
    _ca = os.path.join(os.path.expanduser("~"), ".ssl", "cacert.pem")
    if os.path.exists(_ca):
        os.environ["SSL_CERT_FILE"] = _ca


def creds():
    home = os.path.expanduser("~")
    with open(os.path.join(home, ".git-credentials"), encoding="utf-8") as f:
        line = f.read().strip().splitlines()[0]
    body = line.split("://", 1)[1]          # user:token@github.com
    user, rest = body.split(":", 1)
    token = rest.rsplit("@", 1)[0]
    return user, token


USER, TOKEN = creds()


def call(method, path, payload=None):
    req = urllib.request.Request(API + path, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    data = json.dumps(payload).encode() if payload is not None else None
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, data, timeout=30) as r:
            body = r.read()
            return r.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def collect_files(root):
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d != ".git"]
        for fn in filenames:
            full = os.path.join(dirpath, fn)
            out.append((os.path.relpath(full, root), full))
    return sorted(out)


def main():
    msg = sys.argv[1] if len(sys.argv) > 1 else "sync from znCRT worktree"
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    files = collect_files(root)
    if not files:
        sys.exit("no files to sync")

    parent_sha, base_tree = None, None
    st, ref = call("GET", f"/repos/{REPO}/git/ref/heads/main")
    if st == 200:
        parent_sha = ref["object"]["sha"]
        st2, pc = call("GET", f"/repos/{REPO}/git/commits/{parent_sha}")
        if st2 == 200:
            base_tree = pc["tree"]["sha"]

    entries = []
    for rel, full in files:
        with open(full, "rb") as f:
            b = f.read()
        st, blob = call("POST", f"/repos/{REPO}/git/blobs",
                        {"content": base64.b64encode(b).decode(), "encoding": "base64"})
        if st != 201:
            sys.exit(f"blob failed {rel}: {st} {blob}")
        entries.append({"path": rel, "mode": "100644", "type": "blob", "sha": blob["sha"]})

    tree_payload = {"tree": entries}
    if base_tree:
        tree_payload["base_tree"] = base_tree
    st, tree = call("POST", f"/repos/{REPO}/git/trees", tree_payload)
    if st != 201:
        sys.exit(f"tree failed: {st} {tree}")

    commit_payload = {"message": msg, "tree": tree["sha"]}
    if parent_sha:
        commit_payload["parents"] = [parent_sha]
    st, commit = call("POST", f"/repos/{REPO}/git/commits", commit_payload)
    if st != 201:
        sys.exit(f"commit failed: {st} {commit}")

    if parent_sha:
        st, _ = call("PATCH", f"/repos/{REPO}/git/refs/heads/main",
                     {"sha": commit["sha"], "force": False})
    else:
        st, _ = call("POST", f"/repos/{REPO}/git/refs",
                     {"ref": "refs/heads/main", "sha": commit["sha"]})
    if st not in (200, 201):
        sys.exit(f"ref update failed: {st}")

    print(f"SYNCED repo={REPO} files={len(files)} commit={commit['sha'][:10]} msg={msg}")


if __name__ == "__main__":
    main()
