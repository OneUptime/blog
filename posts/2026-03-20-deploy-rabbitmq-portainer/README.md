# How to Deploy RabbitMQ via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, RabbitMQ, Message Broker, Docker, Deployment

Description: Learn how to deploy RabbitMQ via Portainer with management UI, persistent storage, and configuration for common messaging patterns.

## RabbitMQ via Portainer Stack

**Stacks → Add Stack → rabbitmq**

```yaml
services:
  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    restart: unless-stopped
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
      - /opt/rabbitmq/rabbitmq.conf:/etc/rabbitmq/rabbitmq.conf:ro
      - /opt/rabbitmq/definitions.json:/etc/rabbitmq/definitions.json:ro
    ports:
      - "5672:5672"     # AMQP port
      - "15672:15672"   # Management UI
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_port_connectivity"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  rabbitmq_data:
```

## Environment Variables

These credentials match the pre-loaded administrator user in `definitions.json`.

```text
RABBITMQ_USER = admin
RABBITMQ_PASSWORD = secure-rabbitmq-password
```

## RabbitMQ Configuration

```ini
# /opt/rabbitmq/rabbitmq.conf

# Networking
listeners.tcp.default = 5672

# Definitions import
definitions.import_backend = local_filesystem
definitions.local.path = /etc/rabbitmq/definitions.json

# Memory
vm_memory_high_watermark.absolute = 512MB
vm_memory_high_watermark_paging_ratio = 0.5

# Disk
disk_free_limit.absolute = 1GB

# Consumer ack timeout (30 minutes)
consumer_timeout = 1800000

# Log level
log.console.level = info
```

## Pre-Load Definitions (Queues and Exchanges)

```json
{
  "rabbit_version": "3.13",
  "vhosts": [{"name": "/"}],
  "users": [
    {
      "name": "admin",
      "password_hash": "kI3GCmGbBFbPrZcy3lTZuEChjRJ4zPJ+YTpdV3UIa986plsN",
      "hashing_algorithm": "rabbit_password_hashing_sha256",
      "tags": ["administrator"]
    }
  ],
  "permissions": [
    {"user": "admin", "vhost": "/", "configure": ".*", "write": ".*", "read": ".*"}
  ],
  "exchanges": [
    {"name": "events", "vhost": "/", "type": "topic", "durable": true, "auto_delete": false}
  ],
  "queues": [
    {"name": "order.created", "vhost": "/", "durable": true, "auto_delete": false,
     "arguments": {"x-dead-letter-exchange": "events", "x-message-ttl": 86400000}}
  ],
  "bindings": [
    {"source": "events", "vhost": "/", "destination": "order.created",
     "destination_type": "queue", "routing_key": "order.created"}
  ]
}
```

## Management UI

Access RabbitMQ Management at `http://server:15672`.

Features:
- View queues, exchanges, and bindings
- Monitor message rates and consumer counts
- Publish test messages
- View node and cluster health

## Connecting Applications

```yaml
services:
  worker:
    image: myworker:latest
    environment:
      - RABBITMQ_URL=amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672/%2f
    depends_on:
      rabbitmq:
        condition: service_healthy
```

## CLI Operations via Portainer Console

```bash
# List queues
rabbitmqctl list_queues name messages consumers

# List exchanges
rabbitmqctl list_exchanges name type durable

# Purge a queue
rabbitmqctl purge_queue order.created

# Check cluster status
rabbitmqctl cluster_status

# Add a new user
rabbitmqctl add_user newuser password
rabbitmqctl set_permissions -p / newuser ".*" ".*" ".*"
```

## Message Patterns

RabbitMQ supports several messaging patterns:

| Pattern | Exchange Type | Use Case |
|---------|--------------|---------|
| Direct | direct | Point-to-point queues |
| Fanout | fanout | Broadcast to all consumers |
| Topic | topic | Selective routing by pattern |
| Headers | headers | Route by message headers |

## Conclusion

RabbitMQ via Portainer with the management image gives you a complete message broker with browser-based administration. The definitions file approach pre-populates queues and exchanges at startup, making RabbitMQ deployment repeatable. Use `service_healthy` in `depends_on` to ensure consumers don't start before RabbitMQ is ready.
