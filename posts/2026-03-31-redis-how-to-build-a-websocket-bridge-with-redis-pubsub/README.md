# How to Build a WebSocket Bridge with Redis Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, WebSocket, Real-Time, Node.js, Scalability

Description: Build a scalable WebSocket server that bridges Redis Pub/Sub to browser clients, enabling real-time updates across multiple server instances.

---

## Why Redis Pub/Sub for WebSockets

When running multiple WebSocket server instances (horizontal scaling), a WebSocket connection lives on a specific server. To broadcast a message to all connected clients regardless of which server they are on, use Redis Pub/Sub as the inter-server message bus.

Architecture:

```text
[Browser 1] -- WS --> [Server A] --> [Redis Pub/Sub] <-- [Server B] <-- WS -- [Browser 2]
                                          |
                              [Server C] subscribes too
```

Any server can publish to Redis; all servers receive it and forward to their connected WebSocket clients.

## Step 1 - Basic Node.js WebSocket Bridge

```javascript
const WebSocket = require('ws');
const Redis = require('ioredis');

const PORT = 3000;
const CHANNEL = 'ws-broadcast';

// Separate connections for pub and sub
const publisher = new Redis({ host: 'localhost', port: 6379 });
const subscriber = new Redis({ host: 'localhost', port: 6379 });

const wss = new WebSocket.Server({ port: PORT });
const clients = new Set();

// Subscribe to Redis channel
subscriber.subscribe(CHANNEL);
subscriber.on('message', (channel, message) => {
    // Forward Redis message to all connected WebSocket clients
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`Client connected. Total: ${clients.size}`);

    ws.on('message', (data) => {
        // Publish client message to Redis (broadcast to all servers)
        publisher.publish(CHANNEL, data.toString());
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log(`Client disconnected. Total: ${clients.size}`);
    });

    ws.on('error', (err) => {
        console.error(`WebSocket error: ${err}`);
        clients.delete(ws);
    });
});

console.log(`WebSocket server listening on ws://localhost:${PORT}`);
```

## Step 2 - Add Channel-Based Routing

Support multiple channels so clients subscribe to specific topics:

```javascript
const WebSocket = require('ws');
const Redis = require('ioredis');

const publisher = new Redis({ host: 'localhost', port: 6379 });
const subscriber = new Redis({ host: 'localhost', port: 6379 });

const wss = new WebSocket.Server({ port: 3000 });

// Map: channel -> Set of WebSocket clients
const channelClients = new Map();

// Listen to all channels from this server
subscriber.psubscribe('*');
subscriber.on('pmessage', (pattern, channel, message) => {
    const subs = channelClients.get(channel);
    if (!subs) return;

    const payload = JSON.stringify({ channel, data: message });
    for (const client of subs) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    }
});

wss.on('connection', (ws) => {
    const subscriptions = new Set();

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }

        if (msg.action === 'subscribe' && msg.channel) {
            subscriptions.add(msg.channel);
            if (!channelClients.has(msg.channel)) {
                channelClients.set(msg.channel, new Set());
            }
            channelClients.get(msg.channel).add(ws);
            ws.send(JSON.stringify({ type: 'subscribed', channel: msg.channel }));
        }

        if (msg.action === 'publish' && msg.channel && msg.data) {
            publisher.publish(msg.channel, JSON.stringify(msg.data));
        }
    });

    ws.on('close', () => {
        for (const channel of subscriptions) {
            const subs = channelClients.get(channel);
            if (subs) {
                subs.delete(ws);
                if (subs.size === 0) channelClients.delete(channel);
            }
        }
    });
});
```

## Step 3 - Client-Side JavaScript

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
    // Subscribe to a channel
    ws.send(JSON.stringify({ action: 'subscribe', channel: 'notifications' }));
};

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log(`Channel: ${msg.channel}, Data: ${msg.data}`);
};

// Publish a message
function sendNotification(text) {
    ws.send(JSON.stringify({
        action: 'publish',
        channel: 'notifications',
        data: { text, timestamp: Date.now() }
    }));
}
```

## Step 4 - Python WebSocket Bridge with asyncio

```python
import asyncio
import json
import redis.asyncio as redis
import websockets

clients = {}  # channel -> set of websockets

async def redis_listener():
    r = redis.Redis(host='localhost', port=6379)
    pubsub = r.pubsub()
    await pubsub.psubscribe('*')

    async for message in pubsub.listen():
        if message['type'] == 'pmessage':
            channel = message['channel'].decode()
            data = message['data'].decode()
            subs = clients.get(channel, set())
            for ws in list(subs):
                try:
                    await ws.send(json.dumps({'channel': channel, 'data': data}))
                except Exception:
                    subs.discard(ws)

async def ws_handler(websocket):
    subscriptions = set()
    pub = redis.Redis(host='localhost', port=6379)

    try:
        async for raw in websocket:
            msg = json.loads(raw)
            if msg.get('action') == 'subscribe':
                ch = msg['channel']
                subscriptions.add(ch)
                clients.setdefault(ch, set()).add(websocket)
            elif msg.get('action') == 'publish':
                await pub.publish(msg['channel'], json.dumps(msg['data']))
    finally:
        for ch in subscriptions:
            clients.get(ch, set()).discard(websocket)

async def main():
    await asyncio.gather(
        redis_listener(),
        websockets.serve(ws_handler, 'localhost', 3000)
    )

asyncio.run(main())
```

## Step 5 - Handle Redis Reconnections

```javascript
subscriber.on('error', (err) => {
    console.error('Redis subscriber error:', err);
});

subscriber.on('reconnecting', () => {
    console.log('Redis subscriber reconnecting...');
});

subscriber.on('ready', () => {
    console.log('Redis subscriber ready - re-subscribing');
    subscriber.psubscribe('*');
});
```

## Summary

A Redis Pub/Sub WebSocket bridge uses a dedicated Redis subscriber per server instance to receive messages published from any server and forward them to locally connected WebSocket clients. This enables horizontal scaling of WebSocket servers since any server can handle any client - Redis broadcasts to all. For high-scale production deployments, track subscription state carefully to avoid memory leaks from disconnected WebSocket clients and implement Redis reconnection handling to re-subscribe after outages.
