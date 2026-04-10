# How to Set Up Redis Cloud by Redis Inc.

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cloud, Managed Database, Cloud, DevOps

Description: Provision and connect to a Redis Cloud database from Redis Inc., including subscription creation, TLS setup, and connecting from Node.js and Python.

---

Redis Cloud is the official managed Redis service from Redis Inc. (the company behind Redis). It runs on AWS, GCP, and Azure and offers Redis Stack modules (RediSearch, RedisJSON, RedisTimeSeries) out of the box. This guide walks through setting up a free database and connecting to it.

## Creating a Free Redis Cloud Account

1. Sign up at [redis.io/cloud](https://redis.io/cloud).
2. Choose your cloud provider and region.
3. Select the **Free** tier (30 MB database, no credit card required).
4. Click **Create Free Database**.

Within a minute, your database is active.

## Locating Your Connection Details

In the Redis Cloud console:

1. Click on your database name.
2. Under **Security**, enable **TLS** and download the **Server CA**.
3. Note the **Public Endpoint** (format: `redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345`) and the **Default User Password**.

## Connecting with redis-cli

```bash
redis-cli --tls \
  --cacert redis_ca.pem \
  -h redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com \
  -p 12345 \
  -a <password>
```

Verify:

```bash
redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345> PING
PONG
redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345> SET greeting "hello redis cloud"
OK
```

## Connecting with Node.js

```bash
npm install ioredis
```

```javascript
const Redis = require("ioredis");
const fs = require("fs");

const redis = new Redis({
  host: "redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com",
  port: 12345,
  password: process.env.REDIS_CLOUD_PASSWORD,
  tls: {
    ca: fs.readFileSync("redis_ca.pem"),
  },
});

async function demo() {
  await redis.hset("user:1", { name: "Alice", role: "admin" });
  const user = await redis.hgetall("user:1");
  console.log(user);
}

demo().finally(() => redis.disconnect());
```

## Connecting with Python

```bash
pip install redis
```

```python
import redis
import os

client = redis.Redis(
    host="redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com",
    port=12345,
    password=os.environ["REDIS_CLOUD_PASSWORD"],
    ssl=True,
    ssl_ca_certs="redis_ca.pem",
    decode_responses=True,
)

# Use RedisJSON if enabled
client.execute_command("JSON.SET", "doc:1", "$", '{"name": "Bob", "age": 30}')
result = client.execute_command("JSON.GET", "doc:1", "$.name")
print(result)  # ["Bob"]
```

## Using Redis Stack Modules

Redis Cloud supports Redis Stack modules on all plans. To use RediSearch:

```bash
# Create a search index
redis-cli -h <host> -p <port> -a <password> --tls --cacert redis_ca.pem \
  FT.CREATE idx:users ON HASH PREFIX 1 user: \
  SCHEMA name TEXT age NUMERIC

# Search
redis-cli -h <host> -p <port> -a <password> --tls --cacert redis_ca.pem \
  FT.SEARCH idx:users "@name:Alice"
```

## Configuring Data Persistence

In the database settings under **Durability**:

- **None** - no persistence (fastest, for ephemeral caches)
- **Append-Only File (AOF)** - every write is logged (strongest durability)
- **Snapshot** - periodic RDB dumps

For caching use `None`; for session storage or queues use `AOF`.

## Summary

Redis Cloud provides a fully managed Redis experience with integrated Redis Stack modules, multi-cloud support, and simple TLS setup. The free tier is ideal for development and prototyping. Enable TLS, download the CA certificate, and configure durability based on whether your data needs to survive restarts.
