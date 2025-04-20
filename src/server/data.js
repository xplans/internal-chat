function getCookieValue(socket) {
  try {
    // 尝试从不同的可能位置获取 cookie
    const cookie = socket.request?.headers?.cookie || 
                  socket.handshake?.headers?.cookie ||
                  socket._socket?.request?.headers?.cookie ||
                  socket.upgradeReq?.headers?.cookie;

    if (!cookie) return null;

    const match = cookie.match(/nickname=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch (e) {
    console.log('Error getting cookie:', e);
    return null;
  }
}

const data = {}

function getKey(ip, roomId, networkId) {
  if (roomId) {
    return roomId;
  }
  
  const isIPv6 = ip.includes(':');
  let baseParts;
  
  if (isIPv6) {
    // 处理IPv6地址，展开双冒号简写格式
    const expanded = ip.replace('::', ':'.repeat(8 - ip.split(':').filter(Boolean).length)).split(':');
    baseParts = expanded.slice(0, 4).filter(part => part !== '');
  } else {
    // 处理IPv4地址
    baseParts = ip.split('.').slice(0, 3);
  }
  
  const baseKey = baseParts.join(isIPv6 ? ':' : '.');
  
  return networkId ? `${networkId}-${baseKey}` : baseKey;
}

function registerUser(ip, socket, request, roomId, networkId) {
  const key = getKey(ip, roomId, networkId);
  const room = data[key]
  if (!room) {
    data[key] = []
  }
  let id = `${Math.floor(Math.random() * 1000000).toString().substring(3,5).padStart(2, '0')}${(new Date()).getMilliseconds().toString().padStart(3, '0')}`
  while (data[id]) {
    id = `${Math.floor(Math.random() * 1000000).toString().substring(3,5).padStart(2, '0')}${(new Date()).getMilliseconds().toString().padStart(3, '0')}`
  }
  const nickname = getCookieValue(socket);
  data[key].push({ id, socket, targets: {}, nickname })
  return id;
}

function unregisterUser(ip, roomId, id, networkId) {
  const key = getKey(ip, roomId, networkId);
  const room = data[key]
  if (room) {
    const index = room.findIndex(user => user.id === id)
    if (index !== -1) {
      return room.splice(index, 1)
    }
  }
}

function getUserList(ip, roomId, networkId) {
  const key = getKey(ip, roomId, networkId);
  const room = data[key]
  // 去掉socket属性
  return room ?? []
}

function getUser(ip, roomId, uid, networkId) {
  const key = getKey(ip, roomId, networkId);
  const room = data[key]
  if (!room) {
    return null;
  }
  return room.find(user => user.id === uid)
}

function updateNickname(ip, roomId, id, nickname, networkId) {
  const key = getKey(ip, roomId, networkId);
  const room = data[key];
  if (room) {
    const user = room.find(user => user.id === id);
    if (user) {
      user.nickname = nickname;
      return true;
    }
  }
  return false;
}

module.exports = { registerUser, unregisterUser, getUserList, getUser, updateNickname, getKey }