# AI 伴学 Markdown 显示修复

此版本在上一版“每日 1 元限额版”的基础上，只改动 AI 回复显示、样式及缓存版本。

- AI 回复支持 Markdown 标题、加粗/斜体、列表、链接、引用、代码块、表格等。
- 原始 HTML 会转义，不会作为网页代码执行。非 HTTP(S)/mailto 链接不会变成可点击链接。
- **注意**：数学块 `$$...$$` 目前显示为保留格式的公式源码，不包含 LaTeX 公式排版引擎。
- 没有调整 AI 请求模型、Cloudflare `_worker.js`、D1 限额算法、计时或学习记录。
- GitHub 部署：将 ZIP 解压后的文件上传并提交到 `main`，等待 Cloudflare Pages 自动部署，再强制刷新页面（Ctrl+Shift+R）。
- Cloudflare 仍需保留 Secret `DEEPSEEK_API_KEY` 和 D1 binding `AI_USAGE_DB`，无须重新设置。
- 代码均为本地脚本，Service Worker 缓存新版本 `markdown-renderer.js`。
