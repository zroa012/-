# AI伴学 · Cloudflare Pages 上传修复说明

## 为什么之前会失败？
在 Cloudflare 网页端拖拽上传 ZIP/文件夹时，`functions/` 目录不会被编译，导致 `/api/ai` 接口不存在。新版改为项目根目录的 `_worker.js`，Cloudflare Pages 官方支持通过网页拖拽上传这一文件。

## 按顺序操作
1. 在原网站内先导出学习数据备份（以防万一）。
2. 打开 Cloudflare → Workers & Pages → 你当前的 Pages 项目 → Deployments / 部署。
3. 创建一个新的 Production / 生产环境部署，使用拖拽上传方式上传本 ZIP 文件；若要求上传文件夹，先解压，把包含 `index.html`、`_worker.js` 的根目录上传。不要多套一层目录。
4. Cloudflare → Settings → Variables and Secrets，确认生产环境有 Secret 变量 `DEEPSEEK_API_KEY`，它的值是你从 DeepSeek 官方平台取得的 API 密钥（不要上传到聊天或 GitHub）。新密钥配置需要后续部署生效。
5. 部署完成后，直接浏览器访问 `https://zhixue-bix.pages.dev/api/ai`：若显示 JSON 格式的 `仅支持 POST 提问`，表示 API 路由已经生效；若显示 HTML 网页或 404，表示 worker 没部署成功。
6. 回到网站，用 AI 伴学提问。如果报出上游服务故障，需检查 API 密钥、余额、模型名/API 是否可用；不要把密钥贴给任何人。

## 文件说明
- `_worker.js` 为服务端 AI 代理，密钥仅从 Cloudflare 环境变量读取。其他页面由 `env.ASSETS.fetch` 原样提供。
- 原 HTML/CSS/JS/学习算法、计时逻辑不变。
- 当前上游模型调用标识沿用上一版 `deepseek-flash`，实际能否通过 API 调用取决于所使用平台当前支持的模型名称，不能凭此保证指定型号。
- 公共网站可能被其他人调用 API 消耗余额，请配置访问限制/请求频率限制和用量预算。

官方参考：https://developers.cloudflare.com/pages/get-started/direct-upload/
