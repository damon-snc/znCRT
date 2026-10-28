# ADR-0002 评审报告（变更类交付门禁）

- 评审对象：`znCRT/docs/adr/ADR-0002-技术路线与部署形态.md`（草案）
- 评审人：codex-arch（架构评审门禁，DSH 原生子代理顶岗）
- 评审时间：2026-10-28 夜战首项（Day 1，与草案落盘同夜）
- 门禁结论：**有条件通过**——方向正确、事实基本扎实，但 3 条 [阻塞] 未清前不得将状态从"草案"改为"已接受"，不得据此启动 Phase 1 全量开发（P0 SSH 链路设计可并行推进，因其属 ADR-0003 范畴）。

---

## 一、评审输入与方法

### 输入文件（逐字读完）

| 文件 | 用途 |
| --- | --- |
| docs/adr/ADR-0002-技术路线与部署形态.md | 评审对象 |
| docs/00-charter.md | 验收口径 |
| docs/01-hexhub-baseline.md | 对标基线 |
| docs/03-toolchain-audit.md | 工具链实测 |
| journal/2026-10-28.md | 决策脉络 |

交叉核对：docs/adr/ADR-0001（待决议题 A/B/C 的出处）、docs/02-diff-matrix.md（P0/P1 分布）、engine/server.py、web/index.html、LICENSE、git log。

### 评审人独立实测（2026-10-28 夜，评审进行时）

| # | 探针 | 结果 |
| --- | --- | --- |
| P1 | `curl http://127.0.0.1:8977/api/status` | 200，`version 0.1.0-day1`，**uptime_sec=252.1**——引擎活着，但它是几分钟前才（重）启的进程 |
| P2 | `ps -ef` | `python3.12 engine/server.py 8977`（PID 35818）为**真实原生进程**，挂在 DSHM 终端服务同源进程树（父 3962）下；同树另有一场 `pip install --target vendor paramiko` 正在运行 |
| P3 | 该 pip 子进程实况 | 正在为 **cryptography 拉取 maturin≥1.14.1 + cffi 源码构建依赖**（`--no-binary :none: --only-binary :none:`，即走 sdist 源码构建链）——paramiko 的 C 扩展硬依赖当场现形 |
| P4 | `head znCRT/LICENSE` | GPL-3.0 ✅（与章程/ADR-0001 一致） |
| P5 | `$HOME/hexhub-rpc.js`/`hexhub-index.js` | 在位（152KB/286KB，2026-10-28 23:20），journal 证据可复核 |
| P6 | `busybox --list` | httpd/tcpsvd/wget 在列 ✅（事实 5 复核通过） |
| P7 | `git -C znCRT log` | 3 次提交与 journal/矩阵叙述一致；工作区有未提交文件 `engine/smoke_ssh.py` |

### 本机运行时权威口径（宿主技能文档，评审依据）

DSHM 内嵌 Python 的边界：**pip3 只能装纯 Python 包；site-packages 的 C 扩展 .so 被 musl-LDSO namespace 检查拒绝加载**；桥模式同步阻塞宿主（120–300s SIGALRM 超时）；PC/2in1 档可 execve 随包 ELF（P2 证实引擎即此形态）。

---

## 二、门禁结论与意见明细

### [阻塞-1] 备选未公平列举：缺 A/B/C 对比矩阵，否决理由不可追溯

