# How to Handle Redis in a Multi-Service Docker Compose Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Docker, Docker Compose, Microservice, DevOps

Description: Configure Redis in a Docker Compose stack so multiple services share it reliably, with health checks, named volumes, and separate logical databases per service.

---

When running multiple services with Docker Compose, sharing a single Redis instance is common. A poorly configured setup leads to port conflicts, missed health checks, and services starting before Redis is ready. Here is how to do it correctly.

## Basic Multi-Service Compose

```yaml
services:
  redis:
    image: redis:7.2-alpine
    restart: unless-stopped
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 10s

  api:
    build: ./api
    depends_on:
      redis:
        condition: service_healthy
    environment:
      REDIS_URL: redis://redis:6379/0

  worker:
    build: ./worker
    depends_on:
      redis:
        condition: service_healthy
    environment:
      REDIS_URL: redis://redis:6379/1

volumes:
  redis_data:
```

Using `condition: service_healthy` ensures services only start after `redis-cli ping` succeeds, not just after the container starts.

## Separate Logical Databases per Service

Redis supports 16 logical databases (0-15). Assign one per service to namespace keys:

| Service | DB | URL |
|---|---|---|
| api | 0 | redis://redis:6379/0 |
| worker | 1 | redis://redis:6379/1 |
| session | 2 | redis://redis:6379/2 |

This prevents key collisions without running separate Redis instances.

```python
import redis

# In api service
r_api = redis.Redis.from_url("redis://redis:6379/0")

# In worker service
r_worker = redis.Redis.from_url("redis://redis:6379/1")
```

## Persisted Volume for Durability

```yaml
volumes:
  redis_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/redis/data
```

Or let Docker manage it (simpler, data survives `docker compose down`):

```yaml
volumes:
  redis_data: {}
```

## Redis Config File Mount

For production-like settings, mount a config file:

```yaml
  redis:
    image: redis:7.2-alpine
    command: redis-server /usr/local/etc/redis/redis.conf
    volumes:
      - ./config/redis.conf:/usr/local/etc/redis/redis.conf
      - redis_data:/data
```

```text
# config/redis.conf
bind 0.0.0.0
protected-mode no
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
appendonly no
loglevel notice
```

## Adding a Redis Replica for Read Scaling

```yaml
  redis-replica:
    image: redis:7.2-alpine
    command: redis-server --replicaof redis 6379
    depends_on:
      redis:
        condition: service_healthy
```

## Connecting from Multiple Services

```python
import os
import redis

def get_redis():
    url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    return redis.Redis.from_url(url, decode_responses=True,
                                socket_connect_timeout=2,
                                socket_timeout=2,
                                retry_on_timeout=True)
```

## Summary

A reliable Docker Compose Redis setup requires a healthcheck on the Redis service, `condition: service_healthy` in all dependent services, and a named volume for persistence. Assign separate logical databases to each service to prevent key collisions without running multiple Redis instances. Mount a redis.conf for fine-grained memory and persistence control beyond the defaults.
