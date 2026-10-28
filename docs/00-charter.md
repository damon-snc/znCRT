# znCRT 章程（Charter）v1.0

> 立项：2026-10-28，Damon 指令，啾啾（Lead）牵头。

## 使命

1. 交付开源工程 **znCRT**：运行在 HarmonyOS PC 上的 SSH / SFTP / 数据库管理客户端，对标 [hexhub](https://github.com/EdikKing/hexhub)。
2. 以战养战：在造产品的过程中，成长为**精通开源工程与鸿蒙应用开发的架构师**。

## 验收口径（"一模一样"的可验证定义）

1. **功能基线逐项对齐**：`01-hexhub-baseline.md` 全部条目在 `02-diff-matrix.md` 中达到对齐（✅），P0/P1 项全绿为硬验收。
2. **本机部署**：znCRT 在本 HarmonyOS PC 上安装并运行，核心链路实测可用（SSH 连接、终端交互、SFTP 传输、DB 管理各留运行证据）。
3. **开源**：GitHub 仓库 znCRT，GPL-3.0，演进有据可查（每夜 commit + journal，禁止空口完成）。

## 作战节奏

- 每晚 **23:30** 启动夜间会话（提醒驱动），流程固定：读矩阵 → 选 1-3 个差异点 → 开发+验证 → commit → 更新矩阵与 journal → 汇报。
- 学习与工程双轮：每夜至少一个架构/技术主题（ArkTS、ArkUI、OpenHarmony 应用模型、签名分发、libssh/协议、性能），主题随开发任务牵引。

## 分工

| 角色 | 职责 |
| --- | --- |
| 啾啾（Lead） | 牵头、拆解、验收、唯一对外 |
| codex-arch | 架构决策评审门禁（ADR、方案对比） |
| claude-dev | 功能交付（页面、脚本、文档） |

## 纪律与红线

- 证据化交付：任何"完成"必须附实测证据（构建输出 / 运行结果 / 测试）。
- 逆向（REA）仅用于行为与协议分析，不拷贝闭源二进制中的代码、资源。
- hexhub 为 GPL-3.0：znCRT 全程 GPL-3.0，参考/移植其开源代码时遵守同协议。

## 已识别风险（Day 0）

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 本机无 hdc / hvigor / DevEco | HAP 构建、安装通道未打通 | 工具链攻关列为正式任务；备选服务器构建 |
| 本机 node 运行时缺 libc++_shared.so | Web 技术栈路线受阻 | 定位库文件、修复加载路径 |
| hexhub 开源仓库仅 UI 层，SSH 引擎闭源 | 行为基线不全 | REA 补全行为基线（hexhub.cn 发布件） |
| web_search 通道缺 API key、浏览器桥未连接 | 公网检索受限 | 用 GitHub API / curl 直连替代 |
