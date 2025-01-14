/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import index from './www/index.html';
import indexjs from './www/index.js.txt';
import stylecss from './www/style.css.txt';
import xchatuserjs from './www/xchatuser.js.txt';



export default {
	async fetch(request, env, ctx) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);
      server.accept();

      server.addEventListener('message', (event) => {
        console.log('Received message:', event.data);
        server.send(`Echo: ${event.data}`);
      });

      server.addEventListener('close', () => {
        console.log('WebSocket connection closed');
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    console.log('======================================================', request.headers.get('Upgrade'));
    // 请求方法
    const method = request.method;
    // 请求路径
    const url = new URL(request.url);
    console.log('==> url: ', url);
    console.log('==> method: ', method);

    if (method === 'GET') {
      // Get请求参数
      const getParams = url.searchParams;
      console.log('==> params: ', '' + getParams);
      switch(url.pathname) {
        case '/':
        {
          return new Response(index, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        case '/index.js':
        {
          return new Response(indexjs, {
            headers: { 'Content-Type': 'application/x-javascript' }
          });
        }
        case '/style.css':
        {
          return new Response(stylecss, {
            headers: { 'Content-Type': 'text/css' }
          });
        }
        case '/xchatuser.js':
        {
          return new Response(xchatuserjs, {
            headers: { 'Content-Type': 'application/x-javascript' }
          });
        }
      }

    } else if (method === 'POST') {
      // Post请求参数
      const postParams = await request.json();
      return new Response(JSON.stringify(postParams));
    }
    return new Response('Hello World!');
  },

};
