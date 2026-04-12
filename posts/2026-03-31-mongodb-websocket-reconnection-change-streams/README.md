# How to Handle Reconnection in MongoDB-Backed WebSocket Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WebSocket, Reconnection, Change Stream, Node.js

Description: Implement robust reconnection logic for MongoDB-backed WebSocket apps, covering both client-side back-off and server-side change stream resume tokens.

---

## Overview

WebSocket connections and MongoDB change streams both involve persistent network connections that can drop. A production application must handle reconnection gracefully on both sides - the WebSocket client must reconnect to the server, and the server must resume the change stream from where it left off to avoid missing events.

## Server-Side: Resuming Change Streams

MongoDB change streams expose a `_id` field on every event called the resume token. Storing this token allows the server to restart the cursor from the exact position in the oplog after a crash or restart.

```javascript
const { MongoClient } = require('mongodb');
const { WebSocketServer, OPEN } = require('ws');
const fs = require('fs');

const TOKEN_FILE = './resume-token.json';

function loadToken() {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveToken(token) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(token));
}

async function watchCollection(collection, wss) {
  let resumeToken = loadToken();

  while (true) {
    try {
      const opts = {
        fullDocument: 'updateLookup',
        ...(resumeToken ? { resumeAfter: resumeToken } : {})
      };

      const stream = collection.watch([], opts);

      for await (const event of stream) {
        resumeToken = event._id;
        saveToken(resumeToken);

        const payload = JSON.stringify(event);
        wss.clients.forEach((ws) => {
          if (ws.readyState === OPEN) ws.send(payload);
        });
      }
    } catch (err) {
      const isResumable = err.code === 286 || err.message.includes('ChangeStreamHistoryLost');
      if (isResumable) {
        console.warn('Resume token expired, restarting from head');
        resumeToken = null;
        fs.rmSync(TOKEN_FILE, { force: true });
      } else {
        console.error('Change stream error:', err.message);
      }
      // Wait before retrying
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}
```

## Client-Side: Exponential Back-off Reconnection

The browser WebSocket API does not reconnect automatically. Implement exponential back-off to avoid thundering herd problems when a server restarts.

```javascript
class ReconnectingWebSocket {
  constructor(url) {
    this.url = url;
    this.delay = 1000;
    this.maxDelay = 30000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected');
      this.delay = 1000; // reset delay on success
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.onData(data);
    };

    this.ws.onclose = (event) => {
      if (!event.wasClean) {
        const jitter = Math.random() * this.delay * 0.5;
        const reconnectDelay = this.delay + jitter;
        console.warn(`Disconnected. Reconnecting in ${Math.round(reconnectDelay)}ms`);
        setTimeout(() => this.connect(), reconnectDelay);
        this.delay = Math.min(this.delay * 2, this.maxDelay);
      }
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      this.ws.close();
    };
  }

  onData(data) {
    // Override this method to handle incoming events
    console.log('Received:', data);
  }

  send(message) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

const rws = new ReconnectingWebSocket('ws://localhost:8080');
rws.onData = (data) => {
  document.getElementById('feed').innerText = JSON.stringify(data, null, 2);
};
```

## Storing Resume Tokens in Redis

For multi-instance deployments, store the resume token in Redis instead of a local file.

```javascript
const { createClient } = require('redis');

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

async function getToken() {
  const raw = await redis.get('change-stream:token');
  return raw ? JSON.parse(raw) : null;
}

async function setToken(token) {
  await redis.set('change-stream:token', JSON.stringify(token), { EX: 86400 });
}
```

## Summary

Reliable reconnection in MongoDB-backed WebSocket applications requires both client-side exponential back-off and server-side change stream resume token persistence. Store tokens in a durable location such as a file or Redis, handle expired token errors by restarting from the oplog head, and use jitter in back-off delays to avoid reconnection storms in multi-client scenarios.
