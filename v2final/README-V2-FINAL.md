# 加密货币生态研究工具 V2 Final

这是基于 V2 Alpha 与 2.1–2.89 最终蓝图重构的单用户研究工作台。

## 核心原则
- Identity → Data Quality → Fact/Snapshot → Evidence → Research → Review → Learning
- Snapshot 只 CREATE/READ，不 UPDATE/DELETE
- Unknown、Missing、Error、Stale、Conflict 分开
- Fees ≠ Revenue；Unlock ≠ Sell Pressure；Stablecoin Supply Change ≠ Capital Inflow；Correlation ≠ Causation
- AI / Automation 默认 Proposal，不得越权修改 Identity、Risk、Conclusion、Causal Claim
- 浏览器不直接访问 D1；所有正式写入通过 API

## 部署
1. 创建 Cloudflare D1 数据库。
2. 执行 `schema.sql`。
3. 修改 `wrangler.toml` 中 `database_id`。
4. Pages Functions 部署 `functions/api/[[path]].js`。
5. 前端部署本目录。
6. 打开 System → Self Check。

## 数据源代理
`GET /api/proxy?url=` 仅允许 CoinGecko、DeFiLlama、Stablecoins、DexScreener 的 HTTPS API。

## 当前版本边界
这是一次性完成的 Final 工程骨架，已经把最终架构落到 D1 表、API 边界、Snapshot 不可变规则、Sync、Backup、Self Check 与平板 UI。具体第三方 Adapter 的每个指标解析器可以在后续接入真实数据源时独立增加，不应绕过 Identity/Data Quality。
