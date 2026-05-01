# How to Deploy Redis as a Cache Layer via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Redis, Caching, Docker, Performance

Description: Deploy Redis as a high-performance caching layer for your applications using Portainer with proper eviction policies and connection pooling.

## Introduction

Redis is an in-memory data structure store commonly used as a cache, session store, and message broker. This guide configures Redis specifically for caching workloads - setting appropriate eviction policies, memory limits, and connecting your application to use it.

## Prerequisites

- Portainer installed with Docker
- An application that needs caching (optional for testing)

## Step 1: Create the Redis Cache Stack

Navigate to **Stacks** > **Add Stack** and use the following configuration:

```yaml
# docker-compose.yml - Redis Cache Layer

services:
  redis:
    image: redis:7-alpine
    container_name: redis_cache
    restart: unless-stopped
    ports:
      - "6379:6379"
    command:
      - redis-server
      - --maxmemory
      - 512mb
      - --maxmemory-policy
      - allkeys-lru
      - --requirepass
      - ${REDIS_PASSWORD}
      - --appendonly
      - "no"
      - --save
      - ""
    volumes:
      - redis_cache_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - cache_net

  # Prometheus exporter for Redis metrics
  redis_exporter:
    image: oliver006/redis_exporter:latest
    container_name: redis_exporter
    restart: unless-stopped
    ports:
      - "9121:9121"
    environment:
      - REDIS_ADDR=redis://redis:6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    depends_on:
      - redis
    networks:
      - cache_net

volumes:
  redis_cache_data:

networks:
  cache_net:
    driver: bridge
```

Eviction policy notes:
- `allkeys-lru` - evict least recently used keys (best for pure caches)
- `volatile-lru` - only evict keys with TTL set
- `allkeys-lfu` - evict least frequently used keys (Redis 4+)

## Step 2: Configure Environment Variables

In Portainer's Stack editor, add environment variables:

```text
REDIS_PASSWORD=your-secure-password-here
```

## Step 3: Test the Cache

```bash
# Connect to Redis CLI inside the container
docker exec -it redis_cache redis-cli --pass your-secure-password-here

# In the Redis CLI
SET user:1000 '{"name":"Alice","email":"alice@example.com"}' EX 3600
GET user:1000
TTL user:1000

# From another shell, check memory usage
docker exec redis_cache redis-cli --pass your-secure-password-here INFO memory | grep used_memory_human

# From another shell, check hit rate
docker exec redis_cache redis-cli --pass your-secure-password-here INFO stats | grep -E "keyspace_hits|keyspace_misses"
```

## Step 4: Python Application Integration

```python
# pip install redis
import json
import os

import redis

r = redis.from_url(
    os.getenv("REDIS_URL", "redis://:your-secure-password-here@localhost:6379/0"),
    decode_responses=True
)

def fetch_user_from_database(user_id: int) -> dict:
    """Replace this stub with your database lookup."""
    return {"id": user_id, "name": "Alice", "email": "alice@example.com"}

def get_user(user_id: int) -> dict:
    """Get user with Redis caching."""
    cache_key = f"user:{user_id}"

    # Try cache first
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    # Cache miss - fetch from database
    user = fetch_user_from_database(user_id)

    # Store in cache for 1 hour
    r.setex(cache_key, 3600, json.dumps(user))
    return user

# Check if Redis is responding
r.ping()
```

## Step 5: Monitor Cache Performance

Configure Prometheus to scrape Redis metrics:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'redis'
    static_configs:
      - targets: ['redis_exporter:9121']
```

Key metrics to monitor:
- `redis_memory_used_bytes` vs `redis_memory_max_bytes` - memory pressure
- `redis_keyspace_hits_total` / `redis_keyspace_misses_total` - hit rate
- `redis_evicted_keys_total` - keys evicted due to memory limits
- `redis_connected_clients` - active connections

## Step 6: Connect Your App Container to the Cache

If your app runs in the same Portainer stack, connect it to the `cache_net` network:

```yaml
services:
  myapp:
    image: myapp:latest
    environment:
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
    networks:
      - cache_net
    depends_on:
      redis:
        condition: service_healthy
```

## Conclusion

Redis configured with `maxmemory` and `allkeys-lru` eviction is a strong default for application caching. Disable RDB persistence (`--save ""`) and AOF (`--appendonly no`) for pure cache workloads - this improves performance and reduces disk I/O. Always require authentication with `requirepass`. Monitor the hit rate and eviction rate to tune memory allocation - if the hit rate is lower than expected for your workload or eviction counts stay high, the cache may be too small or your eviction policy and TTLs may need tuning.
