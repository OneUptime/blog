# How to Implement a Simple Chat Server in Node.js Using IPv4 Sockets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, TCP, IPv4, Chat, Networking, Net Module, Socket

Description: Build a multi-user text chat server in Node.js using raw IPv4 TCP sockets with username registration, public messaging, and direct messages.

## Introduction

A chat server is an excellent project for learning TCP socket programming. This implementation uses Node.js's `net` module to create a multi-user chat room over IPv4 with username registration, broadcast messaging, and private direct messages - all without any external dependencies.

## Complete Chat Server

```javascript
// chat-server.js
const net = require('net');

const PORT = 3000;
const HOST = '0.0.0.0';

// Map of username -> socket
const users = new Map();

/**
 * Broadcast a message to all connected users except the sender
 */
function broadcast(message, excludeSocket = null) {
  for (const socket of users.values()) {
    if (socket !== excludeSocket && !socket.destroyed) {
      socket.write(message);
    }
  }
}

/**
 * Format a chat message with timestamp
 */
function formatMessage(sender, text) {
  const time = new Date().toTimeString().split(' ')[0];
  return `[${time}] ${sender}: ${text}\n`;
}

const server = net.createServer((socket) => {
  let username = null;
  let buffer = '';

  // Set socket options
  socket.setEncoding('utf8');
  socket.setNoDelay(true);
  socket.setTimeout(600000); // 10-minute idle timeout

  socket.write('Welcome to the chat server!\nEnter your username: ');

  // Handle incoming data
  socket.on('data', (data) => {
    buffer += data;
    
    // Process complete lines (handle fragmented TCP segments)
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.substring(0, newlineIndex).trim();
      buffer = buffer.substring(newlineIndex + 1);
      
      if (!line) continue;

      // Registration phase
      if (!username) {
        const requestedName = line.replace(/[^a-zA-Z0-9_]/g, '');
        
        if (requestedName.length < 2) {
          socket.write('Username must be at least 2 alphanumeric characters. Try again: ');
          return;
        }
        
        if (users.has(requestedName)) {
          socket.write(`Username "${requestedName}" is taken. Try another: `);
          return;
        }
        
        username = requestedName;
        users.set(username, socket);
        
        socket.write(`\nWelcome, ${username}! Type /help for commands.\n`);
        broadcast(`*** ${username} has joined the chat ***\n`, socket);
        console.log(`${username} joined from ${socket.remoteAddress}`);
        return;
      }

      // Command handling
      if (line.startsWith('/')) {
        const parts = line.split(' ');
        const command = parts[0].toLowerCase();

        switch (command) {
          case '/quit':
          case '/exit':
            socket.end('Goodbye!\n');
            break;

          case '/who':
            // List all online users
            const userList = [...users.keys()].join(', ');
            socket.write(`Online users: ${userList}\n`);
            break;

          case '/dm': {
            // Private message: /dm <username> <message>
            const target = parts[1];
            const dmText = parts.slice(2).join(' ');
            
            if (!target || !dmText) {
              socket.write('Usage: /dm <username> <message>\n');
              break;
            }
            
            const targetSocket = users.get(target);
            if (!targetSocket) {
              socket.write(`User "${target}" is not online.\n`);
              break;
            }
            
            targetSocket.write(`[PM from ${username}]: ${dmText}\n`);
            socket.write(`[PM to ${target}]: ${dmText}\n`);
            break;
          }

          case '/help':
            socket.write(
              'Commands:\n' +
              '  /who          - List online users\n' +
              '  /dm <u> <msg> - Send a private message\n' +
              '  /quit         - Disconnect\n'
            );
            break;

          default:
            socket.write(`Unknown command: ${command}\n`);
        }
      } else {
        // Regular broadcast message
        const message = formatMessage(username, line);
        socket.write(message); // Echo to sender
        broadcast(message, socket);
      }
    }
  });

  // Handle disconnect
  function handleDisconnect() {
    if (username) {
      const leftUser = username;
      username = null;
      users.delete(leftUser);
      broadcast(`*** ${leftUser} has left the chat ***\n`);
      console.log(`${leftUser} disconnected`);
    }
  }

  socket.on('end', handleDisconnect);
  socket.on('close', handleDisconnect);
  socket.on('error', (err) => {
    if (err.code !== 'ECONNRESET') {
      console.error(`Socket error for ${username}: ${err.message}`);
    }
    handleDisconnect();
  });
  socket.on('timeout', () => {
    socket.end('Idle timeout.\n');
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Chat server running on ${HOST}:${PORT}`);
  console.log(`Connect with: telnet localhost ${PORT}`);
});
```

## Connecting with Telnet (Test Client)

```bash
# Connect to the chat server

telnet localhost 3000

# Or with netcat
nc localhost 3000
```

## Conclusion

This chat server demonstrates key TCP socket patterns: line-buffered message framing (handling fragmented TCP segments), user registration flow, broadcast messaging, and graceful disconnect handling. These patterns generalize to any protocol that exchanges text over TCP.
