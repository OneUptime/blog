# How to Build a Custom Redis Docker Image

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Docker, DevOps

Description: Learn how to build a custom Redis Docker image with pre-baked configuration, custom modules, initialization scripts, and security hardening baked in.

---

Building a custom Redis Docker image lets you embed your organization's configuration, add modules like RedisJSON or RediSearch, and enforce security standards without relying on runtime configuration injection.

## Basic Custom Dockerfile

```dockerfile
FROM redis:7.2-alpine

# Install additional tools
RUN apk add --no-cache bash curl

# Copy pre-built configuration
COPY redis.conf /etc/redis/redis.conf

# Copy custom initialization script
COPY docker-entrypoint-init.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint-init.sh

# Ensure redis user can write environment config
RUN chown redis:redis /etc/redis

# Use non-root user
USER redis

EXPOSE 6379

ENTRYPOINT ["/usr/local/bin/docker-entrypoint-init.sh"]
```

## Pre-baked Configuration

Include a production-ready config:

```text
# redis.conf (embedded in image)
bind 0.0.0.0
protected-mode yes
port 6379

# Memory defaults (can be overridden at runtime)
maxmemory 2gb
maxmemory-policy volatile-lru

# Persistence defaults
save 900 1
save 300 10
appendonly yes
appendfsync everysec

# Security - password set via env at runtime
# requirepass is not hardcoded in image
include /etc/redis/redis-env.conf
```

Generate `redis-env.conf` from environment variables at startup:

```bash
#!/bin/bash
# docker-entrypoint-init.sh

REDIS_ENV_CONF="/etc/redis/redis-env.conf"
echo "# Auto-generated from environment" > "$REDIS_ENV_CONF"

[ -n "$REDIS_PASSWORD" ] && echo "requirepass $REDIS_PASSWORD" >> "$REDIS_ENV_CONF"
[ -n "$REDIS_MAXMEMORY" ] && echo "maxmemory $REDIS_MAXMEMORY" >> "$REDIS_ENV_CONF"
[ -n "$REDIS_MAXMEMORY_POLICY" ] && echo "maxmemory-policy $REDIS_MAXMEMORY_POLICY" >> "$REDIS_ENV_CONF"

exec redis-server /etc/redis/redis.conf "$@"
```

## Adding Redis Modules

Build image with RedisJSON and RediSearch:

```dockerfile
# Use pre-built module binaries from redis-stack
FROM redis/redis-stack-server:latest AS modules

FROM redis:7.2-alpine
COPY --from=modules /opt/redis-stack/lib/rejson.so /usr/lib/redis/modules/
COPY --from=modules /opt/redis-stack/lib/redisearch.so /usr/lib/redis/modules/

COPY redis.conf /etc/redis/redis.conf
RUN echo "loadmodule /usr/lib/redis/modules/rejson.so" >> /etc/redis/redis.conf
RUN echo "loadmodule /usr/lib/redis/modules/redisearch.so" >> /etc/redis/redis.conf

USER redis
CMD ["redis-server", "/etc/redis/redis.conf"]
```

## Security Hardening

```dockerfile
FROM redis:7.2-alpine

# Run as non-root (redis user already exists in base image)
RUN chown redis:redis /data

# Remove shell access for redis user (Alpine does not include usermod)
RUN sed -i '/^redis:/s|[^:]*$|/sbin/nologin|' /etc/passwd

# Copy hardened config
COPY redis-hardened.conf /etc/redis/redis.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD redis-cli ping | grep -q PONG

USER redis
EXPOSE 6379
CMD ["redis-server", "/etc/redis/redis.conf"]
```

## Build and Tag

```bash
# Build with version labels
docker build \
  --label "org.opencontainers.image.version=7.2.4" \
  --label "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --label "org.opencontainers.image.source=https://github.com/myorg/redis-image" \
  -t myorg/redis:7.2.4-hardened \
  -t myorg/redis:latest \
  .

# Push to registry
docker push myorg/redis:7.2.4-hardened
docker push myorg/redis:latest
```

## Summary

A custom Redis Docker image embeds your organization's baseline configuration, handles environment variable injection through an init script, optionally bundles modules, and enforces security settings like running as a non-root user. Versioning your image tags and adding HEALTHCHECK ensures consistent, reliable deployments across all environments.
