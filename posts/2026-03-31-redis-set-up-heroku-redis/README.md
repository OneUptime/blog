# How to Set Up Heroku Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Heroku, PaaS, Cloud, Add-on

Description: Provision and connect to Heroku Redis using the CLI or dashboard, configure TLS, and integrate it with a Node.js or Python application on Heroku.

---

Heroku Redis is a managed Redis add-on built on top of Redis by Redis Inc. It integrates directly with Heroku apps via environment variables and supports TLS connections. This guide walks through provisioning the add-on and using it in a real application.

## Adding Heroku Redis to an App

Using the Heroku CLI:

```bash
# Add the entry-level Mini plan
heroku addons:create heroku-redis:mini --app your-app-name

# Confirm the add-on was created
heroku addons --app your-app-name
```

Heroku automatically sets the `REDIS_URL` config var on your app:

```bash
heroku config:get REDIS_URL --app your-app-name
# rediss://h:password@hostname:port
```

Note: the scheme is `rediss://` (double-s) which means TLS is required.

## Connecting from a Node.js App

Install `ioredis`:

```bash
npm install ioredis
```

```javascript
const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL, {
  tls: {
    rejectUnauthorized: false, // Heroku uses self-signed certs
  },
});

redis.on("connect", () => console.log("Connected to Heroku Redis"));

app.get("/cache/:key", async (req, res) => {
  const value = await redis.get(req.params.key);
  res.json({ key: req.params.key, value });
});
```

For production workloads, configure `maxRetriesPerRequest` and `retryStrategy`:

```javascript
const redis = new Redis(process.env.REDIS_URL, {
  tls: { rejectUnauthorized: false },
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});
```

## Connecting from a Python App

```bash
pip install redis
```

```python
import redis
import os

url = os.environ["REDIS_URL"]
client = redis.from_url(url, ssl_cert_reqs=None, decode_responses=True)

client.set("session:abc123", "user:42", ex=3600)
print(client.get("session:abc123"))
```

## Using Heroku Redis CLI

```bash
heroku redis:cli --app your-app-name
```

This opens a direct `redis-cli` session:

```text
Connecting to redis-shaped-12345 (REDIS_URL):
redis-12345.compute-1.amazonaws.com:21213> PING
PONG
```

## Checking Redis Info and Stats

```bash
# Show plan, version, connection count
heroku redis:info --app your-app-name
```

## Upgrading Plans

The `mini` plan offers 25 MB RAM. For production you need a larger plan:

```bash
heroku addons:upgrade heroku-redis:premium-0 --app your-app-name
```

Plan tiers go from `mini` (25 MB) up to `premium-14` (100 GB).

## Configuring Maxmemory Policy

```bash
heroku redis:maxmemory REDIS_URL --policy allkeys-lru --app your-app-name
```

Available policies mirror standard Redis options: `noeviction`, `allkeys-lru`, `volatile-lru`, `allkeys-random`, etc.

## Maintenance Windows

Heroku Redis performs automated minor version upgrades during a configurable maintenance window:

```bash
heroku redis:maintenance --window "Sunday 06:00" --app your-app-name
```

## Summary

Heroku Redis integrates seamlessly with Heroku apps through the `REDIS_URL` config var and requires TLS for all connections. Use `ioredis` or the Python `redis` client with TLS enabled, set a sensible eviction policy for your workload, and upgrade from the mini plan before hitting the 25 MB memory limit in production.
