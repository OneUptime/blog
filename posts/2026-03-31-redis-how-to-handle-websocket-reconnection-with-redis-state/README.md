# How to Handle WebSocket Reconnection with Redis State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, WebSocket, Reconnection, Session State, Real-Time

Description: Handle WebSocket reconnections gracefully by persisting client session state and missed messages in Redis so clients can resume without data loss.

---

## The Reconnection Problem

WebSocket connections drop due to network instability, server restarts, or client sleep. When a client reconnects, it needs to:

1. Resume its session (room memberships, user identity)
2. Receive messages it missed while disconnected
3. Not confuse the server with a duplicate connection

Redis solves this by persisting session state and buffering missed messages.

## Session Token Design

Assign each client a persistent session token stored in Redis:

```javascript
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const redis = new Redis({ host: process.env.REDIS_HOST });

async function createSession(userId, username) {
  const sessionId = uuidv4();
  const token = crypto.randomBytes(32).toString('hex');

  await redis.hset(`session:${sessionId}`, {
    userId,
    username,
    token,
    rooms: '',
    lastSeen: Date.now().toString(),
    createdAt: Date.now().toString(),
  });

  await redis.expire(`session:${sessionId}`, 86400); // 24-hour session TTL
  await redis.set(`session:token:${token}`, sessionId, 'EX', 86400);

  return { sessionId, token };
}

async function validateSession(token) {
  const sessionId = await redis.get(`session:token:${token}`);
  if (!sessionId) return null;

  const session = await redis.hgetall(`session:${sessionId}`);
  if (!session || !session.userId) return null;

  // Refresh TTL on access
  await redis.expire(`session:${sessionId}`, 86400);
  await redis.expire(`session:token:${token}`, 86400);

  return { sessionId, ...session };
}
```

## Message Buffer for Offline Clients

Buffer messages for disconnected clients:

```javascript
const BUFFER_KEY = (sessionId) => `session:${sessionId}:pending`;
const MAX_BUFFER_SIZE = 500;

async function bufferMessage(sessionId, message) {
  const pipeline = redis.pipeline();
  pipeline.rpush(BUFFER_KEY(sessionId), JSON.stringify(message));
  pipeline.ltrim(BUFFER_KEY(sessionId), -MAX_BUFFER_SIZE, -1); // Keep last N messages
  pipeline.expire(BUFFER_KEY(sessionId), 3600); // 1 hour TTL for buffered messages
  await pipeline.exec();
}

async function getBufferedMessages(sessionId) {
  const messages = await redis.lrange(BUFFER_KEY(sessionId), 0, -1);
  await redis.del(BUFFER_KEY(sessionId));
  return messages.map(m => JSON.parse(m));
}
```

## WebSocket Server with Reconnection Support

```javascript
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
const activeSessions = new Map(); // sessionId -> ws

wss.on('connection', async (ws, req) => {
  let sessionId = null;

  ws.on('message', async (data) => {
    const event = JSON.parse(data.toString());

    if (event.type === 'connect') {
      if (event.reconnectToken) {
        // Reconnecting client - validate session
        const session = await validateSession(event.reconnectToken);

        if (session) {
          sessionId = session.sessionId;

          // Close any existing stale connection for this session
          const staleWs = activeSessions.get(sessionId);
          if (staleWs && staleWs !== ws && staleWs.readyState === WebSocket.OPEN) {
            staleWs.send(JSON.stringify({ type: 'session-superseded' }));
            staleWs.close();
          }

          activeSessions.set(sessionId, ws);

          // Restore room memberships
          const rooms = session.rooms ? session.rooms.split(',').filter(Boolean) : [];
          for (const room of rooms) {
            await rejoinRoom(ws, sessionId, session, room);
          }

          // Deliver buffered messages
          const buffered = await getBufferedMessages(sessionId);
          if (buffered.length > 0) {
            ws.send(JSON.stringify({
              type: 'reconnect-success',
              sessionId,
              missedMessages: buffered,
              roomsRestored: rooms,
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'reconnect-success',
              sessionId,
              roomsRestored: rooms,
            }));
          }
        } else {
          ws.send(JSON.stringify({ type: 'session-expired', needsAuth: true }));
        }
      } else {
        // New connection - create session
        const { sessionId: newSessionId, token } = await createSession(
          event.userId,
          event.username
        );
        sessionId = newSessionId;
        activeSessions.set(sessionId, ws);

        ws.send(JSON.stringify({
          type: 'connect-success',
          sessionId,
          reconnectToken: token,
        }));
      }
    }

    if (event.type === 'join' && sessionId) {
      await joinRoom(ws, sessionId, event.room);
    }
  });

  ws.on('close', async () => {
    if (!sessionId) return;

    // Update last seen timestamp - keep session alive for reconnection
    await redis.hset(`session:${sessionId}`, 'lastSeen', Date.now().toString());
    activeSessions.delete(sessionId);
  });
});
```

## Room Membership Persistence

```javascript
async function joinRoom(ws, sessionId, room) {
  // Add room to session
  const session = await redis.hgetall(`session:${sessionId}`);
  const rooms = new Set(session.rooms ? session.rooms.split(',').filter(Boolean) : []);
  rooms.add(room);
  await redis.hset(`session:${sessionId}`, 'rooms', [...rooms].join(','));

  ws.send(JSON.stringify({ type: 'joined', room }));
}

async function rejoinRoom(ws, sessionId, session, room) {
  // Notify other room members of reconnection
  await redis.publish(`room:${room}:events`, JSON.stringify({
    type: 'user-reconnected',
    userId: session.userId,
    username: session.username,
    timestamp: Date.now(),
  }));
}
```

## Client-Side Reconnection Logic

```javascript
class ReconnectingWebSocket {
  constructor(url) {
    this.url = url;
    this.token = localStorage.getItem('ws-session-token');
    this.reconnectDelay = 1000;
    this.maxDelay = 30000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.ws.send(JSON.stringify({
        type: 'connect',
        reconnectToken: this.token,
        userId: getCurrentUserId(),
        username: getCurrentUsername(),
      }));
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'connect-success' || data.type === 'reconnect-success') {
        if (data.reconnectToken) {
          localStorage.setItem('ws-session-token', data.reconnectToken);
          this.token = data.reconnectToken;
        }
      }
      this.onmessage?.(event);
    };

    this.ws.onclose = () => {
      const delay = this.reconnectDelay;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
      setTimeout(() => this.connect(), delay);
    };
  }
}
```

## Summary

Handling WebSocket reconnections with Redis requires three components: session tokens stored in Redis for identity continuity, a message buffer using Redis Lists to store missed events, and room membership persistence so clients can automatically rejoin their channels on reconnect. Use exponential backoff on the client side to avoid overwhelming the server during mass reconnection events.
