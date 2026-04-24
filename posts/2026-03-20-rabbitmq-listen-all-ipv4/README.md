# How to Configure RabbitMQ to Listen on All IPv4 Interfaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, IPv4, Listeners, All Interfaces, AMQP, Messaging

Description: Configure RabbitMQ to listen on all IPv4 interfaces (0.0.0.0) for AMQP traffic, and use virtual host permissions and firewall rules for access control.

## Introduction

RabbitMQ listens on port 5672 on all available interfaces by default. Explicitly setting `listeners.tcp.1 = 0.0.0.0:5672` forces an IPv4 all-interface listener, and combining it with user permissions, virtual host ACLs, and firewall rules provides the right security model for environments where multiple interfaces are needed.

## Default and Explicit All-Interface Binding

```bash
# /etc/rabbitmq/rabbitmq.conf

# Explicit IPv4 all-interface binding

listeners.tcp.1 = 0.0.0.0:5672

# Restrict management to localhost only (security best practice)
management.tcp.ip = 127.0.0.1
management.tcp.port = 15672
```

## Access Control via User Permissions

```bash
# RabbitMQ access control is primarily through users and vhosts
# even when listening on all interfaces

# Create admin user
sudo rabbitmqctl add_user admin AdminPass123
sudo rabbitmqctl set_user_tags admin administrator

# Create application user with specific vhost access
sudo rabbitmqctl add_vhost /myapp
sudo rabbitmqctl add_user appuser AppPassword123
sudo rabbitmqctl set_permissions -p /myapp appuser ".*" ".*" ".*"

# Create read-only user
sudo rabbitmqctl add_user readonly ReadOnlyPass
sudo rabbitmqctl set_permissions -p /myapp readonly "" "" ".*"

# Delete guest user if it is not needed (recommended in production)
sudo rabbitmqctl delete_user guest
```

## Firewall Rules

```bash
# Allow AMQP from app servers only
sudo ufw allow from 10.0.0.0/24 to any port 5672
sudo ufw deny 5672

# Allow management only from admin workstation
sudo ufw allow from 10.0.0.1 to any port 15672
sudo ufw deny 15672

# iptables
sudo iptables -A INPUT -p tcp --dport 5672 -s 10.0.0.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5672 -j DROP
sudo iptables -A INPUT -p tcp --dport 15672 -s 10.0.0.1/32 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 15672 -j DROP
```

## Verifying All-Interface Listening

```bash
# Check current listeners
sudo rabbitmq-diagnostics listeners

# Network status
sudo ss -tlnp | grep :5672
# Expected: 0.0.0.0:5672

# Check listener interfaces with terse output
sudo rabbitmq-diagnostics -s listeners

# Test connectivity from multiple sources
nc -zv 10.0.0.5 5672   # Via internal IP
nc -zv 127.0.0.1 5672  # Via loopback
```

## Monitoring Active Connections

```bash
# List all active AMQP connections with client IPs
sudo rabbitmqctl list_connections peer_host peer_port user vhost state

# Count connections per source IP
sudo rabbitmqctl list_connections peer_host | sort | uniq -c | sort -rn

# Check connection stats
sudo rabbitmqctl list_connections | head -20
```

## Conclusion

RabbitMQ listens on port 5672 on all available interfaces by default. To force IPv4 all-interface binding, set `listeners.tcp.1 = 0.0.0.0:5672`. When listening on all interfaces, secure access through: creating per-vhost users with minimal permissions, deleting or changing the default `guest` user, and firewall rules restricting which IPs can reach port 5672. Restrict the management plugin to localhost with `management.tcp.ip = 127.0.0.1` and access it via SSH tunnel from remote admin workstations.
