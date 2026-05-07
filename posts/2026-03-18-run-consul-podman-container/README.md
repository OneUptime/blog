# How to Run Consul in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Consul, Service Discovery, HashiCorp, Configuration

Description: Learn how to run HashiCorp Consul in a Podman container for service discovery, health checking, and key-value configuration storage.

---

> Consul in Podman provides service discovery, health checking, and a distributed key-value store in a container that can run rootless.

HashiCorp Consul is a service networking platform that provides service discovery, configuration management, and health checking for distributed systems. Running it in a Podman container gives you an isolated, portable Consul agent or server ready for development and testing. This guide covers single-node setup, service registration, the KV store, health checks, and the web UI.

---

## Pulling the Consul Image

Download the official Consul image.

```bash
# Pull the latest Consul image

podman pull docker.io/hashicorp/consul:latest

# Verify the image
podman images | grep consul
```

## Running a Consul Dev Server

Start Consul in development mode for quick testing.

```bash
# Run Consul in dev mode with the UI enabled
podman run -d \
  --name my-consul \
  -p 8500:8500 \
  -p 8600:8600/udp \
  docker.io/hashicorp/consul:latest agent -dev -node=consul -client=0.0.0.0 -ui

# Check the container is running
podman ps

# Verify Consul is responding
curl -s http://localhost:8500/v1/status/leader

# Access the Consul UI
echo "Open http://localhost:8500/ui in your browser"
```

## Persistent Data Storage

Use volumes to persist Consul data across restarts.

```bash
# Create a volume for Consul data
podman volume create consul-data

# Run Consul in single-server mode with persistent storage
podman run -d \
  --name consul-persistent \
  -p 8501:8500 \
  -p 8601:8600/udp \
  -v consul-data:/consul/data:Z \
  docker.io/hashicorp/consul:latest agent -server -bootstrap-expect=1 -node=consul-persistent -client=0.0.0.0 -ui -data-dir=/consul/data

# Verify the volume
podman volume inspect consul-data
```

## Registering Services

Register services with Consul for service discovery.

```bash
# Register a service using the HTTP API
curl -s -X PUT http://localhost:8500/v1/agent/service/register \
  -H 'Content-Type: application/json' \
  -d '{
    "ID": "web-1",
    "Name": "web",
    "Tags": ["primary", "v1"],
    "Address": "127.0.0.1",
    "Port": 8500,
    "Check": {
      "HTTP": "http://127.0.0.1:8500/v1/status/leader",
      "Interval": "10s",
      "Timeout": "5s"
    }
  }'

# Register another instance of the same service
curl -s -X PUT http://localhost:8500/v1/agent/service/register \
  -H 'Content-Type: application/json' \
  -d '{
    "ID": "web-2",
    "Name": "web",
    "Tags": ["secondary", "v1"],
    "Address": "127.0.0.1",
    "Port": 8500
  }'

# List all registered services
curl -s http://localhost:8500/v1/agent/services | python3 -m json.tool

# Query a specific service
curl -s http://localhost:8500/v1/catalog/service/web | python3 -m json.tool

# Deregister a service
curl -s -X PUT http://localhost:8500/v1/agent/service/deregister/web-2
```

## Using the Key-Value Store

Store and retrieve configuration data in Consul's KV store.

```bash
# Store a key-value pair
curl -s -X PUT -d 'postgres://db.example.com:5432/myapp' \
  http://localhost:8500/v1/kv/config/database/connection-string

# Store a JSON configuration value
curl -s -X PUT \
  -d '{"host": "redis.example.com", "port": 6379, "ttl": 300}' \
  http://localhost:8500/v1/kv/config/cache/settings

# Read a value (returned as base64-encoded)
curl -s http://localhost:8500/v1/kv/config/database/connection-string | python3 -m json.tool

# Read and decode the value
curl -s http://localhost:8500/v1/kv/config/database/connection-string | \
  python3 -c "import sys,json,base64; data=json.load(sys.stdin); print(base64.b64decode(data[0]['Value']).decode())"

# List all keys under a prefix
curl -s http://localhost:8500/v1/kv/config/?keys | python3 -m json.tool

# Delete a key
curl -s -X DELETE http://localhost:8500/v1/kv/config/cache/settings
```

## Custom Consul Configuration

Mount a custom configuration file for advanced settings.

```bash
# Create a config directory
mkdir -p ~/consul-config

# Write a custom Consul server configuration
cat > ~/consul-config/consul.hcl <<'EOF'
# Datacenter name
datacenter = "dc1"

# Data directory
data_dir = "/consul/data"

# Client address for HTTP, DNS, and gRPC interfaces
client_addr = "0.0.0.0"

# Server mode
server = true
bootstrap_expect = 1

# UI
ui_config {
  enabled = true
}

# Performance tuning
performance {
  raft_multiplier = 1
}

# Logging
log_level = "INFO"

# DNS configuration
ports {
  dns = 8600
}

# Enable script checks
enable_local_script_checks = true
EOF

# Create a separate volume for this Consul server data
podman volume create consul-custom-data

# Run Consul with custom config
podman run -d \
  --name consul-custom \
  -p 8502:8500 \
  -p 8602:8600/udp \
  -v ~/consul-config/consul.hcl:/consul/config/consul.hcl:Z \
  -v consul-custom-data:/consul/data:Z \
  docker.io/hashicorp/consul:latest agent -config-file=/consul/config/consul.hcl

# Verify the cluster members
podman exec consul-custom consul members
```

## DNS Service Discovery

Use Consul's DNS interface to discover services.

```bash
# Query for a service using DNS (requires dig or nslookup)
dig @localhost -p 8600 web.service.consul SRV

# Query for a specific tagged service
dig @localhost -p 8600 primary.web.service.consul SRV

# Query for a node
dig @localhost -p 8600 consul.node.consul
```

## Managing the Container

Common management operations.

```bash
# View Consul logs
podman logs my-consul

# Check cluster members
podman exec my-consul consul members

# List the Raft peers
podman exec my-consul consul operator raft list-peers

# Stop and start
podman stop my-consul
podman start my-consul

# Remove containers and volumes
podman rm -f my-consul consul-persistent consul-custom
podman volume rm consul-data consul-custom-data
```

## Summary

Running Consul in a Podman container gives you a complete service networking platform with service discovery, health checking, and a distributed key-value store. The dev mode server is ideal for local development and testing, while custom configurations support production-like setups. The HTTP API enables service registration and KV operations, and the DNS interface provides transparent service discovery. The built-in web UI offers visual management of services and configuration. When Podman is run rootless, it adds another layer of isolation for your service mesh infrastructure.
