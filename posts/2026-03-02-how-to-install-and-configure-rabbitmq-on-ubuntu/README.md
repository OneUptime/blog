# How to Install and Configure RabbitMQ on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, RabbitMQ, Message Queue, AMQP, DevOps

Description: Learn how to install and configure RabbitMQ on Ubuntu, covering virtual hosts, users, exchanges, queues, and the management web interface.

---

RabbitMQ is one of the most widely deployed open-source message brokers. It implements AMQP (Advanced Message Queuing Protocol) and enables applications to communicate asynchronously by sending messages to queues. This decoupling lets different parts of your system operate independently and at different speeds.

Common RabbitMQ use cases include:
- Background job processing (image resizing, email sending, report generation)
- Microservice communication
- Event-driven architectures
- Rate limiting API calls to downstream services
- Broadcasting events to multiple consumers

## RabbitMQ Core Concepts

Before configuring anything, understanding these terms helps:

- **Exchange**: Where producers send messages. Exchanges route messages to queues based on routing rules.
- **Queue**: Where messages wait until a consumer processes them.
- **Binding**: A link between an exchange and a queue, with an optional routing key.
- **Virtual Host**: An isolated namespace (like a separate RabbitMQ instance). Used to separate different applications or environments.
- **Exchange types**: `direct` (exact key match), `topic` (wildcard key match), `fanout` (broadcast to all bound queues), `headers` (match by headers).

## Prerequisites

- Ubuntu 22.04 or 24.04
- At least 1 GB RAM (2 GB recommended)
- Root or sudo access

## Installing RabbitMQ

Use the official RabbitMQ repository for the latest version:

```bash
# Install prerequisites
sudo apt update && sudo apt install -y curl gnupg apt-transport-https

# Add Erlang (required by RabbitMQ) signing key
curl -fsSL https://packages.erlang-solutions.com/ubuntu/erlang_solutions.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/erlang-archive-keyring.gpg

# Add Erlang repository
echo "deb [signed-by=/usr/share/keyrings/erlang-archive-keyring.gpg] \
  https://packages.erlang-solutions.com/ubuntu $(lsb_release -cs) contrib" | \
  sudo tee /etc/apt/sources.list.d/erlang.list

# Add RabbitMQ signing key and repository
curl -fsSL https://packagecloud.io/rabbitmq/rabbitmq-server/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/rabbitmq-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/rabbitmq-archive-keyring.gpg] \
  https://packagecloud.io/rabbitmq/rabbitmq-server/ubuntu/ $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/rabbitmq.list

# Install Erlang and RabbitMQ
sudo apt update
sudo apt install -y erlang-base erlang-asn1 erlang-crypto erlang-eldap \
  erlang-ftp erlang-inets erlang-mnesia erlang-os-mon erlang-parsetools \
  erlang-public-key erlang-runtime-tools erlang-snmp erlang-ssl \
  erlang-syntax-tools erlang-tftp erlang-tools erlang-xmerl

sudo apt install -y rabbitmq-server

# Enable and start
sudo systemctl enable rabbitmq-server
sudo systemctl start rabbitmq-server
sudo systemctl status rabbitmq-server
```

## Enabling the Management Plugin

The management plugin provides a web UI and REST API for administration:

```bash
sudo rabbitmq-plugins enable rabbitmq_management

# Restart RabbitMQ to load the plugin
sudo systemctl restart rabbitmq-server
```

The management UI is now available at `http://your-server:15672`. The default `guest` user only works from localhost.

## Creating the Admin User

Create a proper admin user and remove the default guest account:

```bash
# Add an admin user
sudo rabbitmqctl add_user admin YourStrongPassword123!

# Grant administrator tag
sudo rabbitmqctl set_user_tags admin administrator

# Grant full access to all virtual hosts
sudo rabbitmqctl set_permissions -p "/" admin ".*" ".*" ".*"

# Remove the insecure default guest user (if security matters)
sudo rabbitmqctl delete_user guest

# List users to verify
sudo rabbitmqctl list_users
```

## Configuration File

RabbitMQ's advanced configuration file is at `/etc/rabbitmq/rabbitmq.conf`:

```bash
sudo nano /etc/rabbitmq/rabbitmq.conf
```

