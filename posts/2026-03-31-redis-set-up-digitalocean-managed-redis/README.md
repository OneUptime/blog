# How to Set Up DigitalOcean Managed Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, DigitalOcean, Managed Database, Cloud, DevOps

Description: Learn how to provision a DigitalOcean Managed Redis cluster, secure it with trusted sources, and connect using TLS from your application.

---

DigitalOcean Managed Databases for Redis removes the operational burden of running Redis yourself. You get automated backups, version upgrades, failover, and a TLS-secured endpoint in minutes. This guide covers provisioning, securing, and connecting to a DigitalOcean Managed Redis cluster.

## Creating a Redis Cluster

Via the DigitalOcean Control Panel:

1. Go to **Databases** - **Create Database Cluster**.
2. Choose **Redis** as the engine.
3. Select the Redis version (7.x recommended).
4. Choose a datacenter region close to your application.
5. Pick a plan - the 1 GB RAM plan works for most development workloads.
6. Name the cluster and click **Create Database Cluster**.

Via the `doctl` CLI:

```bash
doctl databases create my-redis \
  --engine redis \
  --version 7 \
  --region nyc3 \
  --size db-s-1vcpu-1gb \
  --num-nodes 1
```

## Restricting Access with Trusted Sources

By default, the cluster is accessible from any IP. Restrict access to specific Droplets or IP ranges:

```bash
# Get the cluster ID
doctl databases list

# Add a Droplet to the trusted sources
doctl databases firewalls append <cluster-id> \
  --rule droplet:<droplet-id>

# Or restrict to an IP address
doctl databases firewalls append <cluster-id> \
  --rule ip_addr:203.0.113.10
```

## Downloading the CA Certificate

DigitalOcean requires TLS. Download the CA cert from the cluster dashboard under **Connection Details**, or:

```bash
doctl databases get-ca <cluster-id> --output json | jq -r '.ca_certificate' > ./certs/ca-certificate.crt
```

## Connecting with redis-cli

```bash
redis-cli --tls \
  --cacert ./certs/ca-certificate.crt \
  -h <host> \
  -p 25061 \
  -a <default-password>
```

Test connectivity:

```bash
<host>:25061> PING
PONG
```

## Connecting with Node.js (ioredis)

```bash
npm install ioredis
```

```javascript
const Redis = require("ioredis");
const fs = require("fs");

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 25061,
  password: process.env.REDIS_PASSWORD,
  tls: {
    ca: fs.readFileSync("./certs/ca-certificate.crt"),
  },
});

async function main() {
  await redis.set("app:status", "healthy", "EX", 60);
  const status = await redis.get("app:status");
  console.log(status); // healthy
}

main().finally(() => redis.disconnect());
```

## Connecting with Python

```bash
pip install redis
```

```python
import redis
import os

client = redis.Redis(
    host=os.environ["REDIS_HOST"],
    port=25061,
    password=os.environ["REDIS_PASSWORD"],
    ssl=True,
    ssl_ca_certs="./certs/ca-certificate.crt",
    decode_responses=True,
)

client.set("environment", "production")
print(client.get("environment"))
```

## Configuring Eviction Policy

DigitalOcean allows you to set the eviction policy from the control panel under **Settings**. Common options:

```text
noeviction      - return error when memory full (default)
allkeys-lru     - evict least recently used keys
volatile-lru    - evict LRU keys with TTL set
allkeys-lfu     - evict least frequently used keys
```

For caching workloads, `allkeys-lru` is the most common choice.

## Using the Connection String

The control panel also provides a connection URI. You can use it directly:

```bash
export REDIS_URL="rediss://default:<password>@<host>:25061"
redis-cli -u "$REDIS_URL" --tls --cacert ./certs/ca-certificate.crt
```

## Summary

DigitalOcean Managed Redis lets you spin up a production-ready Redis cluster in under five minutes. Restrict access using trusted sources, enforce TLS with the provided CA certificate, and set an appropriate eviction policy for your workload. The `doctl` CLI makes it easy to automate provisioning in CI/CD pipelines.
