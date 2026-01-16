# How to Set Up RabbitMQ Message Broker on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, RabbitMQ, Message Queue, Messaging, Microservices, Tutorial

Description: Complete guide to installing, configuring, and managing RabbitMQ message broker on Ubuntu for reliable message queuing.

---

RabbitMQ is a robust, open-source message broker that implements AMQP (Advanced Message Queuing Protocol). It enables reliable communication between distributed services through message queuing. This guide covers installation, configuration, and management on Ubuntu.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- At least 2GB RAM
- Root or sudo access

## Installing RabbitMQ

### Add RabbitMQ Repository

```bash
# Install prerequisites
sudo apt update
sudo apt install curl gnupg apt-transport-https -y

# Add RabbitMQ signing key
curl -1sLf "https://keys.openpgp.org/vks/v1/by-fingerprint/0A9AF2115F4687BD29803A206B73A36E6026DFCA" | sudo gpg --dearmor -o /usr/share/keyrings/com.rabbitmq.team.gpg

# Add Erlang repository key
curl -1sLf "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0xf77f1eda57ebb1cc" | sudo gpg --dearmor -o /usr/share/keyrings/net.launchpad.ppa.rabbitmq.erlang.gpg

# Add RabbitMQ repository
sudo tee /etc/apt/sources.list.d/rabbitmq.list <<EOF
deb [signed-by=/usr/share/keyrings/net.launchpad.ppa.rabbitmq.erlang.gpg] http://ppa.launchpad.net/rabbitmq/rabbitmq-erlang/ubuntu $(lsb_release -cs) main
deb [signed-by=/usr/share/keyrings/com.rabbitmq.team.gpg] https://packagecloud.io/rabbitmq/rabbitmq-server/ubuntu/ $(lsb_release -cs) main
EOF

# Update package lists
sudo apt update
```

### Install Erlang and RabbitMQ

```bash
# Install Erlang (RabbitMQ dependency)
sudo apt install erlang-base erlang-asn1 erlang-crypto erlang-eldap erlang-ftp erlang-inets erlang-mnesia erlang-os-mon erlang-parsetools erlang-public-key erlang-runtime-tools erlang-snmp erlang-ssl erlang-syntax-tools erlang-tftp erlang-tools erlang-xmerl -y

# Install RabbitMQ server
sudo apt install rabbitmq-server -y
```

## Start and Enable RabbitMQ

```bash
# Start RabbitMQ service
sudo systemctl start rabbitmq-server

# Enable on boot
sudo systemctl enable rabbitmq-server

# Check status
sudo systemctl status rabbitmq-server

# Verify RabbitMQ is running
sudo rabbitmqctl status
```

## Enable Management Plugin

The management plugin provides a web UI and HTTP API:

```bash
# Enable management plugin
sudo rabbitmq-plugins enable rabbitmq_management

# List enabled plugins
sudo rabbitmq-plugins list
```

Access the management UI at `http://your_server_ip:15672`

## User Management

### Create Admin User

```bash
# Add a new admin user
sudo rabbitmqctl add_user admin SecurePassword123

# Set user tags (administrator, management, monitoring, policymaker)
sudo rabbitmqctl set_user_tags admin administrator

# Set permissions (configure, write, read) on all vhosts
sudo rabbitmqctl set_permissions -p / admin ".*" ".*" ".*"
```

### Delete Default Guest User

For security, remove or restrict the guest user:

```bash
# Delete guest user (recommended for production)
sudo rabbitmqctl delete_user guest

# Or restrict guest to localhost only (already default behavior)
```

### List Users

```bash
# List all users
sudo rabbitmqctl list_users

# List user permissions
sudo rabbitmqctl list_user_permissions admin
```

## Virtual Hosts

Virtual hosts provide logical separation:

```bash
# Create virtual host
sudo rabbitmqctl add_vhost myapp

# Set permissions for user on vhost
sudo rabbitmqctl set_permissions -p myapp admin ".*" ".*" ".*"

# List virtual hosts
sudo rabbitmqctl list_vhosts

# Delete virtual host
sudo rabbitmqctl delete_vhost myapp
```

## Configuration

