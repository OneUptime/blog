# How to Install and Configure RabbitMQ on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RabbitMQ, Message Broker, AMQP, Erlang

Description: Learn how to install and configure RabbitMQ on RHEL as a reliable AMQP message broker with management console.

---

RabbitMQ is a widely-used open-source message broker that implements AMQP (Advanced Message Queuing Protocol). It supports flexible routing, clustering, and has a rich management interface.

## Installing Erlang and RabbitMQ

```bash
# Install Erlang from the RabbitMQ Erlang repository
cat << 'REPO' | sudo tee /etc/yum.repos.d/rabbitmq-erlang.repo
[rabbitmq-erlang]
name=rabbitmq-erlang
baseurl=https://packagecloud.io/rabbitmq/erlang/el/9/$basearch
gpgcheck=1
gpgkey=https://packagecloud.io/rabbitmq/erlang/gpgkey
enabled=1
REPO

# Install RabbitMQ repository
cat << 'REPO' | sudo tee /etc/yum.repos.d/rabbitmq.repo
[rabbitmq-server]
name=rabbitmq-server
baseurl=https://packagecloud.io/rabbitmq/rabbitmq-server/el/9/$basearch
gpgcheck=1
gpgkey=https://packagecloud.io/rabbitmq/rabbitmq-server/gpgkey
enabled=1
REPO

# Install packages
sudo dnf install -y erlang rabbitmq-server
```

## Starting RabbitMQ

```bash
# Enable and start the service
sudo systemctl enable --now rabbitmq-server

# Check status
sudo systemctl status rabbitmq-server

# Enable the management plugin
sudo rabbitmq-plugins enable rabbitmq_management
```

## Creating Users and Permissions

```bash
# Create an admin user
sudo rabbitmqctl add_user admin securepassword123
sudo rabbitmqctl set_user_tags admin administrator
sudo rabbitmqctl set_permissions -p / admin ".*" ".*" ".*"

# Create an application user
sudo rabbitmqctl add_user myapp apppassword
sudo rabbitmqctl set_permissions -p / myapp ".*" ".*" ".*"

# Delete the default guest user (recommended for production)
sudo rabbitmqctl delete_user guest
```

## Creating Virtual Hosts

```bash
# Create a virtual host for your application
sudo rabbitmqctl add_vhost production
sudo rabbitmqctl set_permissions -p production myapp ".*" ".*" ".*"

# List virtual hosts
sudo rabbitmqctl list_vhosts
```

## Managing Queues and Exchanges

```bash
# List queues
sudo rabbitmqctl list_queues -p /

# List exchanges
sudo rabbitmqctl list_exchanges -p /

# List connections
sudo rabbitmqctl list_connections
```

## Firewall Configuration

```bash
sudo firewall-cmd --add-port=5672/tcp --permanent   # AMQP
sudo firewall-cmd --add-port=15672/tcp --permanent  # Management UI
sudo firewall-cmd --reload
```

## Accessing the Management Console

The management console is available at `http://your-server:15672/`. Log in with the admin credentials you created.

## Configuration Tuning

```bash
# Edit /etc/rabbitmq/rabbitmq.conf for common settings
cat << 'CONF' | sudo tee /etc/rabbitmq/rabbitmq.conf
# Memory high watermark (40% of system RAM)
vm_memory_high_watermark.relative = 0.4

# Disk free space limit
disk_free_limit.absolute = 2GB

# Maximum number of channels per connection
channel_max = 128

# Heartbeat timeout
heartbeat = 60
CONF

sudo systemctl restart rabbitmq-server
```

Always change the default guest credentials and configure appropriate memory and disk limits before deploying RabbitMQ to production.
