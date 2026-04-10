# How to Set Up Redis Sentinel with Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Docker

Description: Learn how to set up Redis Sentinel with Docker Compose for automatic failover, covering a primary-replica-sentinel topology with health checks and client configuration.

---

Redis Sentinel provides high availability through automatic failover. This guide shows how to set up a complete Redis Sentinel deployment using Docker Compose with one primary, two replicas, and three sentinels.

## Architecture Overview

```text
redis-primary:6379  <-- writes
redis-replica-1:6379 \
redis-replica-2:6379  -- reads (optional)

sentinel-1:26379 \
sentinel-2:26379  -- monitors primary, votes on failover
sentinel-3:26379 /
```

## Configuration Files

Primary configuration:

```text
# redis-primary.conf
bind 0.0.0.0
port 6379
requirepass redispassword
masterauth redispassword
```

Replica configuration:

```text
# redis-replica.conf
bind 0.0.0.0
port 6379
requirepass redispassword
masterauth redispassword
replicaof redis-primary 6379
```

Sentinel configuration:

```text
# sentinel.conf
port 26379
sentinel monitor mymaster redis-primary 6379 2
sentinel auth-pass mymaster redispassword
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

## Docker Compose Setup

```yaml
# docker-compose.yml
version: "3.8"

services:
  redis-primary:
    image: redis:7-alpine
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-primary.conf:/etc/redis/redis.conf
      - redis-primary-data:/data
    networks:
      - redis-net
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "redispassword", "PING"]
      interval: 10s
      timeout: 3s
      retries: 3

  redis-replica-1:
    image: redis:7-alpine
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-replica.conf:/etc/redis/redis.conf
    networks:
      - redis-net
    depends_on:
      redis-primary:
        condition: service_healthy

  redis-replica-2:
    image: redis:7-alpine
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-replica.conf:/etc/redis/redis.conf
    networks:
      - redis-net
    depends_on:
      redis-primary:
        condition: service_healthy

  sentinel-1:
    image: redis:7-alpine
    command: sh -c "cp /etc/redis/sentinel.conf /tmp/sentinel.conf && redis-sentinel /tmp/sentinel.conf"
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf:ro
    ports:
      - "26379:26379"
    networks:
      - redis-net
    depends_on:
      - redis-primary
      - redis-replica-1
      - redis-replica-2

  sentinel-2:
    image: redis:7-alpine
    command: sh -c "cp /etc/redis/sentinel.conf /tmp/sentinel.conf && redis-sentinel /tmp/sentinel.conf"
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf:ro
    ports:
      - "26380:26379"
    networks:
      - redis-net

  sentinel-3:
    image: redis:7-alpine
    command: sh -c "cp /etc/redis/sentinel.conf /tmp/sentinel.conf && redis-sentinel /tmp/sentinel.conf"
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf:ro
    ports:
      - "26381:26379"
    networks:
      - redis-net

networks:
  redis-net:
    driver: bridge

volumes:
  redis-primary-data:
```

## Starting and Verifying

```bash
# Start the deployment
docker compose up -d

# Check all services are running
docker compose ps

# Verify primary is recognized
docker compose exec sentinel-1 redis-cli -p 26379 SENTINEL masters

# Check replicas are connected
docker compose exec redis-primary redis-cli -a redispassword INFO replication
```

## Testing Failover

```bash
# Stop the primary to trigger failover
docker compose stop redis-primary

# Watch sentinel elect new primary (within 5-10 seconds)
docker compose exec sentinel-1 redis-cli -p 26379 SENTINEL master mymaster | grep -E "^ip$" -A 1
```

## Client Connection

Connect via Sentinel (Python example):

```python
from redis.sentinel import Sentinel

sentinel = Sentinel(
    [("localhost", 26379), ("localhost", 26380), ("localhost", 26381)],
    socket_timeout=0.1,
    password="redispassword"
)

master = sentinel.master_for("mymaster", password="redispassword")
replica = sentinel.slave_for("mymaster", password="redispassword")

master.set("key", "value")
replica.get("key")
```

## Summary

A Redis Sentinel setup with Docker Compose requires one primary, at least one replica, and an odd number (minimum 3) of sentinels for quorum. Use `depends_on` with health checks to ensure startup order, and test failover by stopping the primary container to verify automatic promotion works before deploying to production.
