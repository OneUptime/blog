# How to Design Redis Key Namespaces for Multi-Tenant Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Multi-Tenant, Namespace, Key Design, Architecture

Description: Design Redis key namespaces for multi-tenant applications to enforce tenant isolation, enable per-tenant eviction, and prevent key collisions across thousands of tenants.

---

Multi-tenant applications store data for many customers in a shared Redis instance. Without a disciplined key naming strategy, tenants can accidentally overwrite each other's data, eviction becomes indiscriminate, and debugging is nearly impossible. A well-designed namespace scheme solves all three problems.

## Namespace Hierarchy

Use a consistent prefix hierarchy: `{tenant}:{service}:{entity}:{id}:{attribute}`

```text
t:acme:users:u-001:profile
t:acme:users:u-001:sessions
t:acme:orders:o-100:summary
t:globex:users:u-001:profile
t:globex:orders:o-100:summary
```

The `t:` prefix marks all tenant-scoped keys and makes them easy to identify.

## Wrapping Redis with a Tenant-Aware Client

Inject the tenant prefix automatically so developers never forget it:

```python
import redis

class TenantRedis:
    def __init__(self, redis_client, tenant_id):
        self._r = redis_client
        self._prefix = f"t:{tenant_id}:"

    def _key(self, key):
        return self._prefix + key

    def get(self, key):
        return self._r.get(self._key(key))

    def set(self, key, value, **kwargs):
        return self._r.set(self._key(key), value, **kwargs)

    def hset(self, key, *args, **kwargs):
        return self._r.hset(self._key(key), *args, **kwargs)

    def hgetall(self, key):
        return self._r.hgetall(self._key(key))

    def delete(self, *keys):
        prefixed = [self._key(k) for k in keys]
        return self._r.delete(*prefixed)
```

Usage:

```python
r = TenantRedis(redis.Redis(), tenant_id="acme")
r.set("users:u-001:profile", profile_json, ex=3600)
r.hset("orders:o-100:summary", mapping=order_data)
```

## Tenant Isolation with Redis ACL

For strong isolation, create per-tenant ACL users restricted to their prefix:

```bash
ACL SETUSER acme-svc on >acme-password ~t:acme:* +@all
ACL SETUSER globex-svc on >globex-password ~t:globex:* +@all
```

Each service connects with its tenant-specific credentials and cannot access other tenants' keys.

## Per-Tenant Key Inventory

Track which key patterns a tenant uses for housekeeping:

```python
def register_key_pattern(tenant_id, pattern):
    r.sadd(f"meta:tenant:{tenant_id}:patterns", pattern)

# On setup:
register_key_pattern("acme", "t:acme:users:*")
register_key_pattern("acme", "t:acme:orders:*")
```

## Tenant Offboarding

Delete all data for a tenant using SCAN to avoid blocking:

```python
def delete_tenant_data(tenant_id):
    pattern = f"t:{tenant_id}:*"
    cursor = 0
    deleted = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=200)
        if keys:
            r.delete(*keys)
            deleted += len(keys)
        if cursor == 0:
            break
    return deleted
```

Never use `KEYS` in production - it blocks Redis for the duration of the scan.

## Per-Tenant Memory Reporting

Estimate memory usage per tenant with SCAN and MEMORY USAGE:

```python
def tenant_memory_bytes(tenant_id, sample_size=500):
    pattern = f"t:{tenant_id}:*"
    cursor = 0
    total = 0
    count = 0
    while count < sample_size:
        cursor, keys = r.scan(cursor, match=pattern, count=100)
        for key in keys:
            total += r.memory_usage(key) or 0
            count += 1
        if cursor == 0:
            break
    return total
```

## Summary

A strict key namespace hierarchy like `t:{tenant}:{service}:{entity}:{id}` prevents key collisions and makes tenant offboarding straightforward. Wrapping the Redis client in a tenant-aware proxy enforces the prefix everywhere, while Redis ACL users provide ACL-based tenant isolation when shared namespacing alone is insufficient.
