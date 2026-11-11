# AI 伴学故障排查（诊断版）

本版本没有修改原有学习算法、学习数据存储或用户界面布局，仅将 DeepSeek 上游失败时的 HTTP 状态映射为便于理解的中文错误信息，不会向浏览器返回 API Key 或 DeepSeek 原始错误详情。

1. 把 ZIP 解压后，将其中的文件上传到 GitHub 仓库网站发布目录并提交。保留 `_worker.js` 在 Cloudflare Pages 构建产物根目录。不要上传 API Key。
2. 在 Cloudflare 的生产环境 Secret 中确认 `DEEPSEEK_API_KEY` 已配置，并完成一轮新的生产部署。
3. 打开网站，进入 AI 伴学，再次发送提问。此时界面会显示 401、402、400、429 等明确错误类型。
4. 打开 Cloudflare Workers & Pages > 项目 > Logs / Functions Logs 查看函数日志，但不要粘贴完整密钥。
5. 打开 https://platform.deepseek.com/usage 查看 API 账户余额；Chat 网页版订阅与 API 账户余额是不同的。

模型名 `deepseek-flash` 对应 DeepSeek-V4.1-Flash-1017 官方 API。