### Main Configuration File

```bash
# Create RabbitMQ configuration
sudo nano /etc/rabbitmq/rabbitmq.conf
```

Basic configuration:

```ini
# Listeners
listeners.tcp.default = 5672

# Management listener
management.tcp.port = 15672

# Logging
log.file.level = info

# Memory limit (40% of system RAM)
vm_memory_high_watermark.relative = 0.4

# Disk free limit
disk_free_limit.absolute = 2GB

# Default user (for development only)
# default_user = admin
# default_pass = password
```

### Advanced Configuration

```bash
# Create advanced config
sudo nano /etc/rabbitmq/advanced.config
```

```erlang
[
  {rabbit, [
    {tcp_listeners, [5672]},
    {loopback_users, []},
    {vm_memory_high_watermark, 0.4},
    {vm_memory_high_watermark_paging_ratio, 0.5},
    {disk_free_limit, "2GB"},
    {collect_statistics_interval, 5000}
  ]},
  {rabbitmq_management, [
    {listener, [{port, 15672}]}
  ]}
].
```

### Environment Variables

```bash
# Create environment file
sudo nano /etc/rabbitmq/rabbitmq-env.conf
```

```bash
# Node name
NODENAME=rabbit@hostname

# Config file location
RABBITMQ_CONFIG_FILE=/etc/rabbitmq/rabbitmq

# Log directory
RABBITMQ_LOGS=/var/log/rabbitmq
```

## Restart After Configuration

```bash
# Restart RabbitMQ
sudo systemctl restart rabbitmq-server

# Verify configuration loaded
sudo rabbitmqctl environment
```

## Queue Management

### Using rabbitmqctl

```bash
# List queues
sudo rabbitmqctl list_queues

# List queues with details
sudo rabbitmqctl list_queues name messages consumers memory

# Purge a queue (delete all messages)
sudo rabbitmqctl purge_queue queue_name

# Delete a queue
sudo rabbitmqctl delete_queue queue_name
```

### Using Management API

```bash
# List queues via API
curl -u admin:password http://localhost:15672/api/queues

# Create queue via API
curl -u admin:password -X PUT \
  -H "Content-Type: application/json" \
  -d '{"durable":true}' \
  http://localhost:15672/api/queues/%2F/my-queue
```

## Exchange and Binding Management

```bash
# List exchanges
sudo rabbitmqctl list_exchanges

# List bindings
sudo rabbitmqctl list_bindings
```

## Enabling SSL/TLS

### Generate Certificates

```bash
# Create SSL directory
sudo mkdir -p /etc/rabbitmq/ssl
cd /etc/rabbitmq/ssl

# Generate CA
openssl genrsa -out ca-key.pem 2048
openssl req -new -x509 -days 365 -key ca-key.pem -out ca-cert.pem -subj "/CN=RabbitMQ-CA"

# Generate server certificate
openssl genrsa -out server-key.pem 2048
openssl req -new -key server-key.pem -out server-req.pem -subj "/CN=$(hostname)"
openssl x509 -req -days 365 -in server-req.pem -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem

# Set permissions
sudo chown -R rabbitmq:rabbitmq /etc/rabbitmq/ssl
sudo chmod 600 /etc/rabbitmq/ssl/*
```

### Configure SSL

```bash
sudo nano /etc/rabbitmq/rabbitmq.conf
```

```ini
# SSL listeners
listeners.ssl.default = 5671

# SSL certificate paths
ssl_options.cacertfile = /etc/rabbitmq/ssl/ca-cert.pem
ssl_options.certfile = /etc/rabbitmq/ssl/server-cert.pem
ssl_options.keyfile = /etc/rabbitmq/ssl/server-key.pem
ssl_options.verify = verify_peer
ssl_options.fail_if_no_peer_cert = false

# Management SSL
management.ssl.port = 15671
management.ssl.cacertfile = /etc/rabbitmq/ssl/ca-cert.pem
management.ssl.certfile = /etc/rabbitmq/ssl/server-cert.pem
management.ssl.keyfile = /etc/rabbitmq/ssl/server-key.pem
```

## Clustering

### Prepare Nodes

