# How to Configure Redis in Docker with Custom redis.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Docker, Configuration

Description: Learn how to pass a custom redis.conf to a Redis Docker container using volume mounts, command overrides, and environment variable substitution for flexible deployments.

---

The official Redis Docker image supports custom configuration through volume mounts and command-line arguments. This guide covers the different methods for injecting your `redis.conf` into a Redis container.

## Method 1: Volume Mount

Mount your local `redis.conf` directly into the container:

```yaml
# docker-compose.yml
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - ./redis.conf:/usr/local/etc/redis/redis.conf
      - redis-data:/data
    command: redis-server /usr/local/etc/redis/redis.conf

volumes:
  redis-data:
```

Your local `redis.conf`:

```text
bind 0.0.0.0
protected-mode no
port 6379
maxmemory 512mb
maxmemory-policy allkeys-lru
appendonly yes
loglevel notice
```

## Method 2: Override Individual Settings via Command

Override specific settings without a full config file:

```yaml
services:
  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --maxmemory 1gb
      --maxmemory-policy allkeys-lru
      --appendonly yes
      --requirepass mysecretpassword
```

## Method 3: Environment Variable Substitution

Use `envsubst` in an entrypoint script for dynamic configuration:

```bash
#!/bin/sh
# redis-entrypoint.sh
export REDIS_PASSWORD="${REDIS_PASSWORD:-}"
export REDIS_MAXMEMORY="${REDIS_MAXMEMORY:-2gb}"
export REDIS_MAXMEMORY_POLICY="${REDIS_MAXMEMORY_POLICY:-volatile-lru}"
export REDIS_APPENDONLY="${REDIS_APPENDONLY:-yes}"
export REDIS_LOGLEVEL="${REDIS_LOGLEVEL:-notice}"
envsubst < /etc/redis/redis.conf.template > /etc/redis/redis.conf
exec redis-server /etc/redis/redis.conf "$@"
```

Template file:

```text
# redis.conf.template
bind 0.0.0.0
port 6379
requirepass ${REDIS_PASSWORD}
maxmemory ${REDIS_MAXMEMORY}
maxmemory-policy ${REDIS_MAXMEMORY_POLICY}
appendonly ${REDIS_APPENDONLY}
loglevel ${REDIS_LOGLEVEL}
```

Docker setup:

```dockerfile
FROM redis:7-alpine
RUN apk add --no-cache gettext
COPY redis.conf.template /etc/redis/redis.conf.template
COPY redis-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/redis-entrypoint.sh
ENTRYPOINT ["redis-entrypoint.sh"]
```

## Method 4: Docker Config (Swarm)

For Docker Swarm deployments:

```yaml
# docker-compose.swarm.yml
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    command: redis-server /run/configs/redis.conf
    configs:
      - source: redis_config
        target: /run/configs/redis.conf

configs:
  redis_config:
    file: ./redis.conf
```

## Verifying Configuration Was Applied

```bash
# Check which config Redis is using
docker exec -it redis-container redis-cli CONFIG GET maxmemory
docker exec -it redis-container redis-cli CONFIG GET appendonly
docker exec -it redis-container redis-cli CONFIG GET requirepass

# View all config
docker exec -it redis-container redis-cli CONFIG GET "*"

# Check Redis loaded the file correctly
docker logs redis-container | grep "Configuration loaded"
```

## Combining Config File and CLI Overrides

CLI arguments override config file values:

```yaml
services:
  redis:
    image: redis:7-alpine
    volumes:
      - ./redis.conf:/etc/redis/redis.conf
    command: >
      redis-server /etc/redis/redis.conf
      --loglevel verbose
      --maxmemory 2gb
    # loglevel and maxmemory override whatever is in redis.conf
```

## Summary

Redis in Docker supports custom configuration through volume-mounted config files, CLI argument overrides, and environment variable substitution in template-based configs. Volume mounting is the simplest approach for most use cases, while template substitution enables fully dynamic configuration from environment variables. Always verify your configuration was applied by querying `CONFIG GET` after container startup.