- **位置**：ADR-0002 §决策/§备选（仅 R2 一条，一句话否决）。
- **依据**：ADR-0001 §待决明示三选一："A) ArkTS 原生 B) WebView 混合 C) 两步走"；ADR-0002 只给了 C 的理由，A-first（服务器 hvigor 直上原生）与 B-first（即刻建 HAP+WebView 壳）**无对比矩阵、无逐项否决理由**——它们被隐含否决了，但读者只能自行脑补"因为本机无 hdc/hvigor、node 损坏"。这违反 arch-design 技能对 ADR 的硬标准（≥2 候选 × 实现成本/运行风险/演进性/运维成本/回退难度 + 否决项及原因）。决策方向我认可，但作为将指导整个项目的首份技术路线 ADR，可追溯性不可省。
- **可执行改法**：在 §决策 前补一张对比矩阵，行=A-first / B-first / 两步走（采纳）/ R2 DSH 插件，列=实现成本、运行风险、演进性、运维成本、回退难度，每格引用事实编号（1–8）；矩阵后补两段各 ≤5 行的 A-first、B-first 否决理由（A-first：事实 8 构建安装通路未考古，且原生 UI 生态学习曲线叠加工程风险，冷启动过慢；B-first：壳先行但引擎仍是同一难题，且 HAP 通道未通时壳无从验证）。R2 的否决理由补一句披露：Phase 1 引擎进程实际挂在 DSHM 进程树下（见实测 P2），"非 DSH 生态"的优势要到自启/分发打通那天才成立。

### [阻塞-2] Python 长驻引擎的生命周期/开机自启完全未定义，"部署第一实证"实为"演示实证"

- **位置**：ADR-0002 §决策 Phase 1 交付形态（"部署在本电脑"的第一实证）；§风险与边界（只字未提生命周期）。
- **依据**（三重实测）：① 实测 P1：引擎 uptime 252s——Day 1 夜战点火的进程并不会自己活着，当前实例是刚重启的；② 实测 P2：引擎是 DSHM 终端树下的原生进程，DSHM 宿主/终端会话消亡或设备重启后**无人负责把它拉起**；本机无 systemd/launchd 语义，鸿蒙应用模型对任意 ELF 无用户级自启通道。③ 章程验收 #2 要求"安装并运行"：**"安装"目前无任何定义**（无安装器、无桌面图标、无自启、无重启存活），浏览器收藏一个 127.0.0.1:8977 不构成安装。charter 的验收词是"部署"，ADR 用一个手启进程宣称"部署实证"，口径偷换。
- **可执行改法**：ADR-0002 新增 §部署生命周期（Phase 1 版），至少回答四问并给出可验证定义：① 启动：谁、以何命令/脚本拉起引擎（给出 start/stop/status 三脚本或明确"由 DSH 终端人肉启动"并如实标注这是临时形态）；② 存活边界：声明引擎对 DSHM 宿主进程树的依赖（实测 P2），及设备重启后的恢复步骤；③ "安装"的 Phase 1 可验收定义（例如：一键启动脚本 + PWA 可安装性实测〔本机浏览器对 standalone manifest 的安装支持未测，列为探针项〕+ 核心链路四证据）；④ 端口注册表（3120=DSHM、8977=znCRT、8979=探针，防冲突）。开机自启要么列为正式攻关任务（进 docs/03 待办），要么明确划给 Phase 2 HAP 形态解决——二选一，写下来。

### [阻塞-3] SSH 栈风险表述与已知事实不符："pip 可用性未测"低估了 paramiko 路线的死亡率

- **位置**：ADR-0002 §风险与边界第一条："本机 pip 可用性未测（ADR-0003 首项）"；§决策 Phase 1："候选：pip/paramiko；Go；Rust"（paramiko 排首位）。
- **依据**：pip 本体可用性根本不是主要风险——宿主运行时文档明确：**C 扩展 .so 被 musl-LDSO namespace 拒载，pip 只能装纯 Python 包**；而 paramiko 的硬依赖 cryptography 必带 C/Rust 扩展。评审进行时的实时证据（实测 P3）：`pip install paramiko` 正在本机触发 cryptography 的 **maturin/cffi 源码构建链**——这是"无预编译 wheel、试图现场编译 Rust/C"的典型形态，本机既无 Rust 工具链，即便编出也会撞 LDSO 边界。结论：paramiko 路线不是"未测"，是**已知大概率死**；ADR-0003 若仍按"pip 探测 → paramiko"排序，会烧掉整夜工程时间。
- **可执行改法**：① 风险条目改写为："宿主 Python 仅纯 Python 包可用（C 扩展拒载）；paramiko 硬依赖 cryptography（C/Rust 扩展）⇒ 大概率不可行，实测证据见评审 P3；asyncssh 对 cryptography 的依赖版本相关，需单独探针"。② ADR-0003 候选重排：**Go 静态二进制交叉编译升为主候选**（PC 档可 execve 随包 ELF——busybox、DSHM 自身皆先例；需在 ADR-0003 验证下载通道与随包分发形态），paramiko 降为"先跑一条 15 分钟死亡探针再谈"。③ 若 pip install paramiko 此刻仍在跑，让它结束并记录退出码，作为 ADR-0003 首条证据，别浪费这次实测。④ `engine/vendor/` 加入 .gitignore（C 扩展 vendor 树不可入库）。

