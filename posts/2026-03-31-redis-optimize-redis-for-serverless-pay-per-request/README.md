# How to Optimize Redis for Serverless Pay-Per-Request Pricing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Serverless, Cost Optimization, Cloud, Performance

Description: Learn how to minimize Redis request counts and data transfer in serverless architectures where you pay per operation, reducing costs without sacrificing performance.

---

Serverless Redis offerings like Upstash and Redis Cloud Flexible charge per request rather than per provisioned hour. This pricing model rewards efficient usage - every unnecessary command costs money.

## Understand What You Are Paying For

In pay-per-request Redis:

```text
Upstash pricing (approximate):
  $0.2 per 100,000 commands
  $0.03 per MB of storage

Example: 10M commands/month = $20
         500MB storage       = $15
         Total               = $35/month
```

A naive implementation with chatty Redis usage can easily hit 50-100M commands per month, costing $100-200 just in command fees.

## Strategy 1: Batch Commands with Pipelines

Replace multiple individual commands with a single pipeline:

```python
import redis

r = redis.Redis()

# Bad: 5 separate round trips = 5 commands
r.set("a", 1)
r.set("b", 2)
r.set("c", 3)
r.set("d", 4)
r.set("e", 5)

# Good: 1 pipeline = 5 operations in 1 request counted as 5 commands,
# but only 1 network round trip (reduces latency and connection overhead)
pipe = r.pipeline()
pipe.set("a", 1)
pipe.set("b", 2)
pipe.set("c", 3)
pipe.set("d", 4)
pipe.set("e", 5)
pipe.execute()
```

Some providers (Upstash) count pipelined commands individually but you save on connection overhead, which matters for Lambda functions that reconnect frequently.

## Strategy 2: Use Hashes Instead of Multiple Keys

Storing a user record as individual keys costs N commands for N fields. A hash costs 1 `HSET` command:

```python
# Bad: 4 SET commands = 4 billable commands
r.set("user:1:name", "Alice")
r.set("user:1:email", "alice@example.com")
r.set("user:1:plan", "pro")
r.set("user:1:created", "2024-01-01")

# Good: 1 HSET command = 1 billable command
r.hset("user:1", mapping={
    "name": "Alice",
    "email": "alice@example.com",
    "plan": "pro",
    "created": "2024-01-01"
})
```

## Strategy 3: Cache Aggressively with Longer TTLs

Each cache miss requires a database query AND a SET command. Increasing TTLs reduces both misses and SET frequency:

```python
def get_user(user_id: int) -> dict:
    cache_key = f"user:{user_id}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    user = db.query_user(user_id)
    # Increase TTL from 300s to 3600s to reduce SET frequency
    r.set(cache_key, json.dumps(user), ex=3600)
    return user
```

## Strategy 4: Avoid KEYS and SCAN for Listing

Never use `KEYS *` in pay-per-request Redis - it scans the entire keyspace and counts as one expensive command. If you need to list keys, use a separate index (a Set):

```python
# Store a set of user IDs as an index
r.sadd("user_ids", user_id)

# Retrieve all user IDs cheaply
user_ids = r.smembers("user_ids")
```

## Strategy 5: Consolidate Health Checks

Serverless functions often ping Redis on every cold start. Use a simple TTL-based approach to skip redundant pings:

```python
_redis_verified = False

def get_redis():
    global _redis_verified
    r = redis.Redis(...)
    if not _redis_verified:
        r.ping()  # Only ping once per Lambda container lifecycle
        _redis_verified = True
    return r
```

## Summary

Serverless Redis pricing rewards batching, hash usage, and longer TTLs. Replacing multiple individual key operations with hashes, pipelining writes, and extending cache TTLs can cut your command count by 50-80%. Track your daily command count in your provider's dashboard and set budget alerts in OneUptime to avoid surprise bills.
