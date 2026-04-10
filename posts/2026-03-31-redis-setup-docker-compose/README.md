# How to Set Up Redis with Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Docker, Docker Compose, Container, Infrastructure

Description: Learn how to set up Redis using Docker Compose, including persistence, authentication, custom configuration, and connecting from application services.

---

## Introduction

Docker Compose is the fastest way to run Redis locally or in a single-host environment. It handles container lifecycle, networking, volume mounting, and environment variable injection with a single YAML file. This guide walks through a production-ready Redis Docker Compose setup.

## Basic Redis Service

```yaml
# docker-compose.yml
version: "3.9"
services:
  redis:
    image: redis:7.2-alpine
    container_name: redis
    ports:
      - "6379:6379"
    restart: unless-stopped
```

Start it:

```bash
docker compose up -d
docker compose exec redis redis-cli PING
# PONG
```

## Redis with Persistence (RDB + AOF)

```yaml
version: "3.9"
services:
  redis:
    image: redis:7.2-alpine
    container_name: redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: >
      redis-server
      --save 900 1
      --save 300 10
      --save 60 10000
      --appendonly yes
      --appendfsync everysec
    restart: unless-stopped

volumes:
  redis_data:
```

## Redis with Authentication

```yaml
version: "3.9"
services:
  redis:
    image: redis:7.2-alpine
    container_name: redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: >
      redis-server
      --requirepass your_strong_password
      --save 900 1
      --appendonly yes
    restart: unless-stopped

volumes:
  redis_data:
```

Connect with authentication:

```redis
redis-cli -a your_strong_password PING
# PONG
```

## Redis with Custom Config File

```yaml
version: "3.9"
services:
  redis:
    image: redis:7.2-alpine
    container_name: redis
    ports:
      - "6379:6379"
    volumes:
      - ./redis.conf:/usr/local/etc/redis/redis.conf
      - redis_data:/data
    command: redis-server /usr/local/etc/redis/redis.conf
    restart: unless-stopped

volumes:
  redis_data:
```

Example `redis.conf`:

```redis
bind 0.0.0.0
protected-mode no
requirepass your_strong_password
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
appendonly yes
appendfsync everysec
```

## Full Stack: App + Redis

```yaml
version: "3.9"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://:your_strong_password@redis:6379
    depends_on:
      redis:
        condition: service_healthy

  redis:
    image: redis:7.2-alpine
    container_name: redis
    volumes:
      - redis_data:/data
    command: >
      redis-server
      --requirepass your_strong_password
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "your_strong_password", "PING"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: unless-stopped

volumes:
  redis_data:
```

## Service Dependency Flow

```mermaid
flowchart LR
    App["App Container\n(depends_on redis healthy)"] --> Redis["Redis Container\n(healthcheck: PING)"]
    Redis --> Volume["Named Volume\n(redis_data)"]
```

## Useful Docker Compose Commands

```bash
# Start in background
docker compose up -d

# View Redis logs
docker compose logs -f redis

# Open Redis CLI
docker compose exec redis redis-cli

# Restart Redis
docker compose restart redis

# Stop and remove containers (keep volumes)
docker compose down

# Stop and remove containers AND volumes
docker compose down -v
```

## Exposing Redis on Specific Interface

To bind Redis only to localhost (avoid exposing to the host network):

```yaml
ports:
  - "127.0.0.1:6379:6379"
```

## Summary

Docker Compose makes it straightforward to run Redis with persistence, authentication, and custom configuration. Use named volumes for data durability, health checks for dependency ordering, and custom `redis.conf` for fine-grained tuning. For production single-host deployments, add `restart: unless-stopped` and monitor with `docker compose logs`.
