# How to Deploy Memcached in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Memcached, Caching, Performance, DevOps

Description: Learn how to deploy Memcached in Docker for high-performance caching, configure memory limits, and integrate with applications.

---

Memcached is a high-performance, distributed memory caching system. This guide covers deploying Memcached in Docker with proper configuration for development and production environments.

## Basic Setup

### Quick Start

```bash
docker run -d --name memcached -p 11211:11211 memcached
```

### Docker Compose

```yaml
version: '3.8'

services:
  memcached:
    image: memcached:1.6-alpine
    ports:
      - "11211:11211"
    command: memcached -m 256
```

## Configuration Options

### Memory and Connections

```yaml
services:
  memcached:
    image: memcached:1.6-alpine
    command: >
      memcached
      -m 512
      -c 1024
      -t 4
      -I 2m

# Options:
# -m 512   : 512MB memory
# -c 1024  : Max 1024 connections
# -t 4     : 4 threads
# -I 2m    : Max item size 2MB
```

### Production Configuration

```yaml
version: '3.8'

services:
  memcached:
    image: memcached:1.6-alpine
    restart: unless-stopped
    ports:
      - "11211:11211"
    command: >
      memcached
      -m 1024
      -c 2048
      -t 4
      -I 5m
      -v
    deploy:
      resources:
        limits:
          memory: 1536M
        reservations:
          memory: 1024M
    healthcheck:
      test: echo stats | nc localhost 11211
      interval: 30s
      timeout: 5s
      retries: 3
```

## Multiple Instances

```yaml
version: '3.8'

services:
  memcached1:
    image: memcached:1.6-alpine
    command: memcached -m 512

  memcached2:
    image: memcached:1.6-alpine
    command: memcached -m 512

  app:
    image: myapp:latest
    environment:
      - MEMCACHED_SERVERS=memcached1:11211,memcached2:11211
    depends_on:
      - memcached1
      - memcached2
```

## Complete Application Stack

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    networks:
      - frontend

  app:
    image: myapp:latest
    environment:
      - MEMCACHED_HOST=memcached
      - MEMCACHED_PORT=11211
      - DATABASE_URL=postgresql://postgres:secret@db:5432/myapp
    networks:
      - frontend
      - backend
    depends_on:
      - memcached
      - db

  memcached:
    image: memcached:1.6-alpine
    command: memcached -m 512 -c 1024 -t 4
    networks:
      - backend
    deploy:
      resources:
        limits:
          memory: 768M

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - backend

networks:
  frontend:
  backend:

volumes:
  pgdata:
```

## Testing Connection

```bash
# Using telnet
telnet localhost 11211
stats
quit

# Using nc
echo "stats" | nc localhost 11211

# Set a value
echo -e "set mykey 0 3600 5\r\nhello\r" | nc localhost 11211

# Get a value
echo "get mykey" | nc localhost 11211
```

## Summary

| Option | Default | Description |
|--------|---------|-------------|
| -m | 64 | Memory in MB |
| -c | 1024 | Max connections |
| -t | 4 | Threads |
| -I | 1m | Max item size |
| -p | 11211 | TCP port |

Memcached provides simple, high-performance caching. Use appropriate memory limits and multiple instances for high availability. For persistent caching needs, consider Redis instead as described in our post on [Running Redis in Docker](https://oneuptime.com/blog/post/2026-01-14-docker-redis-setup/view).

