# AI 伴学：每日 1 元额度与使用量统计（GitHub + Cloudflare Pages）

## 本次修改
- AI 伴学侧边显示今日保守估算消耗、剩余额度、成功提问次数和进度条。
- 云端数据库统一记录当日全站消耗；刷新、切换设备不会重置统计。
- 发送 AI 请求之前，在数据库中原子预留该请求的最高预估成本。剩余额度不足就拒绝发送至 DeepSeek。
- 完成后使用 API 返回的 prompt_tokens / completion_tokens 结算；异常时释放额度。当天按北京时间 00:00 自动按日期切换。
- 每日固定 ¥1，针对**整个网站共享**，而非每位访客各 ¥1。

## 必须配置 Cloudflare D1，否则 AI 会拒绝付费请求
1. 打开 Cloudflare Dashboard，进入 **Workers & Pages → D1 SQL Database**（菜单名字可能略有变化），新建 D1 数据库，例如 `smart-study-ai-usage`。
2. 进入 **Workers & Pages → zhixue-bix → Settings → Bindings → Add → D1 database**。
3. 变量名称填入 **`AI_USAGE_DB`**（大小写完全一致），选择上一步的数据库，生产环境保存。
4. 在 **Settings → Variables and Secrets** 确保生产环境存在 **`DEEPSEEK_API_KEY`**，不要把密钥提交到 GitHub。
5. 解压 ZIP，上传里面所有文件到已连接 Cloudflare 的 GitHub 分支的**仓库发布根目录**（如果网站发布目录不是仓库根目录，需把 `_worker.js` 放入实际输出目录）。提交后等待 Cloudflare 自动部署 Success。首次访问额度接口时，代码会自动创建 `ai_daily_usage` 表，不需要执行 SQL。

## 检查方式
- 访问 `https://zhixue-bix.pages.dev/api/ai/usage`，应显示 JSON，其中 `limit:1`、`estimatedSpent`、`remaining`、`requests`。如果看到 503，多半是 D1 未绑定或尚未重新部署。
- 访问 `https://zhixue-bix.pages.dev/api/ai`，GET 应回复 “仅支持 POST 提问”，表示接口存在。
- 在网站“AI伴学”中提问一次，观察费用统计是否更新；如有错误，从 Cloudflare Functions 日志排查。

## 关于限额准确性
- DeepSeek Flash 官方当前费率（人民币/百万 tokens）：未缓存输入高峰 ¥2，输出高峰 ¥8；非高峰可能更低，缓存命中费用也更低。程序始终用高峰、未缓存费率计算**保守估算上界**。它不是 DeepSeek 后台实际扣款账单。
- 单次请求最大输出 1200 tokens，输入历史消息总长度限制 16000 字符，并对其做超额预留。
- 数据库写入发生在收费请求之前，能抵御多次同时点击、刷新或跨设备绕过额度。D1 异常会拒绝收费请求（安全优先）。
- 如果 DeepSeek 调整定价、引入收费工具或改变计费模式，应同步修改 `_worker.js` 中的费率；官方账单才是最终依据。
- **建议额外在 Cloudflare 设置 WAF、Turnstile 或其他访问控制**，因为公开网站任何访客都能消耗该每日共享额度。

官方参考：
- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.cloudflare.com/pages/functions/advanced-mode/
- https://api-docs.deepseek.com/zh-cn/quick_start/pricing/
