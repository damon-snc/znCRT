# znCRT

> 对标 [Hexhub](https://github.com/EdikKing/hexhub) 的开源鸿蒙（HarmonyOS / OpenHarmony PC）SSH / SFTP / 数据库管理客户端。
> 终端血统（CRT），鸿蒙原生——znCRT。

## 目标

- 在本 HarmonyOS PC 上部署运行 znCRT，与 hexhub 功能基线**逐项对齐**（验收口径见 [docs/00-charter.md](docs/00-charter.md)）
- 以战养战：在造这个产品的过程中，成长为精通开源工程与鸿蒙应用开发的架构师

## 作战节奏

- 每晚 23:30 后学习 + 开发（提醒驱动，风雨无阻）
- 每日比对 hexhub 功能差异，更新 [docs/02-diff-matrix.md](docs/02-diff-matrix.md)
- 每夜必有可验证产出：变更 + commit + [journal](journal/) 日志

## 方法与红线

- 允许 REA（逆向）辅助分析 hexhub 行为与协议；hexhub 为 GPL-3.0，znCRT 同样采用 **GPL-3.0** 开源
- 逆向只用于行为分析，不拷贝闭源二进制中的代码与资源

## 文档地图

| 文档 | 用途 |
| --- | --- |
| [docs/00-charter.md](docs/00-charter.md) | 章程：验收口径、节奏、分工、风险 |
| [docs/01-hexhub-baseline.md](docs/01-hexhub-baseline.md) | hexhub 功能基线（对标基准） |
| [docs/02-diff-matrix.md](docs/02-diff-matrix.md) | 每日差异比对矩阵（作战看板） |
| [docs/03-toolchain-audit.md](docs/03-toolchain-audit.md) | 本机工具链盘点与打通计划 |
| [docs/adr/](docs/adr/) | 架构决策记录（ADR） |
| [journal/](journal/) | 每夜作战日志 |

## 状态

Day 0 立项（2026-10-28）。阵地已立，路线决策见 ADR-0002（技术路线：ArkTS 原生 / WebView 混合 / 构建流水线）。

## License

GPL-3.0（与对标项目 hexhub 同源对齐）
