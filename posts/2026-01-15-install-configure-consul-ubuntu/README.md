# How to Install and Configure HashiCorp Consul on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Consul, HashiCorp, Service Discovery, Configuration, Tutorial

Description: Complete guide to installing HashiCorp Consul on Ubuntu for service discovery, configuration, and service mesh.

---

HashiCorp Consul is a service networking platform providing service discovery, configuration, and segmentation functionality. It enables services to discover each other, configure themselves, and secure their communications. This guide covers Consul installation on Ubuntu.

## Features

- Service discovery with health checking
- Key/value storage for configuration
- Service mesh with Connect
- Multi-datacenter support
- DNS and HTTP interfaces

## Prerequisites

- Ubuntu 20.04 or later
- At least 1GB RAM per server
- Root or sudo access
- Network connectivity between nodes

## Installation

### Add HashiCorp Repository

```bash
# Install prerequisites
sudo apt update
sudo apt install -y curl gnupg

# Add HashiCorp GPG key
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list

# Install Consul
sudo apt update
sudo apt install consul -y

# Verify installation
consul version
```

## Quick Start (Development)

```bash
# Start in development mode
consul agent -dev

# In another terminal, check members
consul members

# Access UI at http://localhost:8500
```

## Production Server Configuration

### Create Configuration Directory

```bash
sudo mkdir -p /etc/consul.d
sudo mkdir -p /opt/consul/data
sudo chown -R consul:consul /opt/consul
```

### Generate Encryption Key

```bash
# Generate encryption key for gossip
consul keygen
# Save this key for all nodes
```

### Server Configuration

```bash
sudo nano /etc/consul.d/consul.hcl
```

```hcl
# Consul server configuration

# Datacenter name
datacenter = "dc1"

# Data directory
data_dir = "/opt/consul/data"

# Encryption key (same on all nodes)
encrypt = "your-32-character-key-here="

# Server mode
server = true

# Number of servers to wait for bootstrap
bootstrap_expect = 3

# Node name
node_name = "consul-server-1"

# Bind address (this server's IP)
bind_addr = "192.168.1.10"

# Client address (for API and UI)
client_addr = "0.0.0.0"

# Advertise address
advertise_addr = "192.168.1.10"

# Join other servers
retry_join = ["192.168.1.10", "192.168.1.11", "192.168.1.12"]

# UI
ui_config {
  enabled = true
}

# Logging
log_level = "INFO"
enable_syslog = true

# Performance
performance {
  raft_multiplier = 1
}

# ACL configuration (enable for production)
acl {
  enabled = true
  default_policy = "deny"
  enable_token_persistence = true
}
```

### Create Systemd Service

```bash
sudo nano /etc/systemd/system/consul.service
```

```ini
[Unit]
Description=HashiCorp Consul
Documentation=https://www.consul.io/
Requires=network-online.target
After=network-online.target
ConditionFileNotEmpty=/etc/consul.d/consul.hcl

[Service]
User=consul
Group=consul
ExecStart=/usr/bin/consul agent -config-dir=/etc/consul.d/
ExecReload=/bin/kill --signal HUP $MAINPID
KillMode=process
KillSignal=SIGTERM
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

### Start Consul

```bash
# Start service
sudo systemctl daemon-reload
sudo systemctl start consul
sudo systemctl enable consul

# Check status
sudo systemctl status consul
consul members
```

## Client Configuration

```bash
sudo nano /etc/consul.d/consul.hcl
```

```hcl
# Consul client configuration

datacenter = "dc1"
data_dir = "/opt/consul/data"
encrypt = "your-32-character-key-here="

# Not a server
server = false

# Node name
node_name = "app-server-1"

# Bind to this IP
bind_addr = "192.168.1.100"

# Join servers
retry_join = ["192.168.1.10", "192.168.1.11", "192.168.1.12"]

# Enable local UI access
ui_config {
  enabled = true
}
```

## Service Registration

### Register Service via Configuration

```bash
sudo nano /etc/consul.d/web-service.hcl
```

```hcl
service {
  name = "web"
  port = 80
  tags = ["nginx", "production"]

  check {
    http = "http://localhost:80/health"
    interval = "10s"
    timeout = "2s"
  }

  meta {
    version = "1.0"
    environment = "production"
  }
}
```

### Register Service via API

```bash
# Register service
curl -X PUT -d '{
  "Name": "myapp",
  "Port": 8080,
  "Check": {
    "HTTP": "http://localhost:8080/health",
    "Interval": "10s"
  }
}' http://localhost:8500/v1/agent/service/register

# Deregister service
curl -X PUT http://localhost:8500/v1/agent/service/deregister/myapp
```

## Service Discovery

### DNS Interface

```bash
# Query service via DNS
dig @127.0.0.1 -p 8600 web.service.consul

# Query with tag
dig @127.0.0.1 -p 8600 nginx.web.service.consul

