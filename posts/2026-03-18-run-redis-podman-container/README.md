# How to Run Redis in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Redis, Cache, In-Memory Database

Description: Learn how to run Redis in a Podman container with persistence, custom configuration, and password authentication.

---

> Redis in Podman delivers a blazing-fast in-memory data store in a secure, rootless container with optional persistence.

Redis is an in-memory data structure store used as a database, cache, message broker, and queue. Running it in a Podman container gives you instant access to a Redis instance with clean isolation, easy configuration, and rootless security. This guide covers basic setup, persistence options, custom configuration, and common Redis operations.

---

## Pulling the Redis Image

Download the official Redis image.

```bash
# Pull the Redis 7 image

podman pull docker.io/library/redis:7

# Verify the image
podman images | grep redis
```

## Running a Basic Redis Container

Start Redis with default settings.

```bash
# Run Redis in detached mode
podman run -d \
  --name my-redis \
  -p 6379:6379 \
  docker.io/library/redis:7

# Confirm the container is running
podman ps

# Test the connection with a PING command
podman exec -it my-redis redis-cli PING
```

## Enabling Password Authentication

Protect your Redis instance with a password.

```bash
# Run Redis with a password using the --requirepass flag
podman run -d \
  --name redis-secure \
  -p 6380:6379 \
  docker.io/library/redis:7 redis-server --requirepass my-redis-password

# Connect with authentication
podman exec -it redis-secure redis-cli -a my-redis-password PING
```

## Persistent Data Storage

Configure Redis to persist data to disk using a named volume.

```bash
# Create a volume for Redis data
podman volume create redis-data

# Run Redis with persistence enabled (AOF mode)
podman run -d \
  --name redis-persistent \
  -p 6381:6379 \
  -v redis-data:/data:Z \
  docker.io/library/redis:7 redis-server --appendonly yes

# Verify data persistence by writing and reading a key
podman exec -it redis-persistent redis-cli SET testkey "hello from podman"
podman exec -it redis-persistent redis-cli GET testkey

# Restart the container and verify data survives
podman restart redis-persistent
podman exec -it redis-persistent redis-cli GET testkey
```

## Custom Redis Configuration

Mount a custom redis.conf for fine-grained control.

```bash
# Create a config directory
mkdir -p ~/redis-config

# Write a custom Redis configuration
cat > ~/redis-config/redis.conf <<'EOF'
# Network
bind 0.0.0.0
port 6379
tcp-backlog 511

# Authentication
requirepass my-redis-password

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence - AOF
appendonly yes
appendfsync everysec

# Persistence - RDB snapshots
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice

# Performance
tcp-keepalive 300
timeout 0
EOF

# Run Redis with the custom configuration
podman run -d \
  --name redis-custom \
  -p 6382:6379 \
  -v ~/redis-config/redis.conf:/usr/local/etc/redis/redis.conf:Z \
  -v redis-data:/data:Z \
  docker.io/library/redis:7 redis-server /usr/local/etc/redis/redis.conf

# Verify the configuration is loaded
podman exec -it redis-custom redis-cli -a my-redis-password CONFIG GET maxmemory
```

## Common Redis Operations

Perform typical Redis operations from the command line.

```bash
# Set and get string values
podman exec -it my-redis redis-cli SET user:1:name "Alice"
podman exec -it my-redis redis-cli GET user:1:name

# Work with lists
podman exec -it my-redis redis-cli LPUSH queue:tasks "task1" "task2" "task3"
podman exec -it my-redis redis-cli LRANGE queue:tasks 0 -1

# Check memory usage
podman exec -it my-redis redis-cli INFO memory

# Monitor commands in real time (press Ctrl+C to exit)
# podman exec -it my-redis redis-cli MONITOR

# Get server information
podman exec -it my-redis redis-cli INFO server
```

## Managing the Container

Routine management commands.

```bash
# View Redis logs
podman logs my-redis

# Trigger a manual RDB snapshot
podman exec -it my-redis redis-cli BGSAVE

# Stop and start
podman stop my-redis
podman start my-redis

# Remove containers and volumes
podman rm -f my-redis redis-secure redis-persistent redis-custom
podman volume rm redis-data
```

## Summary

Running Redis in a Podman container gives you a fast, isolated in-memory data store that is simple to configure and manage. Password authentication secures access, AOF and RDB persistence ensure data durability, and custom configuration files let you tune memory limits and eviction policies. Podman's rootless execution adds another layer of protection for your Redis instance. This setup works well for caching layers, session stores, message queues, and any application that benefits from low-latency data access.
