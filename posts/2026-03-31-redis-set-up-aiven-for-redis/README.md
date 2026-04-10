# How to Set Up Aiven for Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Aiven, Cloud, Managed Database, DevOps

Description: Step-by-step guide to provisioning and connecting to an Aiven for Redis managed instance, including TLS configuration and basic client setup.

---

Aiven for Valkey (formerly Aiven for Redis) is a fully managed, Redis-compatible service available across AWS, GCP, Azure, and DigitalOcean. It handles backups, upgrades, and failover while giving you a standard Redis-protocol endpoint. This guide walks through provisioning a service and connecting to it securely.

## Provisioning an Aiven for Valkey Service

1. Sign up at [aiven.io](https://aiven.io) and create a project.
2. Click **Create Service** and choose **Valkey**.
3. Select your cloud provider and region.
4. Choose a plan (the `Free` plan is suitable for development).
5. Set a service name and click **Create Service**.

Within a few minutes the service status changes to **Running**.

## Downloading the CA Certificate

Aiven requires TLS for all connections. Download the CA certificate from the service overview page, or use the Aiven CLI:

```bash
avn service user-creds-download --username avnadmin --project my-project my-redis-service
```

This writes `ca.pem`, `service.cert`, and `service.key` to your current directory.

## Connecting with redis-cli

Find the connection details on the **Overview** tab. The URI format is:

```text
rediss://avnadmin:<password>@<host>:<port>
```

Connect using the CA cert:

```bash
redis-cli --tls \
  --cacert ca.pem \
  -h <host> \
  -p <port> \
  -a <password>
```

Run a quick test:

```bash
<host>:<port>> PING
PONG
<host>:<port>> SET hello "aiven"
OK
<host>:<port>> GET hello
"aiven"
```

## Connecting with Node.js

Install `ioredis`:

```bash
npm install ioredis
```

```javascript
const Redis = require("ioredis");
const fs = require("fs");

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  tls: {
    ca: fs.readFileSync("ca.pem"),
    rejectUnauthorized: true,
  },
});

redis.set("key", "value").then(() => redis.get("key")).then(console.log);
```

## Connecting with Python

```bash
pip install redis
```

```python
import redis

client = redis.Redis(
    host="<host>",
    port=<port>,
    password="<password>",
    ssl=True,
    ssl_ca_certs="ca.pem",
)

client.set("greeting", "hello from aiven")
print(client.get("greeting"))
```

## Environment Variables Pattern

Store credentials in environment variables for portability:

```bash
export REDIS_HOST=redis-abc.aivencloud.com
export REDIS_PORT=12345
export REDIS_PASSWORD=your-password
```

## Enabling Advanced Configuration

In the Aiven Console under **Advanced Configuration** you can tune:

- `redis_maxmemory_policy` - eviction policy (e.g., `allkeys-lru`)
- `redis_timeout` - idle connection timeout in seconds
- `redis_notify_keyspace_events` - enable keyspace notifications

```bash
avn service update my-redis-service \
  --project my-project \
  -c redis_maxmemory_policy=allkeys-lru
```

## Summary

Aiven for Valkey provides a cloud-agnostic managed Redis-compatible instance with mandatory TLS and automatic failover. Provisioning takes under five minutes via the console or CLI. Use the downloaded CA certificate for all client connections and configure eviction policies through the Advanced Configuration panel.
