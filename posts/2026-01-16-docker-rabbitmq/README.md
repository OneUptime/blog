# How to Run RabbitMQ in Docker with Management UI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, RabbitMQ, Message Queue, DevOps, Microservices

Description: Learn how to run RabbitMQ in Docker with the management UI, configure users and permissions, set up clustering, and integrate with applications.

---

RabbitMQ is a robust message broker that enables asynchronous communication between services. This guide covers running RabbitMQ in Docker with the management interface, proper configuration, and production settings.

## Basic Setup

### Quick Start

```bash
# Run RabbitMQ with management UI
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management

# Access management UI at http://localhost:15672
# Default credentials: guest/guest
```

### Docker Compose

```yaml
version: '3.8'

services:
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"    # AMQP
      - "15672:15672"  # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

volumes:
  rabbitmq_data:
```

## Configuration

### Using Configuration File

```yaml
services:
  rabbitmq:
    image: rabbitmq:3-management
    volumes:
      - ./rabbitmq.conf:/etc/rabbitmq/rabbitmq.conf
      - ./definitions.json:/etc/rabbitmq/definitions.json
      - rabbitmq_data:/var/lib/rabbitmq
    environment:
      RABBITMQ_CONFIG_FILE: /etc/rabbitmq/rabbitmq
```

### rabbitmq.conf

```ini
# rabbitmq.conf
# Networking
listeners.tcp.default = 5672
management.tcp.port = 15672

# Default user
default_user = admin
default_pass = secret

# Memory and disk limits
vm_memory_high_watermark.relative = 0.7
disk_free_limit.absolute = 2GB

# Logging
log.console = true
log.console.level = info

# Load definitions on startup
load_definitions = /etc/rabbitmq/definitions.json
```

### definitions.json (Pre-configured Resources)

```json
{
  "users": [
    {
      "name": "admin",
      "password_hash": "...",
      "tags": "administrator"
    },
    {
      "name": "app",
      "password_hash": "...",
      "tags": ""
    }
  ],
  "vhosts": [
    {"name": "/"},
    {"name": "production"}
  ],
  "permissions": [
    {
      "user": "admin",
      "vhost": "/",
      "configure": ".*",
      "write": ".*",
      "read": ".*"
    },
    {
      "user": "app",
      "vhost": "production",
      "configure": "",
      "write": ".*",
      "read": ".*"
    }
  ],
  "queues": [
    {
      "name": "tasks",
      "vhost": "production",
      "durable": true,
      "auto_delete": false,
      "arguments": {}
    }
  ],
  "exchanges": [
    {
      "name": "events",
      "vhost": "production",
      "type": "topic",
      "durable": true,
      "auto_delete": false
    }
  ],
  "bindings": [
    {
      "source": "events",
      "vhost": "production",
      "destination": "tasks",
      "destination_type": "queue",
      "routing_key": "task.*"
    }
  ]
}
```

## Health Checks

```yaml
services:
  rabbitmq:
    image: rabbitmq:3-management
    healthcheck:
      test: rabbitmq-diagnostics -q ping
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
```

## Clustering

### Docker Compose Cluster

```yaml
version: '3.8'

services:
  rabbitmq1:
    image: rabbitmq:3-management
    hostname: rabbitmq1
    environment:
      RABBITMQ_ERLANG_COOKIE: ${ERLANG_COOKIE}
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq1_data:/var/lib/rabbitmq
    networks:
      - rabbitmq-cluster

  rabbitmq2:
    image: rabbitmq:3-management
    hostname: rabbitmq2
    environment:
      RABBITMQ_ERLANG_COOKIE: ${ERLANG_COOKIE}
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq2_data:/var/lib/rabbitmq
    networks:
      - rabbitmq-cluster
    depends_on:
      - rabbitmq1

  rabbitmq3:
    image: rabbitmq:3-management
    hostname: rabbitmq3
    environment:
      RABBITMQ_ERLANG_COOKIE: ${ERLANG_COOKIE}
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq3_data:/var/lib/rabbitmq
    networks:
      - rabbitmq-cluster
    depends_on:
      - rabbitmq1

networks:
  rabbitmq-cluster:

volumes:
  rabbitmq1_data:
  rabbitmq2_data:
  rabbitmq3_data:
```

### Cluster Configuration

```ini
# rabbitmq.conf for clustering
cluster_formation.peer_discovery_backend = rabbit_peer_discovery_classic_config
cluster_formation.classic_config.nodes.1 = rabbit@rabbitmq1
cluster_formation.classic_config.nodes.2 = rabbit@rabbitmq2
cluster_formation.classic_config.nodes.3 = rabbit@rabbitmq3
```

## Complete Production Example

```yaml
version: '3.8'

services:
  rabbitmq:
    image: rabbitmq:3-management-alpine
    restart: unless-stopped
    hostname: rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
      RABBITMQ_VM_MEMORY_HIGH_WATERMARK: 0.7
    volumes:
      - ./rabbitmq.conf:/etc/rabbitmq/rabbitmq.conf:ro
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: rabbitmq-diagnostics -q ping
      interval: 30s
      timeout: 10s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
    networks:
      - backend

  producer:
    image: myproducer:latest
    environment:
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672/
    depends_on:
      rabbitmq:
        condition: service_healthy
    networks:
      - backend

  consumer:
    image: myconsumer:latest
    environment:
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672/
    depends_on:
      rabbitmq:
        condition: service_healthy
    deploy:
      replicas: 3
    networks:
      - backend

networks:
  backend:

volumes:
  rabbitmq_data:
```

## Summary

| Port | Purpose |
|------|---------|
| 5672 | AMQP protocol |
| 15672 | Management UI |
| 25672 | Clustering |
| 4369 | EPMD peer discovery |

RabbitMQ in Docker provides reliable message queuing for microservices. Use the management image for the web UI, configure proper users and permissions, and implement health checks for production deployments.

