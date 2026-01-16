# How to Run Redis in Docker for Development and Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Redis, Caching, Database, Containers

Description: Learn how to run Redis in Docker with persistence options, custom configuration, password authentication, and production-ready settings for caching and data storage.

---

Redis is the go-to choice for caching, session storage, and real-time data processing. Running it in Docker is straightforward for development but requires careful configuration for production use cases where data persistence and security matter.

## Quick Start

### Development (No Persistence)

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

### Production (With Persistence)

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine redis-server --appendonly yes --requirepass mysecretpassword
```

## Understanding Redis Persistence

Redis offers two persistence options:

| Method | Description | Use Case |
|--------|-------------|----------|
| **RDB** | Point-in-time snapshots | Backups, faster restarts |
| **AOF** | Append-only log of writes | Durability, minimal data loss |
| **Both** | RDB + AOF together | Maximum durability |
| **None** | Pure cache | Ephemeral caching only |

### RDB Snapshots

```bash
# Default RDB settings
docker run -d \
  -v redis-data:/data \
  redis:7-alpine redis-server \
    --save 900 1 \      # Save after 900 seconds if 1 key changed
    --save 300 10 \     # Save after 300 seconds if 10 keys changed
    --save 60 10000     # Save after 60 seconds if 10000 keys changed
```

### AOF Persistence

```bash
# Enable AOF with every-second sync
docker run -d \
  -v redis-data:/data \
  redis:7-alpine redis-server \
    --appendonly yes \
    --appendfsync everysec
```

AOF sync options:
- `always`: Sync after every write (slowest, safest)
- `everysec`: Sync every second (recommended)
- `no`: Let OS decide (fastest, risky)

## Docker Compose Configuration

### Development Setup

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    # No persistence - pure cache
```

### Production Setup with Persistence

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --appendonly yes
      --appendfsync everysec
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 768M
    networks:
      - backend

networks:
  backend:
    internal: true

volumes:
  redis-data:
```

### With Custom Configuration File

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: redis
    command: redis-server /usr/local/etc/redis/redis.conf
    volumes:
      - ./redis.conf:/usr/local/etc/redis/redis.conf:ro
      - redis-data:/data
    ports:
      - "6379:6379"

volumes:
  redis-data:
```

## Custom Redis Configuration

Create a `redis.conf` file for detailed configuration.

```ini
# redis.conf

# Network
bind 0.0.0.0
port 6379
protected-mode yes

# Authentication
requirepass your-secure-password

# Memory management
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence - AOF
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Persistence - RDB
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes

# Logging
loglevel notice

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 128

# Client output buffer limits
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
```

## Memory Management

### Eviction Policies

| Policy | Description |
|--------|-------------|
| `noeviction` | Return error when memory limit reached |
| `allkeys-lru` | Evict least recently used keys |
| `volatile-lru` | Evict LRU keys with expiration |
| `allkeys-random` | Evict random keys |
| `volatile-random` | Evict random keys with expiration |
| `volatile-ttl` | Evict keys with shortest TTL |
| `allkeys-lfu` | Evict least frequently used keys |

### Cache Configuration

```bash
# Pure cache - evict when full, no persistence
docker run -d \
  redis:7-alpine redis-server \
    --maxmemory 256mb \
    --maxmemory-policy allkeys-lru \
    --save "" \
    --appendonly no
```

### Data Store Configuration

```bash
# Persistent data store - error on full, keep all data
docker run -d \
  -v redis-data:/data \
  redis:7-alpine redis-server \
    --maxmemory 1gb \
    --maxmemory-policy noeviction \
    --appendonly yes
```

## Authentication

### Basic Password Authentication

```yaml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
```

Connect with password:
```bash
# CLI
redis-cli -a yourpassword

# From application
redis://default:yourpassword@redis:6379/0
```

### Redis 6+ ACL (Access Control Lists)

Create a users.acl file for granular permissions.

```
# users.acl
user default off
user admin on >adminpassword ~* &* +@all
user app on >apppassword ~app:* +@read +@write -@dangerous
user readonly on >readonlypassword ~* +@read -@write
```

