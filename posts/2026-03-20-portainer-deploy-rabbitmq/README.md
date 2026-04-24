# How to Deploy RabbitMQ via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, RabbitMQ, Message Queue, AMQP, Self-Hosted

Description: Deploy RabbitMQ via Portainer with the management plugin enabled for a feature-rich message broker with web-based administration.

## Introduction

RabbitMQ is a widely-used message broker that speaks AMQP 0-9-1 natively and can support protocols such as MQTT and STOMP via plugins. It's excellent for task queues, pub/sub messaging, and service decoupling. Deploying via Portainer with the management plugin gives you a complete message broker with a built-in web UI.

## Deploy as a Stack

In Portainer, create a stack named `rabbitmq`:

```yaml
services:
  rabbitmq:
    image: rabbitmq:4-management-alpine
    container_name: rabbitmq
    hostname: rabbitmq  # Keeps the RabbitMQ node name stable
    volumes:
      # Persistent data storage
      - rabbitmq_data:/var/lib/rabbitmq
      # Custom configuration
      - ./rabbitmq.conf:/etc/rabbitmq/rabbitmq.conf:ro
      # Definitions for pre-configured exchanges/queues
      - ./definitions.json:/etc/rabbitmq/definitions.json:ro
    ports:
      - "5672:5672"    # AMQP port
      - "15672:15672"  # Management UI
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  rabbitmq_data:
```

## RabbitMQ Configuration

Create `rabbitmq.conf`:

```ini
# rabbitmq.conf

# Default virtual host

default_vhost = /

# Heartbeat timeout in seconds
heartbeat = 60

# Maximum message size (128MB)
max_message_size = 134217728

# Memory alarm threshold (relative to detected RAM)
vm_memory_high_watermark.relative = 0.8

# Disk alarm threshold (1GB free)
disk_free_limit.absolute = 1GB

# Load definitions at startup
definitions.import_backend = local_filesystem
definitions.local.path = /etc/rabbitmq/definitions.json

# Logging
log.console = true
log.console.level = info
log.file = false
```

## Pre-Configure Exchanges and Queues

Create `definitions.json`:

```json
{
  "vhosts": [
    {"name": "/"},
    {"name": "myapp"}
  ],
  "users": [
    {
      "name": "admin",
      "password_hash": "AQIDBHF1oDbiF2MuXtjMRG4ktIR85WLSdQa7T2CHavV7CZzI",
      "hashing_algorithm": "rabbit_password_hashing_sha256",
      "tags": ["administrator"]
    },
    {
      "name": "app_user",
      "password_hash": "CgsMDYe00GosIh65rSY9EirIZ1hNoc89E4Lo+NgWCDkjtsmU",
      "hashing_algorithm": "rabbit_password_hashing_sha256",
      "tags": []
    }
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
      "user": "admin",
      "vhost": "myapp",
      "configure": ".*",
      "write": ".*",
      "read": ".*"
    },
    {
      "user": "app_user",
      "vhost": "myapp",
      "configure": ".*",
      "write": ".*",
      "read": ".*"
    }
  ],
  "exchanges": [
    {
      "name": "events",
      "vhost": "myapp",
      "type": "topic",
      "durable": true,
      "auto_delete": false,
      "internal": false,
      "arguments": {}
    }
  ],
  "queues": [
    {
      "name": "email_notifications",
      "vhost": "myapp",
      "durable": true,
      "auto_delete": false,
      "arguments": {
        "x-message-ttl": 86400000,
        "x-max-length": 10000
      }
    },
    {
      "name": "sms_notifications",
      "vhost": "myapp",
      "durable": true,
      "auto_delete": false
    }
  ],
  "bindings": [
    {
      "source": "events",
      "vhost": "myapp",
      "destination": "email_notifications",
      "destination_type": "queue",
      "routing_key": "notification.email.#",
      "arguments": {}
    }
  ]
}
```

## Sending and Receiving Messages

### Python Producer

```python
import pika
import json

connection = pika.BlockingConnection(
    pika.ConnectionParameters(
        host='localhost',
        virtual_host='myapp',
        credentials=pika.PlainCredentials('app_user', 'change_this_app_password')
    )
)
channel = connection.channel()

# Publish a message
channel.basic_publish(
    exchange='events',
    routing_key='notification.email.welcome',
    body=json.dumps({'to': 'user@example.com', 'subject': 'Welcome!'}),
    properties=pika.BasicProperties(
        delivery_mode=pika.DeliveryMode.Persistent  # Persist to disk
    )
)
print("Message sent!")
connection.close()
```

### Python Consumer

```python
import pika
import json

def process_message(ch, method, properties, body):
    message = json.loads(body)
    print(f"Processing email to: {message['to']}")
    ch.basic_ack(delivery_tag=method.delivery_tag)

connection = pika.BlockingConnection(
    pika.ConnectionParameters(host='localhost', virtual_host='myapp',
        credentials=pika.PlainCredentials('app_user', 'change_this_app_password'))
)
channel = connection.channel()
channel.basic_qos(prefetch_count=1)  # Process one message at a time
channel.basic_consume(queue='email_notifications', on_message_callback=process_message)

print("Waiting for messages...")
channel.start_consuming()
```

## Monitoring RabbitMQ

Access the management UI at `http://<host>:15672` with username `admin` and password `change_this_admin_password`. Key metrics to watch:

- **Queue depth**: Growing queues indicate consumer lag
- **Message rates**: publish/deliver rates per queue
- **Memory usage**: Should stay below the configured watermark
- **Connections**: Track for connection leaks

```bash
# CLI monitoring
docker exec rabbitmq rabbitmq-diagnostics -q status
docker exec rabbitmq rabbitmqctl list_queues -p myapp name messages consumers
docker exec rabbitmq rabbitmqctl list_exchanges -p myapp name type
```

## Conclusion

RabbitMQ deployed via Portainer provides a production-ready message broker with the management UI included. Pre-configuring exchanges, queues, and bindings via the definitions file means your messaging topology is reproducible and version-controlled. The persistent volume, together with durable queues and persistent messages, helps queued messages survive container restarts.
