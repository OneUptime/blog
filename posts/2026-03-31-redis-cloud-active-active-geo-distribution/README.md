# How to Configure Redis Cloud Active-Active Geo-Distribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cloud, Geo-Distribution, Active-Active, CRDT, High Availability

Description: Configure Redis Cloud Active-Active databases using CRDTs for multi-region writes, understand conflict resolution, and connect from globally distributed apps.

---

Redis Cloud Active-Active is a multi-region, multi-master Redis deployment. Every region has a writable replica and changes propagate asynchronously using CRDTs (Conflict-Free Replicated Data Types). This means you can write to Paris and New York simultaneously without locking, and conflicts are resolved automatically.

## When to Use Active-Active

- Your users are spread across continents and need low write latency.
- You can tolerate eventual consistency (writes propagate within seconds).
- Your data model uses counter increments, set additions, or last-write-wins strings.

## Creating an Active-Active Database

1. In the Redis Cloud console, click **Create Database**.
2. Under **Type**, choose **Active-Active**.
3. Select two or more regions (e.g., `us-east-1` and `eu-west-1`).
4. Set memory size and replication within each region.
5. Enable TLS and click **Create**.

Each region gets its own endpoint. Use the closest endpoint for reads and writes.

## CRDT Behavior by Data Type

| Data Type | Conflict Resolution |
|-----------|---------------------|
| String | Last write wins (by wall clock) |
| Counter | Increment operations merge |
| Set | Union of all concurrent adds |
| Sorted Set | Score is the max of concurrent writes |
| Hash | Field-level last-write-wins |

## Connecting to Region-Specific Endpoints

```javascript
const Redis = require("ioredis");
const fs = require("fs");

// Connect to the nearest region for lowest latency
const region = process.env.AWS_REGION || "us-east-1";

const endpoints = {
  "us-east-1": "redis-aa-us.example.com:12345",
  "eu-west-1": "redis-aa-eu.example.com:12346",
};

const [host, port] = endpoints[region].split(":");

const redis = new Redis({
  host,
  port: parseInt(port, 10),
  password: process.env.REDIS_PASSWORD,
  tls: {
    ca: fs.readFileSync("redis_ca.pem"),
  },
});
```

## Demonstrating Conflict Resolution

Simulate a concurrent counter increment from two regions:

```python
import redis

def make_client(host, port, password):
    return redis.Redis(
        host=host,
        port=port,
        password=password,
        ssl=True,
        ssl_ca_certs="redis_ca.pem",
        decode_responses=True,
    )

us = make_client("redis-aa-us.example.com", 12345, "password")
eu = make_client("redis-aa-eu.example.com", 12346, "password")

# Both regions increment the same counter
us.incr("visits:homepage")
eu.incr("visits:homepage")

# After replication, both regions will show 2
import time
time.sleep(2)
print(us.get("visits:homepage"))  # 2
print(eu.get("visits:homepage"))  # 2
```

## Monitoring Replication Lag

Redis Cloud exposes replication metrics in the console under **Metrics**. Key metrics to watch:

- **Incoming sync lag** - how far behind a region is in milliseconds
- **Crdt out of order** - number of out-of-order operations (indicates clock skew)

Set alerts for `incoming_sync_lag > 5000ms`.

## Active-Active Limitations

- No support for Lua scripts that read then write across keys atomically.
- `WAIT` command is not supported.
- Keyspace notifications may fire multiple times across regions.
- Transactions (`MULTI/EXEC`) are local - they do not guarantee cross-region atomicity.

## Summary

Redis Cloud Active-Active allows multi-region writes using CRDTs, eliminating single-region write bottlenecks at the cost of eventual consistency. Connect each service instance to its nearest regional endpoint to minimize latency, and use counters and sets for workloads where automatic conflict resolution fits naturally.
