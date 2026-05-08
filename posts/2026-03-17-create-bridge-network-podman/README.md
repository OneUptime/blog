# How to Create a Bridge Network with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Bridge, Linux

Description: Learn how to create and configure bridge networks in Podman for container-to-container communication.

---

> Bridge networks are the default and most common network type in Podman. They create a virtual network switch that connects containers on the same host.

A bridge network creates a software-based network bridge on the host, allowing containers connected to it to communicate with each other while providing isolation from other networks. Podman uses Netavark as its default networking backend.

---

## Creating a Basic Bridge Network

```bash
# Create a bridge network (bridge is the default driver)

podman network create my-bridge

# Explicitly specify the bridge driver
podman network create --driver bridge my-bridge-explicit

# Verify the network type
podman network inspect my-bridge --format '{{ .Driver }}'
# Output: bridge
```

## Bridge Network with Custom Subnet

```bash
# Create a bridge with specific IP configuration
podman network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  --gateway 172.20.0.1 \
  --ip-range 172.20.1.0/24 \
  custom-bridge

# Verify the configuration
podman network inspect custom-bridge --format '{{ range .Subnets }}Subnet: {{ .Subnet }}, Gateway: {{ .Gateway }}{{ end }}'
```

## Connecting Containers to a Bridge

```bash
# Run containers on the bridge network
podman run -d --name web \
  --network my-bridge \
  -p 8080:80 \
  docker.io/library/nginx:latest

podman run -d --name app \
  --network my-bridge \
  docker.io/library/alpine:latest tail -f /dev/null

# Containers can communicate by name
podman exec app ping -c 3 web
```

## Bridge Network with DNS

```bash
# DNS is enabled by default on custom bridge networks
podman network create app-bridge

# Containers get automatic DNS resolution
podman run -d --name svc1 --network app-bridge \
  docker.io/library/alpine:latest tail -f /dev/null
podman run -d --name svc2 --network app-bridge \
  docker.io/library/alpine:latest tail -f /dev/null

podman exec svc1 nslookup svc2
```

## Bridge Network Options

```bash
# Create with labels for organization
podman network create \
  --driver bridge \
  --label project=myapp \
  --label environment=dev \
  myapp-bridge

# Create with specific MTU
podman network create \
  --driver bridge \
  --opt mtu=9000 \
  jumbo-bridge

# Create as internal-only (no external access)
podman network create \
  --driver bridge \
  --internal \
  isolated-bridge
```

## Viewing the Host Bridge Interface

```bash
# List network interfaces created by Podman
ip link show type bridge

# View a bridge's interface name, then inspect the interface
podman network inspect my-bridge --format '{{ .NetworkInterface }}'
ip addr show <bridge-interface>

# Check bridge forwarding rules
sudo iptables -L -n | grep -A5 FORWARD
```

## Multiple Bridge Networks for Isolation

```bash
# Create separate isolated networks for different tiers
podman network create --subnet 10.1.0.0/24 --opt isolate frontend-bridge
podman network create --subnet 10.2.0.0/24 --opt isolate backend-bridge

# Frontend containers cannot reach backend containers
podman run -d --name web --network frontend-bridge \
  docker.io/library/alpine:latest tail -f /dev/null
podman run -d --name db --network backend-bridge \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

# This will fail - the networks are isolated
podman exec web ping -c 1 db
# ping: bad address 'db'
```

## Summary

Bridge networks in Podman create virtual network switches for container communication on the same host. They provide DNS resolution, network isolation, and configurable IP addressing. Create bridge networks with custom subnets, gateways, and options like MTU or internal-only mode. Use multiple bridge networks to isolate application tiers and control which containers can communicate with each other.
