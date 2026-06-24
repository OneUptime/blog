# How to Deploy Celery Workers with Redis Broker via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Celery, Redis, Python, Task Queue

Description: Deploy Celery distributed task queue with Redis as the message broker using Portainer stacks.

## Introduction

Deploy Celery workers with Redis as the message broker using Portainer stacks. This guide provides step-by-step instructions for deploying and configuring this service in your containerized infrastructure.

## Prerequisites

- Portainer connected to a Docker environment
- A container image for your Celery application with Celery and your task module installed
- At least 2 GB RAM available
- Basic understanding of Celery and Redis

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack** and use the following configuration:

```yaml
# docker-compose.yml

version: "3.8"

services:
  redis:
    image: redis:7-alpine
    restart: always
    command:
      - redis-server
      - --appendonly
      - "yes"
      - --requirepass
      - ${REDIS_PASSWORD}
    environment:
      - REDISCLI_AUTH=${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 10s
    logging:
      driver: json-file
      options:
        max-size: "100m"
        max-file: "3"
    networks:
      - celery-net

  worker:
    image: my-celery-app:latest # Replace with your Celery app image
    restart: always
    command: celery -A tasks worker --loglevel=INFO -E # Replace tasks with your Celery app module
    depends_on:
      redis:
        condition: service_healthy
    environment:
      - CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD}@redis:6379/1
    networks:
      - celery-net

volumes:
  redis-data:

networks:
  celery-net:
    driver: bridge
```

## Step 2: Configure the Service

In Portainer, add the required stack environment variables before deploying:

```dotenv
REDIS_PASSWORD=change-this-in-production
FLOWER_BASIC_AUTH=admin:change-this-too
```

For Docker Standalone environments, Portainer stack environment variables are the simplest way to inject these values into the Compose file. Portainer's Configs section is only available for Docker Swarm environments.

## Step 3: Test the Connection

After deployment, test from Portainer's container console:

```bash
# Portainer > Containers > redis > Console
redis-cli PING

# Portainer > Containers > worker > Console
celery -A tasks inspect ping
celery -A tasks inspect stats
```

## Step 4: Production Configuration

For Docker Swarm deployments, enhance security and reliability:

```yaml
services:
  redis:
    image: redis:7-alpine
    command:
      - redis-server
      - --appendonly
      - "yes"
      - --requirepass
      - ${REDIS_PASSWORD}
      - --port
      - "0"
      - --tls-port
      - "6379"
      - --tls-cert-file
      - /certs/redis.crt
      - --tls-key-file
      - /certs/redis.key
      - --tls-ca-cert-file
      - /certs/ca.crt
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
        reservations:
          cpus: "0.5"
          memory: 512M
    secrets:
      - source: redis-tls-cert
        target: /certs/redis.crt
      - source: redis-tls-key
        target: /certs/redis.key
      - source: redis-tls-ca
        target: /certs/ca.crt

secrets:
  redis-tls-cert:
    external: true
  redis-tls-key:
    external: true
  redis-tls-ca:
    external: true
```

If you enable Redis TLS, update the Celery broker and result backend URLs to use the `rediss://` scheme and mount the same CA bundle into the worker container.

## Step 5: Set Up Monitoring

Monitor Celery workers through Portainer and Flower:

```yaml
  flower:
    image: mher/flower:2.0
    restart: always
    command:
      - celery
      - --broker=redis://:${REDIS_PASSWORD}@redis:6379/0
      - flower
      - --port=5555
      - --basic-auth=${FLOWER_BASIC_AUTH}
    ports:
      - "5555:5555"
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - celery-net
```

Configure Prometheus to scrape Flower metrics:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: "flower"
    static_configs:
      - targets: ["flower:5555"]
```

## Step 6: Configure Persistence and Backups

Set up data persistence and automated backups:

```bash
#!/bin/bash
# backup.sh
STACK_NAME="celery-redis"
REDIS_PASSWORD="change-this-in-production"
BACKUP_DIR="/backups/redis"
DATE=$(date +%Y%m%d_%H%M%S)
REDIS_CONTAINER=$(docker ps -q \
  --filter "label=com.docker.compose.project=${STACK_NAME}" \
  --filter "label=com.docker.compose.service=redis")

if [ -z "$REDIS_CONTAINER" ]; then
  echo "Redis container not found for stack ${STACK_NAME}" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

docker exec -e REDISCLI_AUTH="$REDIS_PASSWORD" "$REDIS_CONTAINER" \
  redis-cli --rdb /tmp/backup.rdb
docker cp "$REDIS_CONTAINER":/tmp/backup.rdb "$BACKUP_DIR/backup-$DATE.rdb"
docker exec "$REDIS_CONTAINER" rm -f /tmp/backup.rdb

# Retain 7 days of backups
find "$BACKUP_DIR" -name "*.rdb" -mtime +7 -delete

echo "Backup complete: $BACKUP_DIR/backup-$DATE.rdb"
```

If you run Redis in TLS-only mode, add `redis-cli` TLS flags such as `--tls` and the appropriate certificate options to the backup command.

## Step 7: Scale and High Availability

For Docker Swarm deployments, scale the Celery workers by increasing the worker replica count:

```yaml
services:
  worker:
    image: my-celery-app:latest # Replace with your Celery app image
    command: celery -A tasks worker --loglevel=INFO -E # Replace tasks with your Celery app module
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

For Redis broker failover, use Redis Sentinel rather than running multiple independent Redis replicas behind the same service name.

## Client Application Integration

Example integration code:

```python
from celery import Celery

app = Celery(
    "tasks",
    broker="redis://:your-password@redis:6379/0",
    backend="redis://:your-password@redis:6379/1",
)


@app.task
def add(x, y):
    return x + y


result = add.delay(4, 4)
print(result.id)
print(result.get(timeout=10))
```

## Conclusion

Deploying Celery workers with Redis as the message broker via Portainer provides a manageable way to run asynchronous Python workloads in containerized infrastructure. Portainer's stack management simplifies configuration, updates, and monitoring, while Redis persistence ensures broker data survives container restarts. Following the production configuration recommendations helps keep the deployment secure and reliable.