```ini
# /etc/rabbitmq/rabbitmq.conf

# Networking
# Bind to specific IP (comment out to bind all)
# listeners.tcp.local = 127.0.0.1:5672
listeners.tcp.default = 5672

# Management UI
management.tcp.port = 15672
management.tcp.ip = 0.0.0.0

# Default user (used for clustering, not login)
default_user = rabbitmq_internal
default_pass = InternalPass123!
default_vhost = /

# Default permissions for the default user
default_permissions.configure = .*
default_permissions.write = .*
default_permissions.read = .*

# Message storage
# Maximum message size (bytes) - default 128MB
max_message_size = 134217728

# Disk free space watermark
# RabbitMQ will stop accepting new messages when disk is below this
disk_free_limit.absolute = 1GB

# Memory watermark - throttle when memory usage exceeds this fraction
vm_memory_high_watermark.relative = 0.6

# Connection heartbeat (seconds)
heartbeat = 60

# Log level: debug, info, warning, error, critical, none
log.default.level = info
log.file = /var/log/rabbitmq/rabbit.log
log.file.rotation.count = 5
log.file.rotation.size = 10485760

# Enable guest access only from localhost
loopback_users.guest = true
```

## Working with Virtual Hosts

Virtual hosts provide logical separation between applications:

```bash
# Create a virtual host for your application
sudo rabbitmqctl add_vhost /myapp

# Create an application user
sudo rabbitmqctl add_user myapp_user AppUserPass123!
sudo rabbitmqctl set_user_tags myapp_user monitoring

# Grant the user permissions on the vhost
# Format: configure-regexp write-regexp read-regexp
sudo rabbitmqctl set_permissions -p /myapp myapp_user ".*" ".*" ".*"

# List virtual hosts
sudo rabbitmqctl list_vhosts

# List permissions for a vhost
sudo rabbitmqctl list_permissions -p /myapp
```

## Managing Queues and Exchanges via CLI

```bash
# List all queues
sudo rabbitmqctl list_queues name messages consumers

# List all exchanges
sudo rabbitmqctl list_exchanges name type durable

# List bindings
sudo rabbitmqctl list_bindings

# Purge (empty) a queue without deleting it
sudo rabbitmqctl purge_queue my-queue

# Delete a queue
sudo rabbitmqctl delete_queue my-queue
```

## Using the REST API

The management plugin exposes a full REST API for automation:

```bash
# List queues
curl -u admin:YourStrongPassword123! \
  http://localhost:15672/api/queues

# Create a queue
curl -u admin:YourStrongPassword123! \
  -X PUT http://localhost:15672/api/queues/%2F/my-new-queue \
  -H "Content-Type: application/json" \
  -d '{
    "durable": true,
    "arguments": {
      "x-message-ttl": 86400000,
      "x-max-length": 10000
    }
  }'

# Get queue details
curl -u admin:YourStrongPassword123! \
  http://localhost:15672/api/queues/%2F/my-new-queue

# Publish a test message
curl -u admin:YourStrongPassword123! \
  -X POST http://localhost:15672/api/exchanges/%2F/amq.default/publish \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {},
    "routing_key": "my-new-queue",
    "payload": "Hello, RabbitMQ!",
    "payload_encoding": "string"
  }'
```

## Setting Up Dead Letter Queues

Dead letter queues (DLQ) capture messages that fail processing - rejected, expired, or overflowed from a queue:

```bash
# Create the dead letter exchange
curl -u admin:YourStrongPassword123! \
  -X PUT http://localhost:15672/api/exchanges/%2F/dead-letter-exchange \
  -H "Content-Type: application/json" \
  -d '{"type": "direct", "durable": true}'

# Create the dead letter queue
curl -u admin:YourStrongPassword123! \
  -X PUT http://localhost:15672/api/queues/%2F/dead-letter-queue \
  -H "Content-Type: application/json" \
  -d '{"durable": true}'

# Bind the DLQ to the DLX
curl -u admin:YourStrongPassword123! \
  -X POST http://localhost:15672/api/bindings/%2F/e/dead-letter-exchange/q/dead-letter-queue \
  -H "Content-Type: application/json" \
  -d '{"routing_key": "dead-letter"}'

# Create the main queue with DLX configured
curl -u admin:YourStrongPassword123! \
  -X PUT http://localhost:15672/api/queues/%2F/job-queue \
  -H "Content-Type: application/json" \
  -d '{
    "durable": true,
    "arguments": {
      "x-dead-letter-exchange": "dead-letter-exchange",
      "x-dead-letter-routing-key": "dead-letter",
      "x-message-ttl": 3600000
    }
  }'
```

## Firewall Configuration

```bash
# Allow AMQP (application connections)
sudo ufw allow from 192.168.1.0/24 to any port 5672 comment "RabbitMQ AMQP"

# Allow management UI (restrict to admin IPs)
sudo ufw allow from YOUR_ADMIN_IP to any port 15672 comment "RabbitMQ Management"

sudo ufw reload
```

Monitor your RabbitMQ cluster's queue depths, consumer counts, and node health with [OneUptime](https://oneuptime.com) to ensure your message broker stays healthy. Deep queue backlogs often indicate stuck consumers that need attention.
