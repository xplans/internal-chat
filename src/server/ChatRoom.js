import service from './data.js';
import roomPwdConfig from './.room_pwd.json';

const originalLog = console.log;
console.log = function() {
  const date = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  const timestamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
  originalLog.apply(console, [`🔥[${timestamp}]`, ...arguments]);
};

// 从room_pwd.json中获取房间密码
let roomPwd = { };
try {
  // 获取可执行程序所在目录
  // const exePath = process.pkg ? path.dirname(process.execPath) : __dirname;
  let roomIds = [];
  roomPwdConfig.forEach(item => {
    roomIds.push(item.roomId);
    roomPwd[item.roomId] = { "pwd": item.pwd, "turns": item.turns };
  });
} catch (e) {
  console.error('Failed to load room_pwd.json', e);
}

const SEND_TYPE_REG = '1001'; // 注册后发送用户id
const SEND_TYPE_ROOM_INFO = '1002'; // 发送房间信息
const SEND_TYPE_JOINED_ROOM = '1003'; // 加入房间后的通知，比如对于新进用户，Ta需要开始连接其他人
const SEND_TYPE_NEW_CANDIDATE = '1004'; // offer
const SEND_TYPE_NEW_CONNECTION = '1005'; // new connection
const SEND_TYPE_CONNECTED = '1006'; // new connection
const SEND_TYPE_NICKNAME_UPDATED = '1007'; // 昵称更新通知
const SEND_TYPE_SYSTEM_MESSAGE = '2000'; // 推送系统消息

const RECEIVE_TYPE_NEW_CANDIDATE = '9001'; // offer
const RECEIVE_TYPE_NEW_CONNECTION = '9002'; // new connection
const RECEIVE_TYPE_CONNECTED = '9003'; // joined
const RECEIVE_TYPE_KEEPALIVE = '9999'; // keep-alive
const RECEIVE_TYPE_UPDATE_NICKNAME = '9004'; // 更新昵称请求

export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.clients = new Map();
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      return this.handleWebSocket(request);
    }
    return new Response('WebSocket connection required', { status: 426 });
  }

  async handleWebSocket(request) {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    const clientId = crypto.randomUUID();
    this.clients.set(clientId, server);
    server.accept();

    let socket = server;
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('cf-connecting-ip');
    const url = new URL(request.url);
    const networkId = url.searchParams.get('netId') || '';
    const urlWithPath = url.pathname.split('/')
    let roomId = null;
    let pwd = null;
    if (urlWithPath.length > 1 && urlWithPath[1].length > 0 && urlWithPath[1].length <= 32) {
      roomId = urlWithPath[1].trim();
    }
    if (urlWithPath.length > 2 && urlWithPath[2].length > 0 && urlWithPath[2].length <= 32) {
      pwd = urlWithPath[2].trim();
    }
    if (roomId === 'ws') {  // 兼容旧版本
      roomId = null;
    }
    if (roomId === '') {
      roomId = null;
    }
    let turns = null;
    if (roomId) {
      if (!pwd || !roomPwd[roomId] || roomPwd[roomId].pwd.toLowerCase() !== pwd.toLowerCase()) {
        roomId = null;
      } else {
        turns = roomPwd[roomId].turns;
      }
    }
    const currentId = service.registerUser(ip, socket, request, roomId, networkId);
    // 向客户端发送自己的id
    socketSend_UserId(socket, currentId, roomId, turns);
    service.getUserList(ip, roomId, networkId).forEach(user => {
      socketSend_RoomInfo(user.socket, ip, roomId, networkId);
    });
    socketSend_JoinedRoom(socket, currentId);
    let version = `服务连接成功！🎉  (Link: ${ip.includes(':')? 'IPv6' : 'IPv4'}  Ver: ${this.env.VERSION ? this.env.VERSION: 'dev'})`;
    socketSend_SystemMessage(socket,  version);

    server.addEventListener('message', (event) => {
      const msgStr = event.data.toString();
      if (!msgStr || msgStr.length > 1024 * 10) {
        return;
      }
      let message = null;
      try {
        message = JSON.parse(msgStr);
      } catch (e) {
        console.error('Invalid JSON', msgStr);
        message = null;
      }

      const { uid, targetId, type, data } = message;
      if (!type || !uid || !targetId) {
        return null;
      }
      const me = service.getUser(ip, roomId, uid, networkId)
      const target = service.getUser(ip, roomId, targetId, networkId)
      if (!me || !target) {
        return;
      }

      if (type === RECEIVE_TYPE_NEW_CANDIDATE) {
        socketSend_Candidate(target.socket, { targetId: uid, candidate: data.candidate });
        return;
      }
      if (type === RECEIVE_TYPE_NEW_CONNECTION) {
        socketSend_ConnectInvite(target.socket, { targetId: uid, offer: data.targetAddr });
        return;
      }
      if (type === RECEIVE_TYPE_CONNECTED) {
        socketSend_Connected(target.socket, { targetId: uid, answer: data.targetAddr });
        return;
      }
      if (type === RECEIVE_TYPE_KEEPALIVE) {
        return;
      }
      if (type === RECEIVE_TYPE_UPDATE_NICKNAME) {
        const success = service.updateNickname(ip, roomId, uid, data.nickname, networkId);
        if (success) {
          // 通知所有用户昵称更新
          service.getUserList(ip, roomId, networkId).forEach(user => {
            socketSend_NicknameUpdated(user.socket, { id: uid, nickname: data.nickname });
          });
        }
        return;
      }
    });

    server.addEventListener('close', () => {
      service.unregisterUser(ip, roomId, currentId, networkId);
      service.getUserList(ip, roomId, networkId).forEach(user => {
        socketSend_RoomInfo(user.socket, ip, roomId, networkId);
      });
      console.error(`${currentId}@${ip} disconnected`);
    });

    server.addEventListener('error', () => {
      service.unregisterUser(ip, roomId, currentId, networkId);
      service.getUserList(ip, roomId, networkId).forEach(user => {
        socketSend_RoomInfo(user.socket, ip, roomId, networkId);
      });
      console.error(`${currentId}@${ip}${roomId ? '/' + roomId : ''} disconnected`);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

}

function send(socket, type, data) {
  socket.send(JSON.stringify({ type, data }));
}

function socketSend_UserId(socket, id, roomId, turns) {
  send(socket, SEND_TYPE_REG, { id, roomId, turns });
}
function socketSend_RoomInfo(socket, ip, roomId, networkId) {
  const result = service.getUserList(ip, roomId, networkId).map(user => ({ 
    id: user.id,
    nickname: user.nickname
  }));
  send(socket, SEND_TYPE_ROOM_INFO, result);
}
function socketSend_JoinedRoom(socket, id) {
  send(socket, SEND_TYPE_JOINED_ROOM, { id });
}

function socketSend_Candidate(socket, data) {
  send(socket, SEND_TYPE_NEW_CANDIDATE, data);
}

function socketSend_ConnectInvite(socket, data) {
  send(socket, SEND_TYPE_NEW_CONNECTION, data);
}

function socketSend_Connected(socket, data) {
  send(socket, SEND_TYPE_CONNECTED, data);
}

function socketSend_NicknameUpdated(socket, data) {
  send(socket, SEND_TYPE_NICKNAME_UPDATED, data);
}

function socketSend_SystemMessage(socket, data) {
  send(socket, SEND_TYPE_SYSTEM_MESSAGE, data);
}