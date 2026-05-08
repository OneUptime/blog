# How to Run a Container with a Specific Network in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking

Description: Learn how to create custom networks in Podman and run containers on specific networks for isolated and controlled communication.

---

> Custom networks give you control over container communication, DNS resolution, and network isolation without complex host-level configuration.

By default, rootful Podman containers use the `podman` bridge network, while rootless containers use user-mode networking such as `pasta`. However, for multi-container applications, you need custom networks that provide automatic DNS resolution between containers, network isolation, and fine-grained control over IP addressing.

This guide covers how to create and manage custom networks in Podman and how to attach containers to them.

---

## Listing Available Networks

Start by seeing what networks already exist:

```bash
# List all Podman networks

podman network ls

# Get detailed information about a network
podman network inspect podman
```

## Creating a Custom Network

Create a new bridge network for your containers:

```bash
# Create a simple custom network
podman network create my-app-network

# Create a network with a specific subnet
podman network create --subnet 10.89.0.0/24 backend-net

# Create a network with a specific gateway
podman network create --subnet 10.90.0.0/24 --gateway 10.90.0.1 frontend-net

# Create a network with a custom IP range for containers
podman network create \
  --subnet 10.91.0.0/24 \
  --gateway 10.91.0.1 \
  --ip-range 10.91.0.128/25 \
  limited-net

# Verify the network was created
podman network inspect my-app-network
```

## Running a Container on a Specific Network

Use the `--network` flag to attach a container to a custom network:

```bash
# Run a container on the custom network
podman run -d --name web --network my-app-network nginx:latest

# Run another container on the same network
podman run -d --name api --network my-app-network alpine sleep infinity

# Containers on the same network can reach each other by name
podman exec api sh -c "ping -c 3 web"
```

DNS resolution between containers on the same custom bridge network is automatic when DNS is enabled for the network.

## Assigning a Static IP Address

```bash
# Assign a specific IP to a container
podman run -d --name static-web \
  --network backend-net \
  --ip 10.89.0.100 \
  nginx:latest

# Verify the IP address
podman inspect static-web --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
```

## Assigning a MAC Address

```bash
# Set a custom MAC address
podman run -d --name custom-mac \
  --network my-app-network \
  --mac-address 02:42:ac:11:00:ff \
  alpine sleep infinity

# Verify the MAC address
podman inspect custom-mac --format '{{range .NetworkSettings.Networks}}{{.MacAddress}}{{end}}'
```

## Connecting a Container to Multiple Networks

A container can be connected to more than one network:

```bash
# Create two networks
podman network create net-frontend
podman network create net-backend

# Start a container on the frontend network
podman run -d --name gateway --network net-frontend nginx:latest

# Also connect it to the backend network
podman network connect net-backend gateway

# Verify both networks
podman inspect gateway --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool

# Disconnect from a network
podman network disconnect net-frontend gateway
```

## Network Isolation Between Containers

Containers on different networks cannot communicate:

```bash
# Create isolated networks
podman network create isolated-a
podman network create isolated-b

# Run containers on different networks
podman run -d --name server-a --network isolated-a alpine sleep infinity
podman run -d --name server-b --network isolated-b alpine sleep infinity

# This will fail - containers are on different networks
podman exec server-a ping -c 2 -W 2 server-b 2>&1 || echo "Cannot reach server-b (expected - different networks)"

# Clean up
podman stop server-a server-b && podman rm server-a server-b
```

## Practical Example: Multi-Tier Application

```bash
# Create separate networks for each tier
podman network create --subnet 10.100.0.0/24 web-tier
podman network create --subnet 10.101.0.0/24 app-tier
podman network create --subnet 10.102.0.0/24 db-tier

# Database - only on the db-tier network
podman run -d --name postgres \
  --network db-tier \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# Application - connected to both app-tier and db-tier
podman run -d --name app-server \
  --network app-tier \
  alpine sleep infinity
podman network connect db-tier app-server

# Web proxy - connected to both web-tier and app-tier
podman run -d --name web-proxy \
  --network web-tier \
  -p 8080:80 \
  nginx:latest
podman network connect app-tier web-proxy

# The web proxy can reach the app server
podman exec web-proxy sh -c "ping -c 1 app-server" 2>/dev/null && echo "web-proxy can reach app-server"

# The app server can reach the database
podman exec app-server sh -c "ping -c 1 postgres" 2>/dev/null && echo "app-server can reach postgres"

# But the web proxy cannot reach the database directly
podman exec web-proxy sh -c "ping -c 1 -W 2 postgres" 2>/dev/null || echo "web-proxy cannot reach postgres (expected)"
```

## Using the Host Network

For maximum performance, use the host network (no isolation):

```bash
# Run on the host network - container shares the host's network stack
podman run -d --name host-networked \
  --network host \
  nginx:latest

# If host port 80 is available and permitted, the container listens directly on it
curl -s http://localhost:80 | head -5
```

## Disabling Networking

For fully isolated containers that need no network:

```bash
# Run with no network access
podman run --network none --rm alpine sh -c "
  ping -c 1 8.8.8.8 2>&1 || echo 'No network access (expected)'
  echo 'Container is fully isolated'
"
```

## Removing Networks

```bash
# Remove a specific network (must have no connected containers)
podman network rm my-app-network

# Remove all unused networks
podman network prune

# Force remove a network and stop/remove containers that use it
podman network rm -f my-app-network
```

## Summary

Custom networks in Podman provide powerful control over container communication:

- Use `podman network create` to create isolated networks with custom subnets
- Use `--network` to attach containers to specific networks
- Containers on the same custom network get automatic DNS resolution
- Use `podman network connect` to attach a container to multiple networks
- Use `--ip` and `--mac-address` for static addressing
- Use `--network host` for host-level performance
- Use `--network none` for full isolation

Custom networks are essential for multi-container applications where you need to control which containers can communicate with each other.
