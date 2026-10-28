# 本机（HarmonyOS PC）工具链盘点 · 2026-10-28 22:00 实测

| 能力 | 实测结果 | 影响 | 对策 |
| --- | --- | --- | --- |
| git | ✅ 2.47.3（全局身份未配置） | 可建仓 | 仓库级配置 znCRT-lead 身份 |
| python3 | ✅ 3.12.14（宿主原生垫片） | 可做脚本/解析 | 优先用 Agent `python` 工具 |
| node | ❌ node-cli 缺 `libc++_shared.so` | Web/Nuxt 路线受阻 | 定位库文件→修 LD_LIBRARY_PATH；或服务器构建 |
| pnpm | ⚠️ dshm install-queue 假壳（10.0.0） | 不能真装依赖 | 依赖安装走服务器/后续打通 |
| gh | ❌ 未安装 | GitHub 建仓/推送无凭证 | 等 Damon 提供 PAT 或手动建仓 |
| hdc | ❌ 未安装 | 无法往本机装 HAP | 攻关：定位系统 hdc（开发者模式）或替代安装通道 |
| hvigorw / DevEco | ❌ 未见 | 无法本机构建 ArkTS 工程 | 备选：ZnAiAgent Linux 服务器装 ohos-sdk/hvigor 构建 |
| 公网 | ✅ github.com / api.github.com / registry.npmjs.org 可达（curl 实测） | 可拉代码/依赖元数据 | — |
| web_search | ❌ 缺 DEEPSEEK_API_KEY | 检索受限 | 用 GitHub API/curl 直连；或 Damon 在 Web 端补 key |
| 浏览器桥 | ❌ 无扩展连接 | 不能代操作网页 | 需要 DSHM Browser Bridge 接入 |
| hexhub.cn | ⚠️ TLS 证书过期 | 官网取证受阻 | `curl -k` 或 web.archive.org 快照 |

## Day 1 修订（2026-10-28 夜战实测）

| 能力 | 修订 | 证据 |
| --- | --- | --- |
| node | ⚠️ 复杂：二进制可出版本号（/data/service/hnp/bin/node v24.13.0），但**从 bash 子进程执行代码必崩**（V8 `Check failed: 12 == (*__errno_location())`，-e/文件/LD_LIBRARY_PATH 均救不了）；DSHM 宿主内 node 及其 MCP 子进程正常 | Day 1 三连探针 |
| python3 | ⬆️ **升级为可用运行时：可绑定端口监听**（http.server 127.0.0.1 → curl 200）；socket/stdlib 完整 | Day 1 探针 |
| busybox | ✅ httpd/tcpsvd/ftpd/wget applet 在列（静态服务备胎） | `busybox --list` |
| localhost 语义 | ✅ 应用沙箱 localhost = 设备 localhost（DSHM GUI 127.0.0.1:3120 浏览器可达） | 运行时事实 |
| hexhub.cn | ✅ 可 `curl -k` 取证（TLS 证书仍过期）；新版为 Vite SPA+PWA，rpc bundle 含 bytebuffer/long 二进制协议 | Day 1 取证 |

## 待办攻关（按优先级）

1. **部署通道三选一**：本机 hdc / 系统应用安装器 / 服务器构建+签名+安装 —— DSH 自身就是 HAP（先例），翻 `2026-10-23-DSH迁移鸿蒙PC-调研与迁移方案.md` 与运维文档找安装通路。
2. node 修复：`find` 定位 libc++_shared.so → LD_LIBRARY_PATH 试验。
3. GitHub 通道：PAT（fine-grained, repo create + contents write）。
4. hexhub 发布件获取与逆向（REA）：确认桌面壳与 SSH 引擎形态。
5. **开机自启攻关**（关联 ADR-0002 §部署生命周期）：三候选——鸿蒙应用模型自启语义考古 / 融合开发引擎 Linux 侧 systemd / Phase 2 HAP 形态解决；未攻克前 Phase 1 不宣称"安装验收达成"。
6. **第三方 ELF 执行策略攻坚**（E2' 发现）：内容级校验（疑 OH 代码签名/hmmac）拒新 ELF——需考古 HAP 内嵌二进制如何获得执行权（DSHM 的 files/bin 是先例），直接影响 ADR-0003 主候选存活。
