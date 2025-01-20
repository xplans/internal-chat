# 发个东西

一个局域网文字/文件P2P传输工具

## 服务部署（ws服务端和Web页面服务二合一）：

1. 安装nodejs，node版本没有测试，我用的是 `16.20.2`
2. 下载源码（服务端仅需要 `server`目录）
3. 进入 `server` 目录，运行 `npm install`
4. 运行 `npm run start [port]`，例如 `npm run start 8081`
5. Web服务端口号为ws服务端口号数字减1，例如: ws服务端口号为8081，web服务端口为8080，即: http://host-name:8080
6. 服务设置了默认端口号，web服务端口号为90，ws服务端口号为91，如果指定了ws服务的端口号，需要修改响应web服务请求ws的端口号，修改 `www/index.js`第一行代码 `wsUrl`变量