### [建议-1] GPL 合规：把"两个 hexhub"分开，把 REA 产物挡在库外

- **位置**：§风险与边界"前端 GPL 同协议参考"。
- **依据**：hexhub 有两个不同实体：GitHub 旧仓库（GPL-3.0，2023 停更）与 hexhub.cn 新版闭源发布件（license 未知）。现行表述"前端 GPL 同协议参考"未区分，容易被读成"hexhub.cn 的新版前端 bundle 也是 GPL 可参考"——从闭源发布件拷任何代码（哪怕改写自其 minified JS）是侵权风险，与 GPL 无关。另：$HOME/hexhub-rpc.js（152KB）等 REA 取证件已存在（实测 P5），需防其流入 git。
- **可执行改法**：风险条目改写为三句：① hexhub GitHub 仓库（GPL-3.0）代码可参考/移植，znCRT 同协议且保留原版权声明；② hexhub.cn 发布件（含新版前端 bundle）仅限行为/协议分析，零拷贝，其反编译产物与原始取证 JS **永不入 znCRT 仓库**（.gitignore 显式列 hexhub-*）；③ vendored 第三方件（xterm.js MIT 等）随附 LICENSE 文件与来源清单（docs/NOTICE.md）。

### [建议-2] Phase 1 缺 WebSocket 通道方案，终端链路有暗坑

- **位置**：§决策 Phase 1"python3 stdlib 起步"。
- **依据**：stdlib **没有 WebSocket**；xterm.js 的终端交互需要低延迟双向通道（hexhub 走 bytebuffer/long 二进制 RPC，必有长连接）。ThreadingHTTPServer 起步容易，但 P0"终端交互"在 stdlib 内需手写 RFC6455（可行，约 200 行）或退化到 SSE+POST 轮询（延迟/复杂度双输）。ADR 把它完全留给读者想象。
- **可执行改法**：在 Phase 1 要点中加一行："通信通道：stdlib 手写 RFC6455 WebSocket（引擎侧）+ xterm.js attach；若 ADR-0003 改选 Go 引擎则用现成 ws 库"。或把通道选型并入 ADR-0003 一并裁决。

### [建议-3] 性能零预算："一模一样"没有量化口径

- **位置**：全文（无任何性能指标）。
- **依据**：章程验收 #1"功能基线逐项对齐"但无性能维度；hexhub 的"仿 Xshell 体验"本质是延迟指标。本机已知性能负项：jitless ARM 上 Python 冷 import 明显偏慢（宿主文档口径）；纯 Python SSH 的 SFTP 吞吐通常个位数 MB/s；ThreadingHTTPServer 线程/连接模型在多会话并开（矩阵 #14）下的开销未评估。
- **可执行改法**：在 §风险与边界 或差异矩阵加三条 P0/P1 性能验收线并给出实测方法：终端按键回显延迟（如 P95 ≤ 80ms，本地局域网主机）、SFTP 单流吞吐下限（如 ≥5 MB/s，dd 100MB 实测）、并发会话 ≥4 路不劣化。首版指标可宽松，但必须有数，否则"对齐"不可判。

### [建议-4] 证据链：MIGRATION-APPLIED 引用在仓库内不可达

