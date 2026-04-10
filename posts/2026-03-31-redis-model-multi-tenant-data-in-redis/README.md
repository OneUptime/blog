# How to Model Multi-Tenant Data in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Multi-Tenant, Data Modeling, SaaS, Key Design

Description: Learn strategies for modeling multi-tenant data in Redis using key prefixes, hash tags, and namespace isolation to keep tenant data secure and performant.

---

## Why Multi-Tenancy Matters in Redis

In SaaS applications, multiple tenants share the same Redis infrastructure. Proper key design ensures tenant data is isolated, queries are efficient, and accidental cross-tenant access is prevented. Redis does not enforce tenant boundaries natively, so the application layer must enforce isolation through key naming conventions.

## Key Prefix Strategy

The most common approach is to prefix every key with the tenant identifier:

```bash
# Pattern: {tenant_id}:{entity_type}:{entity_id}
SET tenant:acme:user:101 '{"name":"Alice","email":"alice@acme.com"}'
SET tenant:globex:user:101 '{"name":"Bob","email":"bob@globex.com"}'
```

Both tenants can have a user with ID 101 - they are completely isolated by prefix.

## Using Hashes for Tenant-Scoped Entities

```bash
HSET tenant:acme:user:101 name "Alice" email "alice@acme.com" role "admin"
HSET tenant:globex:user:101 name "Bob" email "bob@globex.com" role "viewer"
```

Retrieve all fields for a tenant's user:

```bash
HGETALL tenant:acme:user:101
```

## Tenant-Scoped Sorted Sets for Leaderboards

```bash
# Per-tenant leaderboard
ZADD tenant:acme:leaderboard 1500 "user:101"
ZADD tenant:acme:leaderboard 1200 "user:102"
ZADD tenant:globex:leaderboard 1800 "user:201"

# Get top 3 for acme tenant
ZRANGE tenant:acme:leaderboard 0 2 REV WITHSCORES
```

## Tenant Configuration

Store per-tenant configuration as a hash:

```bash
HSET tenant:acme:config max_users "100" plan "pro" feature_flags "darkmode,api"
HSET tenant:globex:config max_users "10" plan "starter" feature_flags "darkmode"
```

## Tenant Isolation with Redis Cluster Hash Tags

In Redis Cluster, keys with the same hash tag land on the same slot. Use tenant IDs as hash tags to ensure all keys for a tenant are on the same shard - enabling multi-key operations:

```bash
# Hash tag: {acme}
SET {acme}:user:101 "Alice"
SET {acme}:session:abc123 "user:101"

# This MGET works because both keys are on the same slot
MGET {acme}:user:101 {acme}:session:abc123
```

## Tenant-Level TTLs and Expiry

Apply TTLs at the tenant session level:

```bash
SET tenant:acme:session:tok123 "user:101" EX 3600
SET tenant:globex:session:tok456 "user:201" EX 7200
```

## Listing All Tenants

Maintain a set of registered tenant IDs:

```bash
SADD tenants acme globex initech
SMEMBERS tenants
```

## Python Example - Tenant-Aware Cache Layer

```python
import redis
import json

class TenantCache:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.r = redis.Redis(decode_responses=True)

    def _key(self, *parts):
        return f"tenant:{self.tenant_id}:{':'.join(parts)}"

    def set_user(self, user_id: str, data: dict, ttl: int = 3600):
        self.r.set(self._key("user", user_id), json.dumps(data), ex=ttl)

    def get_user(self, user_id: str):
        val = self.r.get(self._key("user", user_id))
        return json.loads(val) if val else None

    def delete_user(self, user_id: str):
        self.r.delete(self._key("user", user_id))

    def set_config(self, config: dict):
        self.r.hset(self._key("config"), mapping=config)

    def get_config(self):
        return self.r.hgetall(self._key("config"))

acme = TenantCache("acme")
acme.set_user("101", {"name": "Alice", "role": "admin"})
print(acme.get_user("101"))

globex = TenantCache("globex")
globex.set_user("101", {"name": "Bob", "role": "viewer"})
print(globex.get_user("101"))
```

## Rate Limiting Per Tenant

```python
import time

def is_rate_limited(r, tenant_id: str, limit: int = 100, window: int = 60):
    key = f"tenant:{tenant_id}:ratelimit:{int(time.time() // window)}"
    count = r.incr(key)
    if count == 1:
        r.expire(key, window)
    return count > limit
```

## Eviction and Memory Management

Use separate Redis databases (0-15) for critical vs. cache tenant data, or separate Redis instances for premium tenants. Apply per-tenant memory quotas at the application level by tracking memory with:

```bash
MEMORY USAGE tenant:acme:user:101
```

## Summary

Multi-tenant Redis modeling relies on consistent key prefixes using the tenant ID to isolate data. Using Redis Cluster hash tags ensures all tenant keys land on the same shard for atomic multi-key operations. Application-level enforcement of key namespacing, combined with per-tenant TTLs and rate limiting, produces a robust multi-tenant caching layer.
