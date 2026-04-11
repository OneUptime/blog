# How to Use Redis with HAProxy for Session Persistence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, HAProxy, Session Persistence

Description: Learn how to use Redis as a shared session store with HAProxy to achieve sticky sessions across multiple backend servers without relying on IP-based routing.

---

Session persistence in load-balanced environments is tricky. HAProxy's built-in stick tables work for simple cases, but if backend servers restart or new nodes are added, sessions are lost. Storing session data in Redis gives you a centralized, backend-agnostic session layer.

## Architecture Overview

The flow is:
1. Client sends a request
2. HAProxy routes it to any backend
3. Backend reads/writes session data from Redis
4. All backends share the same Redis instance

This decouples session affinity from HAProxy's routing decisions.

## Setting Up Redis

Install Redis and enable remote access:

```bash
sudo apt install redis-server -y
# Allow binding to all interfaces (or specific IP)
sudo sed -i 's/bind 127.0.0.1/bind 0.0.0.0/' /etc/redis/redis.conf
sudo systemctl restart redis
```

## HAProxy Configuration

Configure HAProxy to use cookie-based session persistence, then let backends use Redis:

```text
frontend http_front
    bind *:80
    default_backend http_back

backend http_back
    balance roundrobin
    cookie SERVERID insert indirect nocache
    server web1 192.168.1.10:3000 check cookie web1
    server web2 192.168.1.11:3000 check cookie web2
    server web3 192.168.1.12:3000 check cookie web3
```

The `cookie` directive inserts a `SERVERID` cookie to route repeat requests to the same server. However, if a server goes down, you still lose sessions unless backends share state via Redis.

## Node.js Backend with Redis Sessions

Install connect-redis and express-session:

```bash
npm install express express-session connect-redis redis
```

Configure session middleware to use Redis:

```javascript
const express = require('express');
const session = require('express-session');
const { createClient } = require('redis');
const RedisStore = require('connect-redis').default;

(async () => {
  const client = createClient({ url: 'redis://redis-host:6379' });
  await client.connect();

  const app = express();

  app.use(session({
    store: new RedisStore({ client }),
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 }
  }));

  app.get('/profile', (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ userId: req.session.userId });
  });
})();
```

## Verifying Session Data in Redis

After a user logs in, inspect the session in Redis:

```bash
redis-cli keys "sess:*"
redis-cli get "sess:abc123"
```

You should see serialized session JSON tied to the session ID.

## Failover Behavior

With Redis sessions, if `web1` goes down, HAProxy routes the client to `web2`. Because the session data lives in Redis - not in-memory on `web1` - the user remains logged in.

Remove the `cookie` directive from HAProxy if you want fully stateless routing. The Redis store handles continuity regardless of which backend serves the request.

## Session Expiry

Set session TTL in Redis to match your cookie maxAge:

```bash
redis-cli ttl "sess:abc123"
```

Redis automatically expires sessions, preventing stale data from accumulating.

## Summary

Redis enables true session persistence across HAProxy backends by decoupling session state from individual servers. All backends read and write to the same Redis store, so HAProxy can freely route requests without breaking user sessions. This pattern also supports zero-downtime deployments since sessions survive backend restarts.
