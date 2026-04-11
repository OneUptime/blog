# How to Manage Redis Across Multiple Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Environment, DevOps

Description: Learn how to manage Redis across development, staging, and production environments with consistent configuration, environment isolation, and deployment automation.

---

Managing Redis across multiple environments requires consistent configuration patterns, clear isolation boundaries, and automated deployment pipelines. This guide covers strategies for keeping your dev, staging, and production Redis deployments aligned without duplicating work.

## Environment Configuration Strategy

Use a base configuration with environment overrides:

```text
redis-config/
  base.conf          - shared settings
  dev.conf           - development overrides
  staging.conf       - staging overrides
  production.conf    - production overrides
```

Base configuration:

```text
# base.conf
hz 10
dynamic-hz yes
loglevel notice
tcp-keepalive 300
databases 16
```

Development overrides:

```text
# dev.conf
include /etc/redis/base.conf
bind 127.0.0.1
maxmemory 256mb
maxmemory-policy allkeys-lru
loglevel verbose
appendonly no
save ""
```

Production overrides:

```text
# production.conf
include /etc/redis/base.conf
bind 10.0.1.5 127.0.0.1
requirepass "${REDIS_PASSWORD}"
maxmemory 12gb
maxmemory-policy volatile-lru
loglevel notice
appendonly yes
appendfsync everysec
save 900 1
save 300 10
rename-command FLUSHALL ""
```

## Docker Compose per Environment

```yaml
# docker-compose.dev.yml
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    command: redis-server /etc/redis/dev.conf
    ports:
      - "6379:6379"
    volumes:
      - ./redis-config/base.conf:/etc/redis/base.conf:ro
      - ./redis-config/dev.conf:/etc/redis/dev.conf:ro
```

```yaml
# docker-compose.staging.yml
version: "3.8"
services:
  redis:
    image: redis:7.2.4-alpine  # pinned version for staging
    command: redis-server /etc/redis/staging.conf
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - ./redis-config/base.conf:/etc/redis/base.conf:ro
      - ./redis-config/staging.conf:/etc/redis/staging.conf:ro
      - redis-staging-data:/data
    restart: unless-stopped

volumes:
  redis-staging-data:
```

## Environment-Specific Connection Management

```bash
#!/bin/bash
# redis-connect.sh
# Environment-aware Redis connection wrapper
ENV="${ENVIRONMENT:-development}"

case "$ENV" in
  development)
    redis-cli -h localhost -p 6379 "$@"
    ;;
  staging)
    redis-cli -h redis-staging.internal -p 6379 -a "$REDIS_STAGING_PASSWORD" "$@"
    ;;
  production)
    redis-cli -h redis-prod.internal -p 6379 -a "$REDIS_PROD_PASSWORD" --tls "$@"
    ;;
  *)
    echo "Unknown environment: $ENV"
    exit 1
    ;;
esac
```

## Database Namespace Isolation

Use Redis database numbers to separate concerns within a single instance (dev only):

```text
DB 0 - application cache
DB 1 - session storage
DB 2 - rate limiting counters
DB 3 - job queues
```

```bash
# Connect to specific database
redis-cli -n 1 KEYS "*"  # session keys only

# Flush only one database
redis-cli -n 2 FLUSHDB   # clear rate limiting only
```

## Automated Environment Validation

```bash
#!/bin/bash
# validate-redis-env.sh
ENV="$1"
EXPECTED_MAXMEMORY="${2:-1073741824}"  # 1GB default

echo "Validating Redis config for: $ENV"

ACTUAL_MAXMEMORY=$(redis-cli CONFIG GET maxmemory | tail -1)
APPENDONLY=$(redis-cli CONFIG GET appendonly | tail -1)
PROTECTED=$(redis-cli CONFIG GET protected-mode | tail -1)

echo "maxmemory: $ACTUAL_MAXMEMORY (expected: $EXPECTED_MAXMEMORY)"
echo "appendonly: $APPENDONLY"
echo "protected-mode: $PROTECTED"

# Production must have AOF
if [ "$ENV" = "production" ] && [ "$APPENDONLY" != "yes" ]; then
  echo "FAIL: Production Redis must have appendonly enabled"
  exit 1
fi

echo "Validation passed for $ENV"
```

## Summary

Managing Redis across multiple environments works best with a base configuration plus per-environment overrides, pinned Docker image versions for staging and production, environment-aware connection scripts, and automated validation that enforces environment-specific requirements like AOF for production. Keep all configuration files in version control and deploy them through your CI/CD pipeline to maintain consistency.
