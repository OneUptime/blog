# How to Install and Configure RabbitMQ on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RabbitMQ, Message Broker, Linux

Description: Learn how to install and Configure RabbitMQ on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

RabbitMQ is a widely-used open-source message broker that implements the AMQP protocol. It supports complex routing, multiple messaging patterns, and has a rich ecosystem of client libraries across many programming languages.

## Prerequisites

- RHEL 9
- Root or sudo access
- Erlang runtime (installed as a dependency)

## Step 1: Install Erlang

```bash
sudo dnf install -y https://github.com/rabbitmq/erlang-rpm/releases/latest/download/erlang-26.2.5-1.el9.x86_64.rpm
```

## Step 2: Install RabbitMQ

```bash
sudo rpm --import https://github.com/rabbitmq/signing-keys/releases/download/3.0/rabbitmq-release-signing-key.asc
sudo dnf install -y https://github.com/rabbitmq/rabbitmq-server/releases/latest/download/rabbitmq-server-3.13.0-1.el9.noarch.rpm
```

## Step 3: Start and Enable

```bash
sudo systemctl enable --now rabbitmq-server
sudo systemctl status rabbitmq-server
```

## Step 4: Enable Management Plugin

```bash
sudo rabbitmq-plugins enable rabbitmq_management
```

## Step 5: Create Admin User

```bash
sudo rabbitmqctl add_user admin strongpassword123
sudo rabbitmqctl set_user_tags admin administrator
sudo rabbitmqctl set_permissions -p / admin ".*" ".*" ".*"
```

## Step 6: Configure Firewall

```bash
sudo firewall-cmd --permanent --add-port=5672/tcp    # AMQP
sudo firewall-cmd --permanent --add-port=15672/tcp   # Management UI
sudo firewall-cmd --reload
```

## Step 7: Access Management UI

Open `http://your-server:15672/` and log in with the admin credentials.

## Step 8: Test with rabbitmqadmin

```bash
sudo rabbitmq-plugins enable rabbitmq_management
wget http://localhost:15672/cli/rabbitmqadmin
chmod +x rabbitmqadmin

# Declare a queue
./rabbitmqadmin declare queue name=test-queue durable=true

# Publish a message
./rabbitmqadmin publish routing_key=test-queue payload="Hello RabbitMQ"

# Consume
./rabbitmqadmin get queue=test-queue
```

## Step 9: Check Status

```bash
sudo rabbitmqctl status
sudo rabbitmqctl list_queues
sudo rabbitmqctl list_connections
```

## Conclusion

RabbitMQ on RHEL 9 provides a mature, feature-rich message broker with excellent protocol support and management tools. Its management UI makes monitoring and administration straightforward for both development and production environments.
