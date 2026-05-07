# How to Run RabbitMQ in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, RabbitMQ, Message Queue, AMQP

Description: Learn how to run RabbitMQ in a Podman container with the management UI, persistent queues, and custom configuration.

---

> RabbitMQ in Podman gives you a full-featured message broker with a built-in management dashboard running in a rootless container.

RabbitMQ is one of the most widely deployed open-source message brokers, supporting AMQP, MQTT, and STOMP protocols. Running it in a Podman container lets you spin up a message broker instantly with the management UI enabled, persistent message storage, and custom configurations. This guide covers setup, the management plugin, persistence, and basic messaging operations.

---

## Pulling the RabbitMQ Image

Download the official RabbitMQ image with the management plugin included.

```bash
# Pull RabbitMQ with the management UI

podman pull docker.io/library/rabbitmq:4-management

# Verify the image
podman images | grep rabbitmq
```

## Running a Basic RabbitMQ Container

Start RabbitMQ with the management dashboard enabled.

```bash
# Run RabbitMQ with management UI
podman run -d \
  --name my-rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin-secret \
  docker.io/library/rabbitmq:4-management

# Check that the container is running
podman ps

# Wait for RabbitMQ to start, then check its status
sleep 10
podman exec my-rabbitmq rabbitmqctl status | head -20
```

## Accessing the Management Dashboard

The management UI is available on port 15672.

```bash
# The management UI is accessible at:
echo "Open http://localhost:15672 in your browser"
echo "Username: admin"
echo "Password: admin-secret"

# You can also check the management API
curl -s -u admin:admin-secret http://localhost:15672/api/overview | python3 -m json.tool | head -20
```

## Persistent Message Storage

Use a named volume to persist broker data.

```bash
# Create a volume for RabbitMQ data
podman volume create rabbitmq-data

# Run RabbitMQ with persistent storage
podman run -d \
  --name rabbitmq-persistent \
  -p 5673:5672 \
  -p 15673:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin-secret \
  -v rabbitmq-data:/var/lib/rabbitmq:Z \
  docker.io/library/rabbitmq:4-management

# Verify persistence
podman volume inspect rabbitmq-data
```

## Custom RabbitMQ Configuration

Mount a custom configuration file for advanced settings.

```bash
# Create a config directory
mkdir -p ~/rabbitmq-config

# Write a custom RabbitMQ configuration
cat > ~/rabbitmq-config/rabbitmq.conf <<'EOF'
# Default user and virtual host
default_user = admin
default_pass = admin-secret
default_vhost = /

# Networking
listeners.tcp.default = 5672

# Management plugin
management.tcp.port = 15672

# Memory and disk limits
vm_memory_high_watermark.relative = 0.6
disk_free_limit.absolute = 1GB

# Logging
log.console = true
log.console.level = info

# Connection limits
channel_max = 128
heartbeat = 60
EOF

# Run RabbitMQ with custom config
podman run -d \
  --name rabbitmq-custom \
  -p 5674:5672 \
  -p 15674:15672 \
  -v ~/rabbitmq-config/rabbitmq.conf:/etc/rabbitmq/rabbitmq.conf:Z \
  -v rabbitmq-custom-data:/var/lib/rabbitmq:Z \
  docker.io/library/rabbitmq:4-management
```

## Working with Queues and Messages

Use the command-line tools to manage queues and publish messages.

```bash
# List existing queues
podman exec my-rabbitmq rabbitmqctl list_queues

# Declare a new queue using the management API
curl -s -u admin:admin-secret \
  -X PUT "http://localhost:15672/api/queues/%2F/my-task-queue" \
  -H 'Content-Type: application/json' \
  -d '{"durable": true, "auto_delete": false}'

# Publish a message to the queue
curl -s -u admin:admin-secret \
  -X POST "http://localhost:15672/api/exchanges/%2F/amq.default/publish" \
  -H 'Content-Type: application/json' \
  -d '{
    "properties": {"delivery_mode": 2},
    "routing_key": "my-task-queue",
    "payload": "Hello from Podman RabbitMQ!",
    "payload_encoding": "string"
  }'

# Get a message from the queue
curl -s -u admin:admin-secret \
  -X POST "http://localhost:15672/api/queues/%2F/my-task-queue/get" \
  -H 'Content-Type: application/json' \
  -d '{"count": 1, "ackmode": "ack_requeue_false", "encoding": "auto"}'

# List all exchanges
podman exec my-rabbitmq rabbitmqctl list_exchanges

# List all connections
podman exec my-rabbitmq rabbitmqctl list_connections
```

## Enabling Additional Plugins

Enable RabbitMQ plugins for extended functionality.

```bash
# List available plugins
podman exec my-rabbitmq rabbitmq-plugins list

# Enable the shovel plugin for message transfer between brokers
podman exec my-rabbitmq rabbitmq-plugins enable rabbitmq_shovel rabbitmq_shovel_management

# Enable the consistent hash exchange plugin
podman exec my-rabbitmq rabbitmq-plugins enable rabbitmq_consistent_hash_exchange

# Verify enabled plugins
podman exec my-rabbitmq rabbitmq-plugins list -e
```

## Managing the Container

Routine management commands.

```bash
# View RabbitMQ logs
podman logs my-rabbitmq

# Check RabbitMQ node health
podman exec my-rabbitmq rabbitmq-diagnostics check_running

# Stop and start
podman stop my-rabbitmq
podman start my-rabbitmq

# Remove containers and volumes
podman rm -f my-rabbitmq rabbitmq-persistent rabbitmq-custom
podman volume rm rabbitmq-data rabbitmq-custom-data
```

## Summary

Running RabbitMQ in a Podman container gives you a full-featured message broker with the management dashboard available out of the box. The management UI on port 15672 provides visual queue monitoring, connection tracking, and message publishing. Named volumes persist broker data, including durable queues and persistent messages, while custom configuration files let you tune memory limits, connection settings, and virtual hosts. Podman's rootless execution adds a security layer, making this setup suitable for development, testing, and local messaging environments.
