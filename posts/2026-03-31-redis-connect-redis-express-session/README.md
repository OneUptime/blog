# How to Use connect-redis for Express Session Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Express, Session, Node.js, Authentication

Description: Store Express.js sessions in Redis using connect-redis and express-session to share sessions across multiple Node.js instances.

---

The default `express-session` store keeps sessions in memory, which is lost on restart and not shared across multiple Node.js processes. `connect-redis` persists sessions in Redis, enabling stateless horizontal scaling.

## Install Dependencies

```bash
npm install express express-session connect-redis redis
```

## Basic Setup

```javascript
const express = require("express");
const session = require("express-session");
const { createClient } = require("redis");
const { RedisStore } = require("connect-redis");

const app = express();

// Create Redis client
const redisClient = createClient({ url: "redis://localhost:6379" });
redisClient.connect().catch(console.error);

// Configure session middleware
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || "change-this-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 30 * 60 * 1000, // 30 minutes
    },
  })
);
```

## Login and Session Usage

```javascript
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await authenticateUser(username, password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.save((err) => {
    if (err) return res.status(500).json({ error: "Session error" });
    res.json({ message: "Logged in" });
  });
});

app.get("/me", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ userId: req.session.userId, username: req.session.username });
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});
```

## Customise the Redis Store

```javascript
new RedisStore({
  client: redisClient,
  prefix: "myapp:sess:",   // key prefix in Redis
  ttl: 1800,               // seconds; used when cookie has no expiry
  disableTouch: false,     // reset TTL on every request
});
```

## Inspect Sessions in Redis

```bash
redis-cli keys "myapp:sess:*"
redis-cli get "myapp:sess:abc123"
redis-cli ttl "myapp:sess:abc123"
```

## Graceful Reconnection

```javascript
redisClient.on("error", (err) => {
  console.error("Redis client error:", err);
});

redisClient.on("reconnecting", () => {
  console.log("Reconnecting to Redis...");
});
```

## Summary

`connect-redis` integrates Redis session storage into Express in under twenty lines. Sessions persist across restarts and are shared across all Node.js instances behind a load balancer. Setting `resave: false` and `saveUninitialized: false` reduces unnecessary Redis writes, and the `prefix` option namespaces session keys for easy management and monitoring.
