# How to Install and Configure RabbitMQ on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RabbitMQ, Message Broker, AMQP, Erlang

Description: Learn how to install and configure RabbitMQ on RHEL as a reliable AMQP message broker with management console.

---

RabbitMQ is a widely-used open-source message broker that implements AMQP (Advanced Message Queuing Protocol). It supports flexible routing, clustering, and has a rich management interface.

## Installing Erlang and RabbitMQ

```bash
# Import RabbitMQ repository signing keys
sudo rpm --import 'https://github.com/rabbitmq/signing-keys/releases/download/3.0/rabbitmq-release-signing-key.asc'
sudo rpm --import 'https://github.com/rabbitmq/signing-keys/releases/download/3.0/cloudsmith.rabbitmq-erlang.E495BB49CC4BBE5B.key'
sudo rpm --import 'https://github.com/rabbitmq/signing-keys/releases/download/3.0/cloudsmith.rabbitmq-server.9F4587F226208342.key'

# Install Erlang and RabbitMQ repositories for RHEL 9
cat << 'REPO' | sudo tee /etc/yum.repos.d/rabbitmq.repo
[modern-erlang]
name=modern-erlang-el9
baseurl=https://yum1.rabbitmq.com/erlang/el/9/$basearch
        https://yum2.rabbitmq.com/erlang/el/9/$basearch
repo_gpgcheck=1
enabled=1
gpgkey=https://github.com/rabbitmq/signing-keys/releases/download/3.0/cloudsmith.rabbitmq-erlang.E495BB49CC4BBE5B.key
gpgcheck=1
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
metadata_expire=300
pkg_gpgcheck=1
autorefresh=1
type=rpm-md

[modern-erlang-noarch]
name=modern-erlang-el9-noarch
baseurl=https://yum1.rabbitmq.com/erlang/el/9/noarch
        https://yum2.rabbitmq.com/erlang/el/9/noarch
repo_gpgcheck=1
enabled=1
gpgkey=https://github.com/rabbitmq/signing-keys/releases/download/3.0/cloudsmith.rabbitmq-erlang.E495BB49CC4BBE5B.key
       https://github.com/rabbitmq/signing-keys/releases/download/3.0/rabbitmq-release-signing-key.asc
gpgcheck=1
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
metadata_expire=300
pkg_gpgcheck=1
autorefresh=1
type=rpm-md

[rabbitmq-el9]
name=rabbitmq-el9
baseurl=https://yum1.rabbitmq.com/rabbitmq/el/9/noarch
        https://yum2.rabbitmq.com/rabbitmq/el/9/noarch
repo_gpgcheck=1
enabled=1
gpgkey=https://github.com/rabbitmq/signing-keys/releases/download/3.0/cloudsmith.rabbitmq-server.9F4587F226208342.key
       https://github.com/rabbitmq/signing-keys/releases/download/3.0/rabbitmq-release-signing-key.asc
gpgcheck=1
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
metadata_expire=300
pkg_gpgcheck=1
autorefresh=1
type=rpm-md
REPO

# Install packages
sudo dnf install -y logrotate erlang rabbitmq-server
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

Always remove or replace the default guest credentials and configure appropriate memory and disk limits before deploying RabbitMQ to production.
