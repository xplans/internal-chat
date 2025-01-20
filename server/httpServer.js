const express = require('express');
const path = require('path');

// 创建Express应用
const app = express();

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'www')));

// 定义默认路由，当访问根路径时，发送index.html文件
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

// 启动Express服务器
const startHttpServer = (port) => {
  const httpServer = app.listen(port, () => {
    console.log(`Web server running on http://localhost:${port}`);
  });

  return httpServer;
};

module.exports = startHttpServer;