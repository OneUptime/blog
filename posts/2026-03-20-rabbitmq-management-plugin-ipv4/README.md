# How to Configure RabbitMQ Management Plugin for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Management Plugin, IPv4, HTTP API, Web UI, Monitoring

Description: Configure the RabbitMQ management plugin to listen on a specific IPv4 address, restrict access, enable HTTPS, and use the HTTP API for monitoring and administration.

## Introduction

The RabbitMQ management plugin provides a web UI and REST API on port 15672. By default it listens on all interfaces. Restricting it to a specific IPv4 (or localhost) and enabling HTTPS prevents unauthorized access to the admin interface.

## Enabling the Management Plugin

```bash
# Enable the management plugin

sudo rabbitmq-plugins enable rabbitmq_management

# Node restart is not required after plugin activation

# Default local access: http://localhost:15672 (guest/guest)
```

## Restricting to Specific IPv4

```bash
# /etc/rabbitmq/rabbitmq.conf

# Bind management to specific IP
management.tcp.ip = 10.0.0.5
management.tcp.port = 15672

# Or restrict to localhost only (access via SSH tunnel)
# management.tcp.ip = 127.0.0.1
# management.tcp.port = 15672

# Allow origin for CORS (if using API from browser)
# management.cors.allow_origins.1 = https://admin.example.com
```

## Enabling HTTPS for Management

```bash
# /etc/rabbitmq/rabbitmq.conf

# HTTPS management (SSL)
management.ssl.port = 15671
management.ssl.ip = 10.0.0.5
management.ssl.cacertfile = /etc/rabbitmq/ca.crt
management.ssl.certfile   = /etc/rabbitmq/server.crt
management.ssl.keyfile    = /etc/rabbitmq/server.key
```

## Creating Management Users

```bash
# Create admin user with administrator tag
sudo rabbitmqctl add_user mqadmin AdminPass123
sudo rabbitmqctl set_user_tags mqadmin administrator

# Create monitoring user (read-only in the UI/API)
sudo rabbitmqctl add_user monitor MonitorPass
sudo rabbitmqctl set_user_tags monitor monitoring

# Grant permissions on the default / vhost
sudo rabbitmqctl set_permissions -p "/" mqadmin ".*" ".*" ".*"
sudo rabbitmqctl set_permissions -p "/" monitor "^$" "^$" "^$"

# Remove default guest user
sudo rabbitmqctl delete_user guest
```

## Using the HTTP API

```bash
# List all queues via API
curl -s -u mqadmin:AdminPass123 \
  http://10.0.0.5:15672/api/queues | python3 -m json.tool

# Get queue details
curl -s -u mqadmin:AdminPass123 \
  "http://10.0.0.5:15672/api/queues/%2F/my-queue"

# Check whether the node is in service
curl -s -u mqadmin:AdminPass123 \
  http://10.0.0.5:15672/api/health/checks/is-in-service

# List connections with source IPs
curl -s -u mqadmin:AdminPass123 \
  "http://10.0.0.5:15672/api/connections" | \
  python3 -c "import sys,json; [print(c['peer_host'],c['user']) for c in json.load(sys.stdin)]"
```

## SSH Tunnel for Remote Access

```bash
# If management is bound to 127.0.0.1, access remotely via SSH tunnel:
ssh -L 15672:127.0.0.1:15672 user@10.0.0.5

# Then access in browser: http://localhost:15672
```

## Conclusion

Restrict the RabbitMQ management plugin to a specific IPv4 using `management.tcp.ip` (and `management.ssl.ip` for HTTPS). For the most secure setup, bind to `127.0.0.1` and use SSH tunnels for remote access. Enable HTTPS with `management.ssl.*` settings. Remove the default `guest` user and create named admin accounts. The HTTP API on port 15672/15671 provides programmatic access for monitoring and automation.
