# How to Install Redis on Alpine Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Installation, Alpine Linux, Docker, Container

Description: Install and configure Redis on Alpine Linux using apk, covering both direct installation and container-based setups in minimal Alpine environments.

---

Alpine Linux is a minimal, security-focused distribution commonly used as the base for Docker containers. Redis is available directly from Alpine's package repository, and installation takes seconds because Alpine has no unnecessary dependencies to resolve.

## Install Redis

```bash
# Update the package index
apk update

# Install Redis
apk add redis

# Verify
redis-server --version
# Redis server v=7.x.x
```

## Start Redis

Alpine uses OpenRC rather than systemd:

```bash
# Start Redis now
rc-service redis start

# Enable Redis to start at boot
rc-update add redis default

# Check status
rc-service redis status
```

## Verify the Installation

```bash
redis-cli ping
# PONG

redis-cli info server | grep redis_version
```

## Configuration File

The default config is at `/etc/redis.conf`:

```bash
vi /etc/redis.conf
```

Key settings for Alpine-based deployments:

```text
bind 127.0.0.1
port 6379
logfile /var/log/redis/redis.log
loglevel notice
save ""
appendonly no
```

Create the log directory if it does not exist:

```bash
mkdir -p /var/log/redis
chown redis:redis /var/log/redis
```

Restart after changes:

```bash
rc-service redis restart
```

## Alpine-Based Docker Container

When building a custom Redis image from Alpine:

```dockerfile
FROM alpine:3.21

RUN apk add --no-cache redis

# Copy a custom config
COPY redis.conf /etc/redis.conf

# Create data directory
RUN mkdir -p /data && chown redis:redis /data

USER redis

EXPOSE 6379

CMD ["redis-server", "/etc/redis.conf"]
```

Build and run:

```bash
docker build -t my-redis .
docker run -d -p 6379:6379 --name redis my-redis
```

## Using the Official Redis Docker Image (Recommended)

For containers, the official Redis image provides an Alpine-based variant. Use it directly rather than building your own:

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine
```

The `-alpine` tag gives you the smallest possible image size (around 30 MB vs 110 MB for the Debian-based image).

## Running Redis in a Docker Compose Stack on Alpine

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --save 60 1 --loglevel warning

volumes:
  redis-data:
```

## Upgrading Redis on Alpine

```bash
apk update
apk upgrade redis
rc-service redis restart
```

## Summary

On Alpine Linux, install Redis with `apk add redis` and manage it through OpenRC using `rc-service` and `rc-update`. For containerized workloads, use the official `redis:7-alpine` Docker image rather than building from scratch - it is the smallest production-ready Redis image available and maintained by the Redis team.
