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
import { ChatRoom } from './server/ChatRoom.js';

export { ChatRoom };

const originalLog = console.log;
console.log = function() {
  const date = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  const timestamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
  originalLog.apply(console, [`[${timestamp}]`, ...arguments]);
};

export default {
  async fetch(request, env, ctx) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      const id = env.CHAT_ROOM.idFromName('internal-chat-room');
      const room = env.CHAT_ROOM.get(id);
      return room.fetch(request);
    }

    // 请求方法
    const method = request.method;
    // 请求路径
    const url = new URL(request.url);
    // console.log('==> url: ', url);
    // console.log('==> method: ', method);

    if (method === 'GET') {
      const getParams = url.searchParams;
      // console.log('==> params: ', '' + getParams);
      switch(url.pathname) {
        case '/':
          return new Response(index, { headers: { 'Content-Type': 'text/html' } });
        case '/index.js':
          return new Response(indexjs, { headers: { 'Content-Type': 'application/x-javascript' } });
        case '/style.css':
          return new Response(stylecss, { headers: { 'Content-Type': 'text/css' } });
        case '/xchatuser.js':
          return new Response(xchatuserjs, { headers: { 'Content-Type': 'application/x-javascript' } });
      }
    } else if (method === 'POST') {
      const postParams = await request.json();
      return new Response(JSON.stringify(postParams));
    }

    return new Response('Hello World!');
  },


};
