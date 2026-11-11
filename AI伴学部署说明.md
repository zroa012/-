# 智能学习助手 · 顶部导航与 AI 伴学改版

## 本次改动
- 移除左侧导航栏，将所有原页面入口集中到顶部导航（横向滚动适配手机）。
- 使用统一线性 SVG 图标替代特殊字符图标。
- 上网学习跨网站内部页面、浏览器标签页时持续倒计时；回到学习页显示原计时和完成评价。纸质学习的离开重置逻辑保持不变。
- 新增「AI伴学」页面：连续追问、启发式教学、问题提示、清空对话；对话仅在当前页面内存保存。
- 现有知识管理、学习评价、复习算法、错题管理、数据备份等均保留。

## AI 必须配置后才能回答
模型为 DeepSeek-V4.1-Flash-1017，官方 API 标识为 `deepseek-flash`（该标识可能随官方模型升级指向新版）。模型开源不等于远程 API 免费，使用官方接口需要 DeepSeek API Key 及可用额度。

1. 把压缩包内的文件及 `functions/api/ai.js` 目录一起上传到 GitHub 仓库根目录。
2. Cloudflare Dashboard → Workers & Pages → 对应 Pages 项目 → Settings → Variables and Secrets，增加 `DEEPSEEK_API_KEY`，值为你的 DeepSeek API Key，选择 **Secret/Encrypt**；生产环境务必设置，预览环境按需设置。
3. 重新部署 Cloudflare Pages（确保项目是支持 Pages Functions 的部署方式）。
4. 访问网站的「AI伴学」提问。没有配置密钥会提示错误，不会假装已经连通。
5. **不要**把 API Key 写进 HTML、浏览器 JavaScript、GitHub 源码或 `wrangler.toml` 的明文字段。

## 使用成本和安全
- 官方 API 属于按使用量计费，不因模型开源而自动免费。
- 公共网站任何访客可能调用 `/api/ai` 产生费用。正式开放前建议启用 Cloudflare WAF 速率限制、Turnstile、身份认证/配额，监控 DeepSeek 用量。当前实现有基本消息大小限制，并非完整防滥用方案。
- `/api/ai` 只有部署到 Cloudflare Pages（或兼容 Pages Functions 的平台）后才能正常运行。直接打开本地 HTML 只会显示界面。
- 浏览器学习记录仍存放于 `localStorage`。更新页面前建议导出备份。
