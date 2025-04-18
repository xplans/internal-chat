# Wrangler版的"发个东西"

一个局域网文字/文件P2P传输工具

## 服务部署（ws服务端和Web页面服务二合一）：

1. 安装nodejs，node版本没有测试，我用的是 `16.20.2`
2. 使用 `npm`安装 `wrangler`：

```bash
npm install -g wrangler
# 或者使用yarn安装：
yarn global add wrangler
```

3. 开发和测试

```bash
cd internal-chat
wrangler dev
```

4. 部署到Cloudflare

   4.1 登录Cloudflare账号, 在弹出的浏览器窗口中登录Cloudflare账户

   ```bash
   # 执行命令：
   wrangler login
   ```
   4.2 执行部署

   ```bash
   wrangler deploy
   ```
