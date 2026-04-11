# How to Implement Multi-Tenancy with Redis Key Prefixes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Multi-Tenancy, Key Prefixes, SaaS, Architecture, Isolation

Description: Implement multi-tenant Redis using key prefixes to logically separate tenant data on a shared Redis instance while controlling costs and maintaining data isolation.

---

## Multi-Tenancy with Key Prefixes

Key prefix-based multi-tenancy is the simplest approach for isolating tenant data in a shared Redis instance. Each tenant gets a unique prefix, and all Redis keys for that tenant are namespaced under it:

```text
tenant:company-a:user:100
tenant:company-a:session:abc123
tenant:company-b:user:200
tenant:company-b:cache:product:99
```

This approach is low-cost and operationally simple but requires application-level enforcement - Redis itself does not enforce key ownership.

## Implementing Key Prefix Middleware

### Python - Tenant-Aware Redis Client

```python
import redis
from typing import Optional

class TenantRedis:
    """
    A Redis client wrapper that automatically prefixes all keys
    with the tenant identifier.
    """

    def __init__(self, redis_client: redis.Redis, tenant_id: str):
        self._r = redis_client
        self._tenant_id = tenant_id
        self._prefix = f"tenant:{tenant_id}:"

    def _key(self, key: str) -> str:
        """Prepend tenant prefix to key."""
        return f"{self._prefix}{key}"

    def _keys(self, *keys) -> list:
        """Prepend tenant prefix to multiple keys."""
        return [self._key(k) for k in keys]

    def get(self, key: str) -> Optional[bytes]:
        return self._r.get(self._key(key))

    def set(self, key: str, value, ex=None, px=None, nx=False, xx=False):
        return self._r.set(self._key(key), value, ex=ex, px=px, nx=nx, xx=xx)

    def delete(self, *keys):
        return self._r.delete(*self._keys(*keys))

    def exists(self, *keys) -> int:
        return self._r.exists(*self._keys(*keys))

    def expire(self, key: str, time: int) -> bool:
        return self._r.expire(self._key(key), time)

    def ttl(self, key: str) -> int:
        return self._r.ttl(self._key(key))

    def hset(self, name: str, mapping: dict = None, **kwargs):
        return self._r.hset(self._key(name), mapping=mapping, **kwargs)

    def hget(self, name: str, key: str) -> Optional[bytes]:
        return self._r.hget(self._key(name), key)

    def hgetall(self, name: str) -> dict:
        return self._r.hgetall(self._key(name))

    def incr(self, name: str, amount: int = 1) -> int:
        return self._r.incr(self._key(name), amount)

    def lpush(self, name: str, *values) -> int:
        return self._r.lpush(self._key(name), *values)

    def lrange(self, name: str, start: int, end: int) -> list:
        return self._r.lrange(self._key(name), start, end)

    def scan_tenant_keys(self, pattern: str = '*', count: int = 100):
        """Scan only keys belonging to this tenant."""
        full_pattern = f"{self._prefix}{pattern}"
        cursor = 0
        while True:
            cursor, keys = self._r.scan(cursor, match=full_pattern, count=count)
            for key in keys:
                # Strip the tenant prefix before returning
                yield key.decode().removeprefix(self._prefix)
            if cursor == 0:
                break

    def delete_all_tenant_keys(self) -> int:
        """Delete all keys for this tenant."""
        deleted = 0
        cursor = 0
        while True:
            cursor, keys = self._r.scan(cursor, match=f"{self._prefix}*", count=1000)
            if keys:
                deleted += self._r.delete(*keys)
            if cursor == 0:
                break
        return deleted

# Factory function
def get_tenant_redis(tenant_id: str) -> TenantRedis:
    pool = redis.ConnectionPool(host='localhost', port=6379, max_connections=50)
    r = redis.Redis(connection_pool=pool)
    return TenantRedis(r, tenant_id)
```

### Usage in a Web Application

```python
from flask import Flask, request, g
import redis

app = Flask(__name__)
redis_pool = redis.ConnectionPool(host='localhost', port=6379)

def get_tenant_id():
    """Extract tenant ID from request context (JWT, subdomain, header, etc.)"""
    return request.headers.get('X-Tenant-ID', 'default')

@app.before_request
def setup_tenant_redis():
    tenant_id = get_tenant_id()
    base_redis = redis.Redis(connection_pool=redis_pool)
    g.redis = TenantRedis(base_redis, tenant_id)

@app.route('/cache/<key>')
def get_cached_value(key):
    value = g.redis.get(key)
    return {'key': key, 'value': value.decode() if value else None}

@app.route('/cache/<key>', methods=['POST'])
def set_cached_value(key):
    value = request.json.get('value')
    g.redis.set(key, value, ex=3600)
    return {'status': 'ok'}
```

