# How to Set Up IBM Cloud Databases for Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IBM Cloud, Managed Database, Cloud, DevOps

Description: Provision IBM Cloud Databases for Redis using the IBM Cloud CLI or console, download TLS certificates, and connect with Node.js or Python.

---

IBM Cloud Databases for Redis is a fully managed Redis service running on IBM Cloud infrastructure. It supports Redis 6 and 7, automatic failover via Sentinel, daily backups, and TLS-enforced connections. This guide covers provisioning and connecting to the service.

## Prerequisites

- An IBM Cloud account
- IBM Cloud CLI installed: `curl -fsSL https://clis.cloud.ibm.com/install/linux | sh`
- The Databases CLI plugin: `ibmcloud plugin install cloud-databases`

## Provisioning via IBM Cloud CLI

```bash
# Log in
ibmcloud login --sso

# Target your resource group
ibmcloud target -g default

# Create a Redis instance (Standard plan)
ibmcloud resource service-instance-create my-redis \
  databases-for-redis standard \
  us-south \
  --parameters '{"members_memory_allocation_mb": 1024}'
```

Check the status until it shows `active`:

```bash
ibmcloud resource service-instance my-redis
```

## Getting Connection Credentials

```bash
# Create service credentials
ibmcloud resource service-key-create my-redis-creds Administrator \
  --instance-name my-redis

# View the credentials
ibmcloud resource service-key my-redis-creds --output json
```

The JSON output contains a `connection.rediss` block with host, port, password, and a base64-encoded certificate.

## Extracting the TLS Certificate

```bash
# From the JSON credentials, extract and decode the cert
ibmcloud resource service-key my-redis-creds --output json | \
  jq -r '.[0].credentials.connection.rediss.certificate.certificate_base64' | \
  base64 -d > ibm-redis-ca.pem
```

## Connecting with redis-cli

```bash
redis-cli --tls \
  --cacert ibm-redis-ca.pem \
  -h <hostname> \
  -p <port> \
  -a <password>
```

## Connecting with Node.js

```bash
npm install ioredis
```

```javascript
const Redis = require("ioredis");
const fs = require("fs");

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT, 10),
  password: process.env.REDIS_PASSWORD,
  tls: {
    ca: fs.readFileSync("ibm-redis-ca.pem"),
    rejectUnauthorized: true,
  },
  enableReadyCheck: true,
});

redis.on("ready", () => console.log("IBM Cloud Redis ready"));

(async () => {
  await redis.set("ibm:test", "connected", "EX", 60);
  console.log(await redis.get("ibm:test"));
})();
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
    port=int(os.environ["REDIS_PORT"]),
    password=os.environ["REDIS_PASSWORD"],
    ssl=True,
    ssl_ca_certs="ibm-redis-ca.pem",
    decode_responses=True,
)

print(client.ping())  # True
client.set("ibm:key", "hello")
print(client.get("ibm:key"))
```

## Scaling the Instance

IBM Cloud Databases scales resources independently:

```bash
# Scale memory to 2 GB per member
ibmcloud cdb deployment-groups-set my-redis member \
  --memory 2048

# Scale disk to 20 GB
ibmcloud cdb deployment-groups-set my-redis member \
  --disk 20480
```

## Enabling Keyspace Notifications

Use the IBM Cloud console under **Configuration** to set `notify-keyspace-events`. For example, to receive expired key events:

```text
notify-keyspace-events: Ex
```

This is useful for cache invalidation patterns where the application subscribes to `__keyevent@0__:expired`.

## Summary

IBM Cloud Databases for Redis provides a managed Redis instance with TLS enforcement, automatic Sentinel-based failover, and independent scaling of memory and disk. Extract the TLS certificate from the service credentials JSON to enable secure connections from any Redis client.
