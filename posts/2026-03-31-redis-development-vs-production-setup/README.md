# How to Set Up Redis for Development vs Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, DevOps, Configuration

Description: Learn the key differences between Redis development and production setups, covering security, persistence, memory limits, and monitoring configurations.

---

Redis configuration should differ significantly between development and production environments. Development prioritizes convenience while production demands security, reliability, and performance. This guide covers the key differences and how to manage them.

## Development Configuration

A minimal development `redis.conf`:

```text
# redis-dev.conf
port 6379
bind 127.0.0.1
protected-mode yes

# No password in dev (local only)
# requirepass ""

# No persistence overhead in dev
save ""
appendonly no

# Generous memory limit
maxmemory 512mb
maxmemory-policy allkeys-lru

# Debug-friendly logging
loglevel verbose
logfile ""

# Fast eviction for dev iteration
lazyfree-lazy-eviction yes
```

## Production Configuration

A hardened production `redis.conf`:

```text
# redis-prod.conf
port 6379
bind 10.0.1.5 127.0.0.1
protected-mode yes

# Strong password
requirepass "use-a-strong-random-password-here"

# TLS
tls-port 6380
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt

# Persistence
save 900 1
save 300 10
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Memory
maxmemory 6gb
maxmemory-policy volatile-lru

# Security
rename-command FLUSHALL ""
rename-command CONFIG ""
rename-command DEBUG ""

# Logging
loglevel notice
logfile /var/log/redis/redis.log
```

## Using Docker Compose for Both Environments

```yaml
# docker-compose.dev.yml
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --loglevel verbose
    volumes:
      - redis-dev-data:/data

volumes:
  redis-dev-data:
```

```yaml
# docker-compose.prod.yml
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    ports:
      - "127.0.0.1:6379:6379"
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-prod.conf:/etc/redis/redis.conf:ro
      - redis-prod-data:/data
    restart: always
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

volumes:
  redis-prod-data:
```

## Environment Variable Management

```bash
# .env.development
REDIS_URL=redis://localhost:6379
REDIS_DB=0

# .env.production
REDIS_URL=rediss://:strongpassword@redis.internal:6380/0
REDIS_TLS=true
REDIS_TIMEOUT=5000
REDIS_MAX_RETRIES=3
```

## Connection Settings Comparison

```text
Setting              | Development   | Production
---------------------|---------------|------------------
requirepass          | none          | strong password
bind                 | 127.0.0.1     | internal IP only
tls-port             | disabled      | enabled
maxmemory            | 512mb         | 80% of RAM
appendonly           | no            | yes
loglevel             | verbose       | notice
rename-command FLUSH | enabled       | disabled
slowlog-log-slower-than | 0 (log all) | 10000 (10ms)
```

## Summary

Development Redis should be lightweight with verbose logging and no authentication overhead, while production Redis requires TLS, strong passwords, renamed dangerous commands, AOF persistence, and memory limits. Use separate config files per environment and manage connection strings through environment variables to keep the differences explicit and auditable.
