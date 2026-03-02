# How to Install and Configure Consul on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Consul, Service Discovery, Infrastructure, DevOps

Description: A step-by-step guide to installing HashiCorp Consul on Ubuntu, configuring a cluster, enabling ACLs, and using it for service discovery and health checking.

---

Consul is a service mesh and service discovery tool from HashiCorp. At its core it provides: a distributed key-value store, health checking, service registration and discovery, and optional service mesh features with Envoy sidecar proxies. It is widely used to replace hardcoded IP addresses and ports in service configurations with dynamic lookups.

This guide covers setting up a Consul cluster on Ubuntu - from a single development node through a production-grade configuration with ACLs.

## Architecture Overview

A Consul cluster has two types of nodes:

- **Servers** - maintain cluster state, participate in Raft consensus. Always deploy 3 or 5 for production. 1 for development.
- **Clients** - run on every application node, forward queries to servers, register local services

The recommended setup is 3 server nodes plus clients on all application hosts.

## Prerequisites

- Ubuntu 20.04 or 22.04
- 3 server VMs (or 1 for dev/test)
- Network connectivity between all nodes
- sudo privileges

## Installation

HashiCorp provides an official APT repository:

```bash
# Install required packages
sudo apt-get update && sudo apt-get install -y gnupg curl

# Add HashiCorp GPG key
curl -fsSL https://apt.releases.hashicorp.com/gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

# Add the repository
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
  https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/hashicorp.list

# Install Consul
sudo apt-get update && sudo apt-get install -y consul

# Verify
consul version
```

## Generating Encryption Keys

Generate a gossip encryption key that all cluster members will share:

```bash
# Generate the key (run once, save the output)
consul keygen
# Output: a base64 string like: J54AQ6UtgVGXfXXH5+pHVA==

# Generate CA and TLS certificates for RPC encryption
consul tls ca create
# Creates: consul-agent-ca.pem, consul-agent-ca-key.pem

# Create server certificates (run for each server)
consul tls cert create -server -dc dc1 -domain consul
# Creates: dc1-server-consul-0.pem, dc1-server-consul-0-key.pem
```

## Configuring the Server Nodes

Create the configuration directory and write the server config:

```bash
sudo mkdir -p /etc/consul.d
sudo mkdir -p /var/lib/consul
```

```json
// /etc/consul.d/server.hcl (use HCL or JSON)
datacenter = "dc1"
data_dir   = "/var/lib/consul"
log_level  = "INFO"
node_name  = "consul-server-01"  # Unique per server

# Enable server mode
server           = true
bootstrap_expect = 3  # Number of servers to wait for before electing leader

# Network configuration
bind_addr   = "{{ GetPrivateInterfaces | include \"network\" \"10.0.0.0/8\" | attr \"address\" }}"
client_addr = "0.0.0.0"

# UI
ui_config {
  enabled = true
}

# Advertise this node's address to other nodes
advertise_addr = "10.0.1.10"  # This server's IP

# Gossip encryption
encrypt = "J54AQ6UtgVGXfXXH5+pHVA=="  # From consul keygen

# TLS configuration
tls {
  defaults {
    ca_file   = "/etc/consul.d/consul-agent-ca.pem"
    cert_file = "/etc/consul.d/dc1-server-consul-0.pem"
    key_file  = "/etc/consul.d/dc1-server-consul-0-key.pem"
    verify_incoming        = true
    verify_outgoing        = true
    verify_server_hostname = true
  }
}

# ACL configuration (enable before first start)
acl {
  enabled                  = true
  default_policy           = "deny"
  enable_token_persistence = true
}

# Performance
performance {
  raft_multiplier = 1  # 1 for production, higher for dev
}

# Ports
ports {
  grpc  = 8502
  https = 8501
  http  = 8500  # Disable in production (use HTTPS only)
}

# Retry join - list of server addresses to join
retry_join = ["10.0.1.10", "10.0.1.11", "10.0.1.12"]
```

Copy the config to all three servers, adjusting `node_name` and `advertise_addr` for each.

## Configuring Client Nodes

On application servers that will register services:

```hcl
# /etc/consul.d/client.hcl
datacenter = "dc1"
data_dir   = "/var/lib/consul"
log_level  = "INFO"
node_name  = "app-server-01"

# Client mode (server = false is the default)
server = false

bind_addr    = "0.0.0.0"
client_addr  = "127.0.0.1"  # Only accept local connections from this host
advertise_addr = "10.0.2.10"  # This client's IP

encrypt = "J54AQ6UtgVGXfXXH5+pHVA=="

tls {
  defaults {
    ca_file         = "/etc/consul.d/consul-agent-ca.pem"
    verify_outgoing = true
  }
}

acl {
  enabled                  = true
  default_policy           = "deny"
  enable_token_persistence = true
}

# Join server cluster
retry_join = ["10.0.1.10", "10.0.1.11", "10.0.1.12"]
```