```yaml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --aclfile /etc/redis/users.acl
    volumes:
      - ./users.acl:/etc/redis/users.acl:ro
```

## Connecting to Redis

### From Host

```bash
# Using redis-cli
docker exec -it redis redis-cli

# With authentication
docker exec -it redis redis-cli -a yourpassword

# One-off command
docker exec redis redis-cli -a yourpassword INFO server
```

### From Another Container

```yaml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass secret
    networks:
      - app-network

  app:
    image: my-app
    environment:
      REDIS_URL: redis://default:secret@redis:6379/0
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - app-network

networks:
  app-network:
```

### Connection Strings

```
# Basic
redis://redis:6379

# With password
redis://default:password@redis:6379

# With database number
redis://default:password@redis:6379/1

# TLS/SSL
rediss://default:password@redis:6379
```

## Health Checks

```yaml
services:
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 5s

  # With password
  redis-auth:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
```

## Backup and Restore

### Manual Backup

```bash
# Trigger RDB save
docker exec redis redis-cli BGSAVE

# Copy RDB file
docker cp redis:/data/dump.rdb ./backup-dump.rdb

# Copy AOF file
docker cp redis:/data/appendonly.aof ./backup-appendonly.aof
```

### Restore from Backup

```bash
# Stop Redis
docker stop redis

# Copy backup to volume
docker run --rm \
  -v redis-data:/data \
  -v $(pwd):/backup \
  alpine cp /backup/dump.rdb /data/

# Start Redis
docker start redis
```

### Automated Backups

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

  backup:
    image: redis:7-alpine
    volumes:
      - redis-data:/data:ro
      - ./backups:/backups
    entrypoint: |
      sh -c 'while true; do
        cp /data/dump.rdb /backups/dump-$$(date +%Y%m%d-%H%M%S).rdb 2>/dev/null || true
        cp /data/appendonly.aof /backups/aof-$$(date +%Y%m%d-%H%M%S).aof 2>/dev/null || true
        find /backups -name "*.rdb" -mtime +7 -delete
        find /backups -name "*.aof" -mtime +7 -delete
        sleep 3600
      done'

volumes:
  redis-data:
```

## Redis Cluster in Docker

For high availability, run Redis in cluster mode.

```yaml
version: '3.8'

services:
  redis-1:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis-1-data:/data
    networks:
      - redis-cluster

  redis-2:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis-2-data:/data
    networks:
      - redis-cluster

  redis-3:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis-3-data:/data
    networks:
      - redis-cluster

networks:
  redis-cluster:

volumes:
  redis-1-data:
  redis-2-data:
  redis-3-data:
```

Initialize cluster:
```bash
docker exec -it redis-1 redis-cli --cluster create \
  redis-1:6379 redis-2:6379 redis-3:6379 \
  --cluster-replicas 0
```

## Monitoring

### Built-in Commands

```bash
# Server info
docker exec redis redis-cli INFO

# Memory usage
docker exec redis redis-cli INFO memory

# Connected clients
docker exec redis redis-cli CLIENT LIST

# Slow queries
docker exec redis redis-cli SLOWLOG GET 10

# Real-time commands
docker exec redis redis-cli MONITOR
```

### Key Metrics to Monitor

| Metric | Command | Warning Sign |
|--------|---------|--------------|
| Memory used | `INFO memory` | Approaching maxmemory |
| Connected clients | `INFO clients` | Sudden spike |
| Cache hit rate | `INFO stats` | Low keyspace_hits ratio |
| Evicted keys | `INFO stats` | High evicted_keys |
| Blocked clients | `INFO clients` | blocked_clients > 0 |

## Summary

| Use Case | Persistence | maxmemory-policy | Configuration |
|----------|-------------|------------------|---------------|
| Development cache | None | allkeys-lru | Default |
| Production cache | RDB only | allkeys-lru | Snapshots every hour |
| Session storage | AOF | noeviction | appendfsync everysec |
| Message queue | AOF | noeviction | appendfsync always |
| Full database | RDB + AOF | noeviction | Both enabled |

Redis in Docker is straightforward for development. For production, enable appropriate persistence, set memory limits, configure authentication, and implement regular backups based on your durability requirements.
