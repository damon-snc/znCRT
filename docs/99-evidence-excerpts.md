# 证据摘录（仓库外内部档案 → 仓库内可复核，销 ADR-0002 评审建议-4）

> 出处：工作区根 `MIGRATION-APPLIED-20261024.md`（啾啾·云图迁移包安放记录，2026-10-24）。
> 摘录仅保留 ADR 引用的关键结论，原文以内部档案为准。

## §5.1 Hindsight 接线明细（节选）——node 子进程可用性先例

- 工人 MCP `server.mjs` 传输层改 `node:http` 的原因原文：**"本机 node 子进程 undici fetch 全挂"**——node 子进程在部分路径下异常是本机已知事实，与 ADR-0002 事实 4（V8 errno check 崩溃）互为印证。
- MCP 以 `/data/service/hnp/bin/node`（v24.13.0）作为子进程命令跑通 stdio 冒烟——**宿主派生的 node 子进程可用，bash 派生的崩**（ADR-0002 事实 4 的精确口径）。

## HAP 内嵌引擎先例（节选）

- 本机 DSHM = HAP 应用，沙箱 HOME `/data/storage/el2/base/haps/entry/files` 内内嵌 node/python3 完整运行时与 toolchain——**HAP 内嵌引擎可行，但对应整个 DSHM 工程量级**（ADR-0002 事实 7 双面结论的出处）。
- 沙箱内可 execve 原生 ELF：busybox/python3/http.server 等实测先例（ADR-0002 事实 3/5/10）。
