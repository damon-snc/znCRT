# hexhub 协议逆向笔记（REA 第二层）

> 取证件：`$HOME/hexhub-rpc.js`（152KB）、`$HOME/hexhub-index.js`（286KB）——**永不入库**（.gitignore 已拦截 hexhub-*）。
> 方法：bundle 静态分析（grep 字符串/protobuf.js 静态模块特征/点分大驼峰消息名）。零拷贝、零反编译重分发。

## 事实（2026-10-28/29 夜实测）

### 传输与编码

| 项 | 结论 | 证据 |
| --- | --- | --- |
| RPC 编码 | **Protocol Buffers**（protobuf.js 静态模块：encode×18 / decode×23 / fromObject×14 / toObject×24；proto2/proto3 语法标记在包内） | rpc bundle 特征计数 |
| 二进制基础库 | bytebuffer.js + long.js（protobuf.js 依赖） | bundle 内 github 源链接字符串 |
| 传输层 | **WebSocket + 二进制帧**（binaryType、onmessage×6） | rpc bundle |
| 端点构造 | **未发现硬编码 ws:// 端点**——运行时由配置/环境注入（桌面 daemon 与云形态共用一套前端） | 两 bundle 均无 ws 字面量 |

### 协议语义（出土部分）

| 消息/方法 | 推断语义 |
| --- | --- |
| `Channel.ChannelMethodOpen` | 打开通道（SSH 会话/SFTP/端口转发统一抽象） |
| `Channel.ChannelMethodClose` | 关闭通道 |
| `Channel.ChannelMethodSend` | 通道内双向数据帧（终端字节流载体） |
| `Channel.CloseFailure` | 关闭失败错误类型 |

⇒ hexhub 把 SSH/SFTP/转发统一抽象为 **Channel 服务**（open/close/send 三原语）——与 SSH 协议自身的 channel 模型同构。znCRT 引擎 API 可直接继承此抽象（面向通道而非面向功能）。

### 应用壳（index bundle，286KB）

- 云账号体系：`Authorization` 头 + `UnAuth` / `RequireTwoFactorAuth` / `RequireEmailAuth` 状态机 ⇒ 新版 hexhub 有**云端账号/2FA**（znCRT 开源版不跟随此设计，本地优先）。
- 无 protobuf、无 WS 构造 ⇒ RPC 全部隔离在 rpc bundle，前端按需加载。

## 对 znCRT 的设计输入（供 ADR-0004 引擎 API）

1. **Channel 三原语**（open/close/send + 每通道 id 多路复用）作为引擎 RPC 核心抽象。
2. 传输：WebSocket 二进制帧（与 hexhub 同构）；编码**首版用 JSON 行协议**（可调试、xterm 前端零依赖），性能预算不达标再上 protobuf——口径：对齐用户体验，不对齐线缆格式。
3. 终端：xterm.js attach 到 Channel 的 send/onmessage 流（hexhub 同款血统）。
4. 账号体系不克隆：开源本地优先（历史连接存 Dexie/IndexedDB + crypto 加密，对标其本地存储形态）。

## 待挖（Day 3+）

- Channel 之外的消息族（SFTP 文件操作、DB 查询流）——可能在按需加载的子 bundle（需枚举 /assets/ 清单或跑起来抓流量）。
- 桌面 daemon 的端口/发现机制（hexhub.cn 首页 manifest 与 JS 均未露）。
