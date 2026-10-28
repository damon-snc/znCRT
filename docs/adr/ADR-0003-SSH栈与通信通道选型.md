# ADR-0003 SSH 栈与通信通道选型

- 状态：**草案 r2**（按 [ADR-0003-review](ADR-0003-review.md) 修订 4 条 [阻塞]；E5 探针进行中；Damon 拍板项待留痕）
- 日期：2026-10-28 立案 · r2 同夜销项 · 作者：啾啾（Lead）· 评审：codex-arch（有条件通过）

## 背景与硬约束

- 差异矩阵 P0 主链路 = SSH 连接 + 终端交互 + SFTP（对标 hexhub SSH 管理器 15 项）。
- 宿主 Python 边界（ADR-0002 事实 10）：pip 仅纯 Python 包，C 扩展 .so 被 musl-LDSO 拒载。
- **E2' 证伪"第三方 ELF 可 execve"**（见证据表）：第三方未签名二进制在本机不可执行。
- 服务器资源与 GitLab CI 理论可做交叉编译，但产物落本机仍撞 E2'（不可执行）——服务器编译只服务 Phase 2 签名 HAP 路线。
- DSHM 宿主（node 24）及其进程内插件在役运行（V7；dsh-better-sidebar 先例）。

## 证据实录（持续追加；V 系列为评审人独立实测，详见评审报告 §一）

| # | 实验/事实 | 结果 | 时间 |
| --- | --- | --- | --- |
| E1 | `pip install --target vendor paramiko` | **死亡探针销号**：触发 cryptography 的 maturin/cffi 源码构建链（无预编译 wheel，本机无 Rust/C 工具链），超 15 分钟时间盒无果强制终止——paramiko 判死；即便编出亦撞 musl-LDSO 拒载 | 10-28 夜 |
| E2' | Go 工具链上机（go1.27.3 官方 linux-arm64，67MB 下载/解压成功） | **execve EACCES（内核拒）**。法医三连：busybox（musl 动态）任意副本可执行（含 cat 纯内容复制）；go（静态）被拒；两者 SELinux 标签相同（u:object_r:appdat:s0）⇒ 执行策略为**内容级校验**（与路径、标签、xattr、动态/静态无关的对照在案；机制定名——疑 OH 代码签名/hmmac——归 docs/03 待办 #6） | 10-28 深夜 |
| E3 | frp frpc（静态 Go 预编译件）执行试验 | **受阻收案**：GitHub 资产域本机不可达，不走第三方镜像（供应链红线）；鉴于 E2' 已判定内容级校验，不构成独立信息 | 10-28 深夜 |
| E4 | DSH 插件安装通道（ohos-plugin-install 权威口径，**非实验**） | `pnpm add` 假壳→宿主安装器（npmmirror，递归≤3）；纯 JS 可装；`.node` 受 ELF 签名管辖 dlopen 拒载（与 E2' 互证）；安装后需**重启 DSHM 挂载** | 10-29 凌晨 |
| E4b | 在役插件能力先例（实读 dsh-better-sidebar@0.28.2 宿主入口） | **插件内使用 WebSocketServer（ws 包）与 node:child_process（spawn/execFile）**——插件开网络端口、起子进程均为在役事实，非空想；peerDeps 指向 @deepseek-ai/dsh-host-webserver（宿主 HTTP 路由的正规挂点） | 10-29 凌晨 |

## 候选对比（r2 修订：C 判死补据 V5）

| 候选 | 可行性判断 | 依据 | 成本 | 裁决 |
| --- | --- | --- | --- | --- |
| **A'. DSH 插件形态 node 引擎（ssh2 纯 JS）** | ◎ Phase 1 主候选（**转正门槛 = E5 全绿 + Damon 拍板**） | 宿主 node 在役（V7）；ssh2@1.17.0 硬依赖 asn1/bcrypt-pbkdf 纯 JS、nan/cpu-features 全 optional（V3）；ws 零依赖（V4）；插件开端口/起进程先例（E4b） | 引擎升级=重启 DSHM；绑 DSH 生态（见「与 ADR-0002 的关系」） | **E5 冲刺** |
| A. Go 静态引擎 | ⬇️ 降为 Phase 2 候选 | E2'：第三方未签名 ELF 不可执行；唯一存活形态=**打进已签名 HAP 随包分发** | 需 HAP 构建/签名通道先通（docs/03 #6/#8） | Phase 2 |
| B. paramiko | ✕ 判死 | E1 + musl-LDSO 拒载 | 已销号 | 死 |
| C. asyncssh | ✕ **同源判死**（r2 修正：原"△存疑"失真） | **V5：asyncssh@2.24.1 requires_dist 首条 `cryptography>=48.0.1` 为硬依赖**（非 extra）——与 B 同一死因，证据闭合 | 已销号 | 死 |
| D. 纯 Python 手写 SSH | ✕ 否决 | 自写加密栈不可接受（安全红线） | — | 否决 |

排除链闭合：B/C（crypto C 扩展）、D（红线）、A（E2'）均出清 ⇒ Phase 1 内唯一具备完整 SSH 语义的可用栈 = A'。

