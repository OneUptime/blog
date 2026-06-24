# How to Deploy Redis as a Cache Layer via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cache, Portainer, Docker, Performance, Caching, Database

Description: Deploy Redis as a high-performance in-memory cache layer alongside your application using Portainer stacks, with persistence, authentication, and eviction policy configuration.

---

Redis is the most widely-used in-memory data store for caching. Deploying it via Portainer as a cache layer reduces database load and improves response times across your entire application stack.

## Step 1: Deploy Redis Cache Stack

```yaml
# redis-cache-stack.yml

services:
  redis:
    image: redis:7.2-alpine
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD:-changeme}
      --maxmemory ${REDIS_MAX_MEMORY:-256mb}
      --maxmemory-policy allkeys-lru
      --appendonly no
      --save ""
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD:-changeme}", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    networks:
      - cache-net

  # Your application
  webapp:
    image: myapp:1.2.3
    environment:
      - REDIS_URL=redis://:${REDIS_PASSWORD:-changeme}@redis:6379/0
      - CACHE_TTL_SECONDS=300
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - cache-net

volumes:
  redis-data:

networks:
  cache-net:
    driver: bridge
```

## Step 2: Configure Eviction Policies

Choose the right eviction policy for your caching use case:

| Policy | Behavior | Best For |
|--------|----------|----------|
| `allkeys-lru` | Evict least recently used keys | General caching |
| `volatile-lru` | Evict LRU keys with TTL set | Session store |
| `allkeys-lfu` | Evict least frequently used | Content caching |
| `noeviction` | Return error when full | Not for caching |

```yaml
command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

## Step 3: Use Redis from Your Application

```python
# cache.py - caching layer using Redis
import redis
import json
import os
from functools import wraps

# Connect to the Portainer-deployed Redis
r = redis.from_url(
    os.environ["REDIS_URL"],
    decode_responses=True
)

def cache_result(ttl_seconds=300):
    """Decorator that caches function results in Redis."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create a unique cache key from function name and arguments
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Try to get from cache first
            cached = r.get(cache_key)
            if cached:
                return json.loads(cached)
            
            # Not in cache - compute and store
            result = func(*args, **kwargs)
            r.setex(cache_key, ttl_seconds, json.dumps(result))
            return result
        return wrapper
    return decorator

@cache_result(ttl_seconds=60)
def get_user_profile(user_id):
    """This result is cached for 60 seconds."""
    return database.query(f"SELECT * FROM users WHERE id = {user_id}")
```

## Step 4: Redis Sentinel for High Availability

For production high-availability Redis, run at least three Sentinel instances and ensure your writable `sentinel.conf` includes the appropriate `sentinel monitor` and `sentinel auth-pass` directives for your deployment:

```yaml
# Redis Sentinel example service definitions
services:
  redis-primary:
    image: redis:7.2-alpine
    command: redis-server --requirepass password --masterauth password
    networks:
      - redis-ha

  redis-replica:
    image: redis:7.2-alpine
    command: redis-server --replicaof redis-primary 6379 --requirepass password --masterauth password
    depends_on:
      - redis-primary
    networks:
      - redis-ha

  redis-sentinel:
    image: redis:7.2-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - /opt/redis/sentinel.conf:/etc/redis/sentinel.conf
    networks:
      - redis-ha
```

## Monitoring Redis

Use the Redis CLI or RedisInsight for monitoring:

```bash
# From Portainer's container console
redis-cli -a password info stats | grep -E "keyspace_hits|keyspace_misses"

# Calculate cache hit rate
# hit_rate = keyspace_hits / (keyspace_hits + keyspace_misses)
```

Deploy RedisInsight for a visual monitoring UI:

```yaml
  redisinsight:
    image: redis/redisinsight:latest
    ports:
      - "5540:5540"
```

## Summary

Redis deployed via Portainer provides a high-performance cache layer that reduces database load and improves application response times. Use the `allkeys-lru` eviction policy for general-purpose caching, set a memory limit appropriate for your host, and monitor cache hit rates to validate caching effectiveness.