## Node.js Implementation

```javascript
class TenantRedis {
  constructor(redisClient, tenantId) {
    this.redis = redisClient;
    this.tenantId = tenantId;
    this.prefix = `tenant:${tenantId}:`;
  }

  _key(key) {
    return `${this.prefix}${key}`;
  }

  async get(key) {
    return this.redis.get(this._key(key));
  }

  async set(key, value, exSeconds = null) {
    if (exSeconds) {
      return this.redis.set(this._key(key), value, 'EX', exSeconds);
    }
    return this.redis.set(this._key(key), value);
  }

  async del(...keys) {
    return this.redis.del(...keys.map(k => this._key(k)));
  }

  async hset(name, mapping) {
    return this.redis.hset(this._key(name), mapping);
  }

  async hgetall(name) {
    return this.redis.hgetall(this._key(name));
  }

  async deleteAllTenantKeys() {
    let cursor = '0';
    let deleted = 0;
    do {
      const [newCursor, keys] = await this.redis.scan(
        cursor, 'MATCH', `${this.prefix}*`, 'COUNT', 1000
      );
      cursor = newCursor;
      if (keys.length > 0) {
        deleted += await this.redis.del(...keys);
      }
    } while (cursor !== '0');
    return deleted;
  }
}

// Usage in Express
app.use((req, res, next) => {
  const tenantId = req.headers['x-tenant-id'] || 'default';
  req.tenantRedis = new TenantRedis(redis, tenantId);
  next();
});
```

## Per-Tenant Rate Limiting

Key prefixes work well for per-tenant rate limiting:

```python
import time
import os
import redis

r = redis.Redis()

def check_rate_limit(tenant_id: str, action: str, limit: int, window_seconds: int) -> bool:
    """
    Returns True if within rate limit, False if exceeded.
    """
    key = f"tenant:{tenant_id}:ratelimit:{action}"
    now = time.time()
    window_start = now - window_seconds
    # Use timestamp + random bytes as the member to ensure uniqueness
    member = f"{now}:{os.urandom(8).hex()}"

    pipe = r.pipeline()
    # Add current request with a unique member
    pipe.zadd(key, {member: now})
    # Remove old entries outside the window
    pipe.zremrangebyscore(key, 0, window_start)
    # Count requests in window
    pipe.zcard(key)
    # Set TTL
    pipe.expire(key, window_seconds + 1)
    results = pipe.execute()

    request_count = results[2]
    return request_count <= limit
```

## Per-Tenant Memory Usage Monitoring

```python
def get_tenant_memory_usage(tenant_id: str) -> dict:
    r = redis.Redis()
    prefix = f"tenant:{tenant_id}:"
    total_bytes = 0
    key_count = 0
    cursor = 0

    while True:
        cursor, keys = r.scan(cursor, match=f"{prefix}*", count=1000)
        for key in keys:
            size = r.memory_usage(key)
            if size:
                total_bytes += size
                key_count += 1
        if cursor == 0:
            break

    return {
        'tenant_id': tenant_id,
        'key_count': key_count,
        'total_bytes': total_bytes,
        'total_mb': round(total_bytes / 1024 / 1024, 2)
    }
```

## Limitations of Key Prefix Multi-Tenancy

- **No hard isolation** - a bug in one tenant's code can read another tenant's data if prefix logic is bypassed
- **No memory quotas** - one tenant can use all available Redis memory
- **Slow bulk operations** - scanning all keys for a tenant requires SCAN with a pattern match
- **No authentication separation** - all tenants share the same Redis password

For stronger isolation, consider using separate Redis databases (logical DBs 0-15), separate Redis instances, or Redis ACL with key patterns (Redis 6+).

## Redis ACL for Key Pattern Enforcement (Redis 6+)

```bash
# Create an ACL user that can only access tenant:company-a keys
redis-cli ACL SETUSER tenant-company-a on >password123 ~tenant:company-a:* +@all
```

This provides server-enforced key isolation in addition to application-level prefix logic.

## Summary

Implement multi-tenancy with Redis key prefixes by wrapping your Redis client in a `TenantRedis` class that automatically prepends a tenant-specific prefix to all keys. This provides logical isolation with minimal overhead. For security-critical deployments, combine key prefixes with Redis 6+ ACL users restricted to specific key patterns, and monitor per-tenant memory usage to prevent one tenant from monopolizing the shared Redis instance.