# SRV record for port info
dig @127.0.0.1 -p 8600 web.service.consul SRV
```

### HTTP API

```bash
# List all services
curl http://localhost:8500/v1/catalog/services

# Get service instances
curl http://localhost:8500/v1/catalog/service/web

# Get healthy instances only
curl http://localhost:8500/v1/health/service/web?passing=true
```

## Key/Value Store

### Using CLI

```bash
# Put value
consul kv put config/database/host "db.example.com"
consul kv put config/database/port "5432"

# Get value
consul kv get config/database/host

# List keys
consul kv get -recurse config/

# Delete key
consul kv delete config/database/host

# Delete recursively
consul kv delete -recurse config/
```

### Using HTTP API

```bash
# Put value (base64 encoded)
curl -X PUT -d 'db.example.com' http://localhost:8500/v1/kv/config/database/host

# Get value
curl http://localhost:8500/v1/kv/config/database/host

# Get all keys with prefix
curl http://localhost:8500/v1/kv/config/?recurse
```

## ACL System

### Bootstrap ACL

```bash
# Bootstrap ACL system
consul acl bootstrap

# Save the bootstrap token!
```

### Create Policy

```bash
# Create policy file
cat > node-policy.hcl << EOF
node_prefix "" {
  policy = "write"
}
service_prefix "" {
  policy = "read"
}
EOF

# Create policy
consul acl policy create -name "node-policy" -rules @node-policy.hcl
```

### Create Token

```bash
# Create token with policy
consul acl token create -description "Node token" -policy-name "node-policy"

# List tokens
consul acl token list
```

### Use Token

```bash
# Set token in config
# Add to consul.hcl:
acl {
  tokens {
    agent = "your-agent-token"
  }
}
```

## Health Checks

### HTTP Check

```hcl
check {
  id = "web-check"
  name = "Web HTTP Check"
  http = "http://localhost:80/health"
  method = "GET"
  interval = "10s"
  timeout = "2s"
}
```

### TCP Check

```hcl
check {
  id = "db-check"
  name = "Database TCP Check"
  tcp = "localhost:5432"
  interval = "10s"
  timeout = "2s"
}
```

### Script Check

```hcl
check {
  id = "custom-check"
  name = "Custom Script Check"
  args = ["/usr/local/bin/check-service.sh"]
  interval = "30s"
}
```

## Service Mesh (Connect)

### Enable Connect

```hcl
# In consul.hcl
connect {
  enabled = true
}
```

### Configure Sidecar Proxy

```hcl
service {
  name = "web"
  port = 8080

  connect {
    sidecar_service {
      proxy {
        upstreams = [
          {
            destination_name = "database"
            local_bind_port = 5432
          }
        ]
      }
    }
  }
}
```

### Start Sidecar Proxy

```bash
consul connect proxy -sidecar-for web
```

## Multi-Datacenter

### WAN Federation

```hcl
# Server in DC1
datacenter = "dc1"
primary_datacenter = "dc1"

# Server in DC2
datacenter = "dc2"
primary_datacenter = "dc1"
retry_join_wan = ["dc1-server.example.com"]
```

### Query Across Datacenters

```bash
# Query service in another DC
dig @127.0.0.1 -p 8600 web.service.dc2.consul

# HTTP API
curl http://localhost:8500/v1/catalog/service/web?dc=dc2
```

## Prepared Queries

```bash
# Create prepared query
curl -X POST -d '{
  "Name": "web-query",
  "Service": {
    "Service": "web",
    "Tags": ["production"],
    "OnlyPassing": true,
    "Failover": {
      "Datacenters": ["dc2", "dc3"]
    }
  }
}' http://localhost:8500/v1/query

# Execute query
curl http://localhost:8500/v1/query/web-query/execute
```

## Monitoring

### Check Cluster Status

```bash
# List members
consul members

# Show leader
consul operator raft list-peers

# Check server health
curl http://localhost:8500/v1/status/leader
```

### Metrics

```bash
# Enable telemetry in config
telemetry {
  prometheus_retention_time = "24h"
}

# Access metrics
curl http://localhost:8500/v1/agent/metrics?format=prometheus
```

## Troubleshooting

### Check Logs

```bash
# Systemd logs
sudo journalctl -u consul -f

# Or view syslog
sudo tail -f /var/log/syslog | grep consul
```

### Common Issues

```bash
# No leader elected
# Ensure bootstrap_expect matches actual server count
# Check network connectivity between servers

# Service not discovered
# Verify health check is passing
consul catalog services

# ACL permission denied
# Check token has correct policies
consul acl token read -id <token-id>
```

### Debugging

```bash
# Enable debug logging
consul agent -log-level=debug

# Check raft state
consul operator raft list-peers

# Monitor events
consul monitor
```

---

Consul provides essential service networking infrastructure for modern applications. Its service discovery and configuration capabilities are fundamental for microservices architectures. For comprehensive monitoring of your Consul cluster, consider using OneUptime for uptime and performance tracking.
