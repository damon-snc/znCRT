# hexhub 功能基线

> v2（2026-10-29 凌晨升版）：新增「新版发布件连接类型全景」——Day 0 版以老仓库 README 为源，低估了新版能力面。
> 来源：① 老仓库 README 解码（Day 0）；② hexhub.cn 发布件 bundle REA（Day 2 凌晨，见 docs/04）。

## 新版（hexhub.cn 发布件）连接类型全景（REA 实测枚举）

**协议/连接类**：SSH、SSHPasswordPair、SSHPrivateKey、SSHTunnel（跳板机：jumpServer.password/privateKey 双字段模型）、Telnet、Serial（串口）、RDP、VNC、Shell、FTP、HTTP(S)、Cmd/CmdSudo/QuickCmd/QuickCmdGroup、Docker、DockerRegistry、RepositorySource、**LLMProviderConfig**（AI 提供方配置为一等连接类型）、Hotkey、Setting、DBQuery、Dir。

**数据库引擎（18+，国产库全覆盖）**：MySQL、PostgreSQL、Redis、MongoDB、SqlServer、Oracle、Sqlite、ClickHouse、MariaDB、TiDB、KingbaseES（人大金仓）、OpenGauss、Doris、OceanBase、PolarDB、Dameng（达梦）、DUCKDB、Http(数据源)。

**凭据安全模型**（bundle 实测）：存储时字段级加密 `encryptFields(["password","privateKey","jumpServer.password","jumpServer.privateKey"])`，读取时解密——znCRT 对齐口径：本地凭据必须加密落盘（WebCrypto/crypto-js 等效）。

**排序组**（Object.freeze 显示顺序）：[5,11]、[0,2,16,17,18,3,7,4,13,12,15,20]——连接列表的分组显示顺序。

## SSH 管理器（老仓库 README 基线，15 项） v0（对标基准）

> 来源：EdikKing/hexhub master 分支 README（base64 blob 解码，2026-10-28 实测取证）+ 仓库结构实测。
> 待补项标 ⏳：官网 hexhub.cn（当前 TLS 证书过期，需 `curl -k` 或快照）、发布件逆向、Redis/PG/Mongo 细节。

## 产品定位

桌面端 SSH、SFTP、数据库管理软件，中文界面；数据库管理模块支持 MySQL 和 PostgreSQL（开发中）。

## SSH 管理器（README 标注 15/15 已完成）

| # | 功能 |
| --- | --- |
| 1 | SSH 连接 |
| 2 | SFTP 文件传输 / 管理（Windows） |
| 3 | SFTP 挂载盘符（Windows） |
| 4 | SCP 下载目录和文件（Windows） |
| 5 | 基于跳板机连接 |
| 6 | TCP / Socks5 代理 |
| 7 | ZMODEM（SZ/RZ） |
| 8 | 串口连接 |
| 9 | 动态字体 |
| 10 | 仿 Xshell 终端体验 |
| 11 | 记录历史连接 |
| 12 | Docker 容器管理 |
| 13 | 端口转发 / 端口反射 |
| 14 | 多种布局并排显示 |
| 15 | 关键词高亮 |

## MySQL 管理器（重构中）

- [x] 格式化 SQL
- [x] SQL 语法高亮
- [x] 数据库表 / 数据结构查看
- [x] 代码片段 / 模板
- [x] 数据库创建 / 删除
- [x] 数据表创建 / 删除 / 设计
- [x] 表数据增删改查
- [ ] DDL 语句生成
- [ ] 表数据导出

## Redis / PostgreSQL / MongoDB 管理器

README 标注"重构中"，功能细节 ⏳ 待补（官网 / 发布件逆向）。

## 技术栈（仓库实测，2026-10-28）

- Nuxt **3.2.3**（SSR/SPA）+ Vue 3.2.47 + **Vuetify 3.3.2** + Pinia（persistedstate）
- 终端：**xterm 5.2.1**（addon-canvas / fit / search / web-links）——仿 Xshell 体验的载体
- 本地存储：**Dexie**（IndexedDB）+ crypto-js（凭据加密）
- 编辑器：CodeMirror 6（vue-codemirror，thirdparty 定制构建，lang-sql 等）
- i18n：vue-i18n 9.2.2（中英）；构建：vite 4.1.1 / vitest / sass

## 关键仓库事实

- License：**GPL-3.0**（作者声明"仅供学习"）；530 stars / 94 forks
- master 最后 push **2023-07-03**（仓库已停更，但 stars 仍在涨——产品仍在 hexhub.cn 分发）
- 依赖清单中**未见 ssh2 / node-pty 等连接层依赖** ⇒ 开源仓库主要是 **UI 层**，SSH/SFTP 引擎在闭源发布件中 ⇒ **逆向（REA）对象 = hexhub.cn 的发布件**
- 官网 hexhub.cn（TLS 证书过期，2026-10-28 实测）；作者邮箱 xiweihei@gmail.com

## 待补基线任务（⏳）

1. hexhub.cn 页面取证（`curl -k` / web.archive.org 快照）：最新版本、支持平台、下载件
2. 发布件逆向：确认桌面壳（Electron/自研?）、SSH 引擎形态（内置库/子进程?）、配置与凭据存储格式
3. Redis / PostgreSQL / MongoDB 管理器功能细节
4. UI 布局与交互规格（页面截图 snapshots/ 目录已有 4 张参考图，可直取）