On each node, ensure the same Erlang cookie:

```bash
# Stop RabbitMQ
sudo systemctl stop rabbitmq-server

# Copy cookie from first node to others
sudo cat /var/lib/rabbitmq/.erlang.cookie

# On other nodes, set same cookie
echo "SAME_COOKIE_VALUE" | sudo tee /var/lib/rabbitmq/.erlang.cookie
sudo chown rabbitmq:rabbitmq /var/lib/rabbitmq/.erlang.cookie
sudo chmod 400 /var/lib/rabbitmq/.erlang.cookie
```

### Join Cluster

On secondary nodes:

```bash
# Start RabbitMQ
sudo systemctl start rabbitmq-server

# Stop the app (not the service)
sudo rabbitmqctl stop_app

# Reset the node
sudo rabbitmqctl reset

# Join cluster (replace rabbit@node1 with your primary node)
sudo rabbitmqctl join_cluster rabbit@node1

# Start the app
sudo rabbitmqctl start_app

# Check cluster status
sudo rabbitmqctl cluster_status
```

## High Availability Queues

Configure queue mirroring:

```bash
# Set HA policy for all queues
sudo rabbitmqctl set_policy ha-all ".*" '{"ha-mode":"all"}' --apply-to queues

# Set HA policy with replication factor
sudo rabbitmqctl set_policy ha-two "^ha\." '{"ha-mode":"exactly","ha-params":2,"ha-sync-mode":"automatic"}' --apply-to queues

# List policies
sudo rabbitmqctl list_policies
```

## Monitoring

### Check Status

```bash
# Node status
sudo rabbitmqctl status

# Cluster status
sudo rabbitmqctl cluster_status

# Queue statistics
sudo rabbitmqctl list_queues name messages consumers memory

# Connection statistics
sudo rabbitmqctl list_connections user client_properties
```

### Enable Prometheus Metrics

```bash
# Enable Prometheus plugin
sudo rabbitmq-plugins enable rabbitmq_prometheus

# Metrics available at http://localhost:15692/metrics
```

## Firewall Configuration

```bash
# Allow AMQP port
sudo ufw allow 5672/tcp

# Allow SSL AMQP port
sudo ufw allow 5671/tcp

# Allow management UI
sudo ufw allow 15672/tcp

# Allow clustering ports
sudo ufw allow 4369/tcp
sudo ufw allow 25672/tcp
```

## Troubleshooting

### RabbitMQ Won't Start

```bash
# Check logs
sudo tail -f /var/log/rabbitmq/rabbit@$(hostname).log

# Check Erlang cookie permissions
ls -la /var/lib/rabbitmq/.erlang.cookie

# Verify Erlang installation
erl -version
```

### Memory Alarm

```bash
# Check memory usage
sudo rabbitmqctl status | grep memory

# Adjust memory limit
# In rabbitmq.conf: vm_memory_high_watermark.relative = 0.6
```

### Disk Alarm

```bash
# Check disk space
df -h /var/lib/rabbitmq

# Adjust disk limit
# In rabbitmq.conf: disk_free_limit.absolute = 1GB
```

### Connection Refused

```bash
# Check RabbitMQ is listening
sudo ss -tlnp | grep 5672

# Check firewall
sudo ufw status

# Verify user permissions
sudo rabbitmqctl list_user_permissions admin
```

## Backup and Restore

### Export Definitions

```bash
# Export all definitions (users, vhosts, queues, exchanges, bindings, policies)
sudo rabbitmqctl export_definitions /tmp/rabbitmq-backup.json

# Or via API
curl -u admin:password http://localhost:15672/api/definitions > backup.json
```

### Import Definitions

```bash
# Import definitions
sudo rabbitmqctl import_definitions /tmp/rabbitmq-backup.json

# Or via API
curl -u admin:password -X POST -H "Content-Type: application/json" \
  -d @backup.json http://localhost:15672/api/definitions
```

---

RabbitMQ provides reliable message queuing for distributed systems. For production deployments, always configure clustering for high availability, enable TLS for security, and monitor queue depths and memory usage. The management plugin provides excellent visibility into broker operations.