## 与 ADR-0002 的关系（销阻塞-3）

1. **证据基变化声明**：ADR-0002 矩阵以「演进性 ✕ 绑死 DSH 生态」否决 R2，其成立前提是"存在独立部署形态可选"（当时 Go/静态 ELF 被认为可行）。**E2' 证伪该前提**（第三方 ELF 不可执行 ⇒ Phase 1 本无独立形态可选）⇒ R2 的**引擎形态**部分有条件复权（产品形态仍以 Phase 2 HAP 为独立路线）。ADR-0002 维持已接受状态不改矩阵，本节为其证据基增补记录。
2. **显式取代条款**：ADR-0002 Phase 2 候选 b 原文「HAP 壳+随包 Go 静态引擎……与 Phase 1 引擎同体，当前最优先」中"与 Phase 1 同体"作废——Phase 1 引擎已换 A'（node），与 Phase 2 Go 引擎**不同体**；候选 b 改为独立候选，优先级待 Damon 拍板后重排。
3. **A' 弃件成本（如实披露）**：A' 的 ssh2/node 栈在 Phase 2 a（CPython 随包）/b（Go ELF）/c（ArkTS 重写）任何一路均**不可复用**；A' 转正即接受"Phase 2 换栈时 SSH 层重写一次"的弃件成本。前端（xterm/Web UI）与协议层（Channel 抽象、docs/04）可跨栈复用，弃件限于引擎内 SSH 实现。
4. **Go 双向判据**：复活判据=HAP 签名通道打通且 E5 系列未全绿（A' 阻塞）；最终出局判据=Phase 2 a/c 落地且性能达标（无 Go 必要）。期间所有服务器侧交叉编译投入冻结（省 ROI）。
5. **Damon 拍板留痕**：路线甲（A'：最快拿到 P0 SSH，加深 DSH 绑定，Phase 2 承担弃件）vs 路线乙（评审报告 §四蓝军替代：Phase 1 先做非 SSH 的 P0/P1+SSH 顺延 Phase 2 上 Go，保独立性但 P0 主链路晚数周、项目空转风险）。**拍板结果：甲（DSH 插件引擎）——Damon 于 2026-10-29 00:48 经 Lead 呈报后选定**。转正门槛余项 = E5a–f 全绿。

## E5 探针系列（A' 转正门槛；每步带时间盒与降级口径）

| # | 探针 | 验收 | 时间盒 | 失败降级 |
| --- | --- | --- | --- | --- |
| E5a | hello 插件走安装队列（npm/github spec）→重启 DSHM→挂载在案 | pluginInventory 可见+激活日志 | 1 夜 | 通道考古（installer 源码/本地 spec 支持） |
| E5b | 插件内开 127.0.0.1:8978 HTTP + WS upgrade，外部 curl 200 | curl 命中插件路由 | 1 夜 | A' 降级，触发 Damon 重议甲/乙 |
| E5c | 插件内 require ssh2+ws 成功（纯 JS 装载） | 模块解析无错 | 1 夜 | 排查 optional 原生件是否被误装 |
| E5d | SSH 实弹：连 193:22013 执行 `whoami && uname -a`（冒烟口径同 engine/smoke_ssh.py） | SMOKE_OK 等价输出 | 1 夜 | 网络层排查→重议 |
| E5e | WS 终端回显通道 + xterm.js attach（P0 终端链路纵向打通） | 浏览器按键→远端回显 | 2 夜 | — |
| E5f | 性能预算实测（建议-4：JS 栈不豁免）：SFTP ≥5MB/s（dd 100MB）、回显 P95≤80ms、4 路并发不劣化 | 三项全绿 | 2 夜 | 达不到→列优化项重测一轮，仍败则 A' 标注性能风险转 Damon |

**执行进度（2026-10-29 凌晨）**：
- E5a 安装段 ✅（`pnpm add github:damon-snc/znCRT#main` 两轮成功：0.1.0-e5a → 0.2.0-e5bcd；profile deps 登记 `zncrt`；本地路径 spec 实测被拒，失败信息反哺支持格式 `github:owner/repo#分支&path:/子目录`）；**挂载验证待 DSHM 重启**。
- E5c 前置 ✅：ssh2@^1.17 + ws@^8.18 随插件安装落位 `profiles/ondevice/node_modules/`（optional 原生件未拖垮安装，fail-soft 符合预期）。
- E5b/c/d 探针已合并进 v0.2.0-e5bcd（一次重启验证三步：/api/hello、/api/modules、POST /api/ssh）。

**转正条件**：E5a–f 全绿 + Damon 拍板（路线甲）⇒ ADR-0003 转「已接受」，A' 定案并启动工程实现；E5 任一步失败按降级口径如实重议。

## 分发形态（r2 修正：删除 E2' 前的"本机 execve 直接跑"旧文）

- **A'**：以 DSH 插件包分发（npm registry 或 GitHub 仓库 spec，经宿主安装器）；升级 = 安装+重启 DSHM（运维代价已同步 ADR-0002 生命周期表）。
- **A（Go）**：仅随 znCRT 的已签名 HAP 打包（Phase 2），本机不再尝试 execve 独立分发。