- **位置**：事实表 #4、#7 引"MIGRATION-APPLIED §5.1"。
- **依据**：评审人以 glob 全 workspace 检索，该文档不在 znCRT 仓库，路径亦未给出——从仓库视角这是悬空引用，未来无法复核"node 崩溃/HAP 内嵌先例"两个最关键事实。
- **可执行改法**：二选一：把 §5.1 与"HAP 内嵌引擎"关键结论摘录为 `docs/99-evidence-excerpts.md`（注明出处与日期）；或在 ADR 内给出该文档的稳定绝对路径 + 一句话结论摘录。

### [建议-5] 工作区卫生

- **依据**：实测 P7——`engine/smoke_ssh.py` 未提交；`engine/vendor/` 即将因 pip 产生。章程纪律"每夜必有 commit"的可信度依赖工作区诚实。
- **可执行改法**：smoke_ssh.py 随 ADR-0003 结论一并提交（脚本质量好，见肯定-4）；.gitignore 补 `engine/vendor/` 与 `hexhub-*`。

---

## 三、肯定项

1. **事实表真实可复核**：8 条事实我逐条独立验证（P1/P2/P4/P5/P6 + 工具链盘点交叉），未发现虚报；"先证据后结论"的纪律在这份 ADR 里是真成立的。
2. **两步走与双目标匹配**：Phase 1 用"唯一今日可跑的运行时"换部署实证与差异矩阵推进，Phase 2 承载 ArkTS/鸿蒙架构师成长线——两条章程使命各有落点，且 Phase 2 不阻塞 Phase 1。
3. **诚实不虚报**：明写"浏览器直连不算原生鸿蒙应用；Phase 2 完成前不宣称最终验收达成"——这在"夜战快赢"氛围里是难得的自我约束。
4. **smoke_ssh.py 凭证全走环境变量、绝不硬编码入库**——安全卫生好起点。
5. **决策粒度切分正确**：SSH 栈这种高不确定选型切到 ADR-0003 单独裁决，不让 0002 过载。

---

## 四、蓝军自检：要推翻这个 ADR，最硬的一击

> **"Phase 2 不是换壳，是引擎重写——ADR 对此只用了半句话。"**
>
> ADR 的叙事是：Phase 2 到来时"以 HAP 壳替换浏览器入口；引擎届时视成熟度保留或重写"。但真到 HAP 形态：HAP 沙箱里谁来跑 python3 长驻引擎？要么把 libpython/CPython 随包打进 znCRT 自己的 HAP 并解决 exec/加载链（DSHM 是先例，但那是别人整个工程量级的投入，正是它证明了这条路**不便宜**），要么 ArkTS 重写引擎（SSH/SFTP/DB 协议栈全量）。同时 Phase 1 的"独立应用"是名义上的——实测引擎就挂在 DSHM 进程树下，DSHM 死则 znCRT 死，与被否决的 R2（"绑死 DSH 生态"）只差五十步。因此可断言：**"两步走"真正的成本重心在 Phase 2 的引擎存续问题，而 ADR 把它藏进了一个从句**。若 Damon 的验收想象是"双击图标的独立应用"，这份 ADR 的 Phase 1 工作量对验收 #2 的贡献趋近于零，路线本身就要重排。
>
> **为什么仍不推翻**：这一击不改变"Phase 1 是当下唯一可运行起点"的事实，且 Phase 2 议题本就规划为逐夜推进；但 [阻塞-2] 与本节共同构成防线——把"引擎在 HAP 中如何活着"从半句话升格为 Phase 2 的正式攻关项（与部署通道三选一并列），ADR 才立得住。

---

## 五、复审闭环

- 销项标准：3 条 [阻塞] 按可执行改法修订 ADR-0002（纯文档改动，预计 ≤1 夜），diff 回报 codex-arch 逐条复核；[建议] 1/4 建议随本次修订一并做，2/3/5 可随 ADR-0003 与后续夜战处理，Lead 裁量。
- 复核通过后，ADR-0002 状态由"草案"改"已接受"，Phase 1 方可宣称路线定案。

— codex-arch，2026-10-28 夜战