## Setting Up Systemd Service

```bash
# The APT package installs a systemd unit - just enable it
sudo systemctl enable consul
sudo systemctl start consul

# Watch startup
sudo journalctl -u consul -f
```

## Bootstrapping ACLs

After the cluster starts, bootstrap the ACL system to generate the initial management token:

```bash
# Run this ONCE on any server node
consul acl bootstrap

# Save the output - you get a token like:
# AccessorID:   <uuid>
# SecretID:     <management-token-uuid>
# Description:  Bootstrap Token (Global Management)
# Policies:     global-management

# Export the token for subsequent commands
export CONSUL_HTTP_TOKEN="<management-token-uuid>"
export CONSUL_HTTP_ADDR="https://localhost:8501"
export CONSUL_TLS_SERVER_NAME="server.dc1.consul"
export CONSUL_CACERT="/etc/consul.d/consul-agent-ca.pem"
```

Create an agent token for servers and clients:

```bash
# Create an agent policy
consul acl policy create \
  -name "agent-policy" \
  -rules @- << 'POLICY'
node_prefix "" {
  policy = "write"
}
service_prefix "" {
  policy = "read"
}
POLICY

# Create a token with this policy
consul acl token create \
  -description "Agent Token" \
  -policy-name "agent-policy"
# Save the SecretID

# Apply the token to all agents
consul acl set-agent-token agent "<agent-token-secret-id>"
```

## Registering a Service

Services can be registered via config file or HTTP API.

### Config File Registration

```json
// /etc/consul.d/nginx.hcl
service {
  id   = "nginx-01"
  name = "nginx"
  port = 80
  tags = ["web", "production"]

  # Health check
  check {
    id       = "nginx-http"
    name     = "Nginx HTTP Check"
    http     = "http://localhost:80/health"
    interval = "10s"
    timeout  = "1s"
  }
}
```

```bash
sudo systemctl reload consul
# Or register via API
```

### API Registration

```bash
# Register a service via HTTP API
curl -H "X-Consul-Token: $CONSUL_HTTP_TOKEN" \
  -X PUT \
  -H "Content-Type: application/json" \
  --cacert /etc/consul.d/consul-agent-ca.pem \
  https://localhost:8501/v1/agent/service/register \
  -d '{
    "ID": "postgres-01",
    "Name": "postgres",
    "Port": 5432,
    "Check": {
      "TCP": "localhost:5432",
      "Interval": "10s"
    }
  }'
```

## Querying Services

```bash
# Discover healthy instances of a service
consul catalog services

# Find all healthy nginx instances
curl "http://localhost:8500/v1/health/service/nginx?passing=true"

# DNS query (Consul runs a DNS server on port 8600)
dig @127.0.0.1 -p 8600 nginx.service.consul

# Query a specific datacenter
dig @127.0.0.1 -p 8600 nginx.service.dc1.consul
```

Configure your system to use Consul DNS:

```bash
# /etc/systemd/resolved.conf.d/consul.conf
[Resolve]
DNS=127.0.0.1:8600
DOMAINS=~consul
```

```bash
sudo systemctl restart systemd-resolved
# Now you can resolve consul names without specifying the port
dig nginx.service.consul
```

## Key-Value Store

```bash
# Write a value
consul kv put config/app/db_host "db.internal"
consul kv put config/app/db_port "5432"

# Read a value
consul kv get config/app/db_host

# List all keys under a prefix
consul kv get -recurse config/app/

# Delete a key
consul kv delete config/app/db_host

# Atomic compare-and-swap (optimistic locking)
consul kv put -cas -modify-index=5 config/app/db_host "new-db.internal"
```

## Verifying Cluster Health

```bash
# Check cluster member status
consul members

# Check Raft leader
consul operator raft list-peers

# Check overall health
consul info

# View services and their health
consul catalog services
consul health checks
```

## Troubleshooting

**Agent fails to join cluster:**
```bash
# Check connectivity
nc -zv 10.0.1.10 8301  # Gossip port (TCP and UDP)
nc -zv 10.0.1.10 8300  # RPC port

# Check firewall
sudo ufw status
sudo iptables -L -n | grep -E '8300|8301|8500|8501|8502|8600'
```

**ACL token errors:**
```bash
# Verify the token is set
echo $CONSUL_HTTP_TOKEN

# Test with the API directly
curl -H "X-Consul-Token: $CONSUL_HTTP_TOKEN" http://localhost:8500/v1/acl/info
```

**Leader not elected:**
- Check `bootstrap_expect` matches the number of servers
- Verify network connectivity between server nodes
- All servers must use the same `datacenter` and `encrypt` key

Consul handles a lot of the heavy lifting for dynamic infrastructure - service addresses no longer need to be hardcoded, health checks are automatic, and DNS integration means most applications can discover services without any code changes.
