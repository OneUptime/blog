# How to Deploy Redis via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Redis, Cache, Docker, Deployment

Description: Learn how to deploy Redis via Portainer with password authentication, persistent storage, and Redis Commander for browser-based management.

## Redis via Portainer Stack

**Stacks → Add Stack → redis**

```yaml
services:
  redis:
    image: redis:7.2-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis-commander:
    image: ghcr.io/joeferner/redis-commander:latest
    restart: unless-stopped
    ports:
      - "8082:8081"
    user: redis
    environment:
      - REDIS_HOSTS=local:redis:6379:0:${REDIS_PASSWORD}
    depends_on:
      redis:
        condition: service_healthy

volumes:
  redis_data:
```

## Environment Variables

```text
REDIS_PASSWORD = a-strong-redis-password
```

## Redis Configuration Options

Key Redis settings explained:

```text
--requirepass PASSWORD    : Enable authentication (always use in production)
--appendonly yes          : Enable AOF persistence (survives restart)
--maxmemory 256mb         : Memory limit for the cache
--maxmemory-policy allkeys-lru : Evict least recently used keys when full
--save 900 1              : RDB snapshot: save after 900s if 1 key changed
```

For a read-through cache (no persistence needed):

```yaml
command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}", "--maxmemory", "512mb", "--maxmemory-policy", "allkeys-lru", "--save", ""]
```

## Connecting from Application Services

```yaml
services:
  app:
    image: myapp:latest
    environment:
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
    depends_on:
      redis:
        condition: service_healthy
```

## Redis Operations via Portainer Console

```bash
# In the Redis container console in Portainer, run:
redis-cli -a "${REDIS_PASSWORD}"

# Test connection
PING
# Expected: PONG

# Set and get a key
SET mykey "hello"
GET mykey

# Set with expiry (30 seconds)
SET session:user123 '{"userId":123}' EX 30

# View all keys (avoid in production)
KEYS *

# Monitor commands in real time
MONITOR

# View memory info
INFO memory

# View server info
INFO server
```

## Common Redis Use Cases via Portainer

### Session Store for Web Apps

```yaml
services:
  app:
    environment:
      - SESSION_DRIVER=redis
      - SESSION_CONNECTION=redis://:${REDIS_PASSWORD}@redis:6379/1
```

### Queue Backend

```yaml
environment:
  - QUEUE_CONNECTION=redis
  - REDIS_HOST=redis
  - REDIS_PORT=6379
  - REDIS_PASSWORD=${REDIS_PASSWORD}
  - REDIS_QUEUE_DB=2    # Use DB 2 for queues
```

## Backup Redis Data

```bash
# Trigger RDB snapshot
docker exec <redis-container-name> redis-cli -a "${REDIS_PASSWORD}" BGSAVE

# Copy the RDB snapshot from the container
docker cp <redis-container-name>:/data/dump.rdb /backup/redis-dump-$(date +%Y%m%d).rdb

# If appendonly is enabled, also copy the AOF directory
docker cp <redis-container-name>:/data/appendonlydir /backup/redis-appendonly-$(date +%Y%m%d)

# Restore the matching RDB and AOF backup set
docker stop <redis-container-name>
docker cp /backup/redis-dump-20260320.rdb <redis-container-name>:/data/dump.rdb
docker cp /backup/redis-appendonly-20260320/. <redis-container-name>:/data/appendonlydir/
docker start <redis-container-name>
```

## Conclusion

Redis via Portainer is straightforward to set up for caching and session storage. The critical security setting is `--requirepass` - never expose Redis without a password. The `allkeys-lru` eviction policy is appropriate for caching workloads, while `noeviction` suits persistent data stores where you want errors rather than data loss under memory pressure.
