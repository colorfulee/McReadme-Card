---
name: mcd-readme-card
description: 生成"麦门名片"——把用户的麦当劳履历（职级、主力依赖、技术栈、贡献图、积分、进行中活动）渲染成可挂在 GitHub 主页的 SVG 卡片。当用户说"生成我的麦门名片 / 麦当劳 GitHub 卡片 / 把麦门履历挂到主页 / mcd readme card"时使用。需要已连接麦当劳 MCP（mcd-mcp）。
---

# 麦门名片 McReadme Card

把麦当劳 MCP 的只读数据变成一张有调性的 GitHub 主页 SVG 卡片。

## 前置条件

- 已连接麦当劳 MCP 连接器（`https://mcp.mcd.cn`，配置见仓库根目录 `mcp-config.example.json`）
- 本机有 Node.js ≥ 18，且已获取本仓库代码

## 工作流程

1. **采集数据（只读）**：依次调用以下 MCP 工具，参数均为空对象 `{}`：
   - `now-time-info`
   - `order-list`
   - `query-my-account`
   - `query-my-coupons`
   - `campaign-calendar`

   **禁止**调用任何写操作工具（`create-order`、`auto-bind-coupons`、`draw-lottery`、`mall-create-order` 等）。

2. **写入数据包**：把每个工具返回的原文（文本或 JSON 都可以）按工具名写入 `.local/bundle.json`：

   ```json
   {
     "now-time-info": "<工具返回原文>",
     "order-list": "<工具返回原文>",
     "query-my-account": "<工具返回原文>",
     "query-my-coupons": "<工具返回原文>",
     "campaign-calendar": "<工具返回原文>"
   }
   ```

   `.local/` 已在 `.gitignore` 中，数据包含个人信息，不要提交。

3. **询问主题与隐私偏好**：
   - 主题：`receipt`（热敏小票，默认）/ `neofetch`（终端）/ `native`（GitHub 原生风，跟随深浅色）
   - 是否公开积分和券数量（不公开就加 `--privacy strict`）

4. **渲染**：

   ```bash
   node src/cli.js --from .local/bundle.json --user <GitHub ID> --theme receipt,neofetch,native --out .local/mcd-card.svg
   ```

5. **交付**：把生成的 SVG 展示给用户，并告诉用户：想每天自动刷新的话，可以把 `docs/profile-workflow.yml` 复制到自己的主页仓库，再在仓库 Secrets 里配置 `MCD_MCP_TOKEN`。

## 卡片指标说明

| 指标 | 来源 | 说明 |
|---|---|---|
| 麦门职级 L1–L6（🌱🥉🥈🥇🏆👑 阶梯） | order-list | 只按"探索过多少款单品/品类 + 麦龄"计分，**不按下单次数**，不鼓励多吃 |
| 主力依赖 | order-list | 最常点的餐品 |
| 技术栈 | order-list | 套餐拆分后的品类占比（汉堡/小食/饮品/咖啡/甜品/早餐） |
| 发版时段 | order-list | 最常下单的时段（早八发版 / 午间发版 / 下午茶 Hotfix …） |
| 贡献图 | order-list + 历史累积 | 近 16 周哪些天开过饭，只记有无、不计次数 |
| 可用积分 / 本月到期 | query-my-account | 提醒即将过期的积分 |
| 可用优惠券 | query-my-coupons | 卡包里的券数量 |
| NOW SERVING | campaign-calendar | 今日进行中的活动，每天轮换 |

## 注意

- 卡片数据仅供娱乐参考，餐品、价格、活动以麦当劳官方渠道实时信息为准。
- 本项目为参赛作品，非麦当劳官方产品。
