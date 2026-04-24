# How to Deploy Redis via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Redis, Cache, Key-Value Store, Self-Hosted

Description: Deploy Redis via Portainer as an in-memory cache and data structure store with persistence, authentication, and Redis Commander for web-based management.

## Introduction

Redis is an ultra-fast in-memory data structure store used as a cache, message broker, and session store. Deploying it via Portainer provides reliable configuration management, easy monitoring, and a visual interface through Redis Commander.

## Deploy as a Stack

In Portainer, create a stack named `redis`:

```yaml
services:
  redis:
    image: redis:7.2-alpine
    container_name: redis
    environment:
      REDISCLI_AUTH: your_redis_password
    command: >
      redis-server
      --requirepass your_redis_password
      --bind 0.0.0.0
      --save 900 1
      --save 300 10
      --save 60 10000
      --rdbcompression yes
      --rdbfilename dump.rdb
      --dir /data
      --appendonly yes
      --appendfilename appendonly.aof
      --appendfsync everysec
      --auto-aof-rewrite-percentage 100
      --auto-aof-rewrite-min-size 64mb
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --tcp-keepalive 300
      --timeout 0
      --loglevel notice
      --hz 10
      --lazyfree-lazy-eviction yes
      --lazyfree-lazy-expire yes
    volumes:
      # Persist Redis data to disk
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  # Redis Commander - web-based Redis management
  redis-commander:
    image: ghcr.io/joeferner/redis-commander:latest
    container_name: redis-commander
    user: redis
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: your_redis_password
      REDIS_DB: 0
      HTTP_USER: admin
      HTTP_PASSWORD: commander_password
    ports:
      - "8081:8081"
    depends_on:
      - redis
    restart: unless-stopped

volumes:
  redis_data:
```

## Redis Configuration

The stack above passes the equivalent of these Redis settings directly to `redis-server`:

```conf
# redis.conf

# Authentication

requirepass your_redis_password

# Bind to all interfaces (adjust for production)
bind 0.0.0.0

# Persistence settings
# RDB snapshots
save 900 1       # Save if 1 key changed in 900 seconds
save 300 10      # Save if 10 keys changed in 300 seconds
save 60 10000    # Save if 10000 keys changed in 60 seconds
rdbcompression yes
rdbfilename dump.rdb
dir /data

# AOF (Append Only File) for durability
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec    # fsync every second (good balance)
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru    # Evict least recently used keys

# Connection settings
tcp-keepalive 300
timeout 0

# Logging
loglevel notice

# Performance
hz 10
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
```

## Connecting Applications to Redis

```yaml
services:
  webapp:
    image: myapp:latest
    environment:
      # Redis connection with authentication
      REDIS_URL: redis://:your_redis_password@redis:6379/0
      # Or individual settings
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: your_redis_password
      REDIS_DB: 0
```

## Common Redis Use Cases

### Session Storage

```bash
# Test session storage via redis-cli
docker exec -it redis redis-cli -a your_redis_password

# Set a session key with 1-hour expiry
SET session:user123 '{"userId":123,"role":"admin"}' EX 3600

# Get session
GET session:user123

# Check TTL
TTL session:user123
```

### Rate Limiting

```bash
# Simple per-IP rate-limit counter for a 60-second window
MULTI
INCR rate:192.168.1.1
EXPIRE rate:192.168.1.1 60
EXEC
```

### Pub/Sub Messaging

```bash
# Subscribe to a channel
SUBSCRIBE notifications

# Publish message (from another client)
PUBLISH notifications '{"type":"email","to":"user@example.com"}'
```

## Monitoring Redis

```bash
# Real-time stats via redis-cli
docker exec redis redis-cli -a your_redis_password INFO

# Monitor all commands in real-time
docker exec -it redis redis-cli -a your_redis_password MONITOR

# Check memory usage
docker exec redis redis-cli -a your_redis_password INFO memory
```

## Conclusion

Redis deployed via Portainer provides an ultra-fast caching layer for your applications. The persistent volume with AOF enabled ensures data survives container restarts. Redis Commander gives you visual access to explore keys and data structures, while the healthcheck gives you a quick readiness signal for the Redis container.
