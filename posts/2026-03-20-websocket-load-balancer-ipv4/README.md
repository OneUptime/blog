# How to Scale WebSocket Servers Behind an IPv4 Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WebSocket, Load Balancing, IPv4, Nginx, Redis, Networking

Description: Learn how to scale WebSocket servers behind an IPv4 load balancer using sticky sessions, shared state with Redis pub/sub, and Nginx upstream configuration.

## The WebSocket Scaling Challenge

WebSocket connections are stateful and persistent. A standard round-robin load balancer sends each new HTTP request to a different backend, but WebSocket upgrades need to stay on the same backend for the lifetime of the connection.

**Solutions:**
1. Sticky sessions (IP hash or cookie pinning)
2. Shared pub/sub (Redis) for cross-server broadcast

## Nginx: Sticky Sessions with IP Hash

```nginx
upstream ws_backends {
    ip_hash;   # Pin each client IP to the same backend
    server 10.0.0.1:8765;
    server 10.0.0.2:8765;
    server 10.0.0.3:8765;
    keepalive 32;
}

server {
    listen 80;
    server_name ws.example.com;

    location /ws {
        proxy_pass http://ws_backends;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host       $host;
        proxy_set_header X-Real-IP  $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
    }
}
```

## Redis Pub/Sub for Cross-Server Broadcast (Node.js)

```javascript
const WebSocket = require("ws");
const redis     = require("redis");

const CHANNEL = "ws:broadcast";

// Separate publish and subscribe clients (redis requirement)
const pub = redis.createClient({ url: "redis://localhost:6379" });
const sub = redis.createClient({ url: "redis://localhost:6379" });

(async () => {
    await pub.connect();
    await sub.connect();

    const wss = new WebSocket.Server({ host: "0.0.0.0", port: 8765 });
    const local = new Set();  // clients on THIS server instance

    wss.on("connection", (ws) => {
        local.add(ws);
        ws.on("message", (data) => {
            // Publish to Redis - all server instances will receive it
            pub.publish(CHANNEL, data.toString());
        });
        ws.on("close", () => local.delete(ws));
    });

    // Subscribe: forward messages from Redis to local clients
    await sub.subscribe(CHANNEL, (message) => {
        for (const ws of local) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(message);
            }
        }
    });

    console.log("WebSocket server with Redis pub/sub on :8765");
})();
```

## Python: Redis Pub/Sub for Broadcast

```python
import asyncio
import redis.asyncio as aioredis
import websockets

CHANNEL = "ws:broadcast"
local_clients: set = set()

async def redis_listener(redis_client):
    async with redis_client.pubsub() as pubsub:
        await pubsub.subscribe(CHANNEL)
        async for msg in pubsub.listen():
            if msg["type"] == "message":
                data = msg["data"].decode()
                websockets.broadcast(local_clients, data)

async def handler(ws):
    local_clients.add(ws)
    r = aioredis.from_url("redis://localhost:6379")
    try:
        async for msg in ws:
            await r.publish(CHANNEL, msg)
    finally:
        local_clients.discard(ws)
        await r.aclose()

async def main():
    r = aioredis.from_url("redis://localhost:6379")
    asyncio.create_task(redis_listener(r))
    async with websockets.serve(handler, "0.0.0.0", 8765):
        await asyncio.Future()

asyncio.run(main())
```

## Conclusion

Use Nginx `ip_hash` for sticky sessions to ensure WebSocket clients always reach the same backend server. For broadcast across multiple server instances, use Redis pub/sub - each server subscribes to a channel and forwards received messages to its local WebSocket clients. This pattern scales horizontally with no direct server-to-server communication. In Kubernetes, use a `ClusterIP` Service fronted by an Nginx Ingress with `nginx.ingress.kubernetes.io/affinity: "cookie"` for session stickiness.
