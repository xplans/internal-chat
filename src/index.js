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

    if (method === 'GET') {
      const getParams = url.searchParams;
      switch(url.pathname) {
        case '/':
          return new Response(index, { headers: { 'Content-Type': 'text/html' } });
        case '/index.js':
          let cfifp = request.headers.get('cf-connecting-ip');
          let indexjsStr = '';
          if (internalNet(cfifp)) {
            indexjsStr = `const wsUrl = 'http://${request.headers.get('host')}/ws';` + indexjs;
          }else{
            indexjsStr = `const wsUrl = 'https://${request.headers.get('host')}/ws';` + indexjs;
          }
          return new Response(indexjsStr, { headers: { 'Content-Type': 'application/x-javascript' } });
        case '/style.css':
          return new Response(stylecss, { headers: { 'Content-Type': 'text/css' } });
        case '/xchatuser.js':
          return new Response(xchatuserjs, { headers: { 'Content-Type': 'application/x-javascript' } });
        case '/favicon.ico':
          return new Response(null, { status: 204, statusText: 'No Content' });
        default:
          // 处理对于自定义房间号的请求
          return new Response(index, { headers: { 'Content-Type': 'text/html' } });
      }
    } else if (method === 'POST') {
      const postParams = await request.json();
      return new Response(JSON.stringify(postParams));
    }

    return new Response('Hello World!');
  },


};

/*
  A类地址：10.0.0.0–10.255.255.255
  B类地址：172.16.0.0–172.31.255.255 
  C类地址：192.168.0.0–192.168.255.255
*/
function internalNet(ip) {
  if (ip.startsWith('10.')) {
    return true;
  }
  if (ip.startsWith('172.')) {
    const second = parseInt(ip.split('.')[1]);
    if (second >= 16 && second <= 31) {
      return true;
    }
  }
  if (ip.startsWith('192.168.')) {
    return true;
  }
  if (ip === '::1' || ip === '127.0.0.1') {
    return true;
  }

  return false;
}