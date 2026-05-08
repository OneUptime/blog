# How to Create a Custom Network with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Bridge, DNS

Description: Learn how to create and configure custom networks in Podman for container communication and isolation.

---

> Custom networks in Podman provide DNS-based service discovery, network isolation, and fine-grained control over container communication.

By default, Podman containers use the default network which provides basic connectivity. Custom networks offer additional features like automatic DNS resolution between containers, custom subnets, and network isolation for multi-container applications.

---

## Creating a Basic Custom Network

```bash
# Create a custom network

podman network create mynetwork

# Verify the network was created
podman network ls

# Inspect the network configuration
podman network inspect mynetwork
```

## Creating a Network with Custom Subnet

```bash
# Create a network with a specific subnet and gateway
podman network create \
  --subnet 10.10.0.0/24 \
  --gateway 10.10.0.1 \
  app-network

# Verify the subnet configuration
podman network inspect app-network --format '{{ range .Subnets }}{{ .Subnet }}{{ end }}'
```

## Running Containers on a Custom Network

```bash
# Run a container attached to the custom network
podman run -d --name webserver \
  --network mynetwork \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Run another container on the same network
podman run -d --name api \
  --network mynetwork \
  docker.io/library/alpine:latest tail -f /dev/null

# Containers can reach each other by name
podman exec api ping -c 3 webserver
```

## DNS Resolution on Custom Networks

Custom networks provide automatic DNS resolution:

```bash
# Container names resolve to their IP addresses
podman exec api nslookup webserver

# You can also use network aliases
podman run -d --name db \
  --network mynetwork \
  --network-alias database \
  --network-alias postgres \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

# Both aliases resolve
podman exec api ping -c 1 database
podman exec api ping -c 1 postgres
```

## Creating an Internal Network

An internal network has no external connectivity:

```bash
# Create an internal-only network
podman network create --internal backend-network

# Containers can communicate with each other but not the internet
podman run -d --name internal-app \
  --network backend-network \
  docker.io/library/alpine:latest tail -f /dev/null

podman exec internal-app ping -c 1 8.8.8.8
# ping: Network unreachable
```

## Connecting to Multiple Networks

```bash
# Create a frontend and backend network
podman network create frontend
podman network create backend

# Connect a container to multiple networks
podman run -d --name api-gateway \
  --network frontend \
  docker.io/library/nginx:latest

podman network connect backend api-gateway

# Verify network connections
podman inspect api-gateway --format '{{ json .NetworkSettings.Networks }}'
```

## Removing a Custom Network

```bash
# Stop and remove containers on the network first
podman stop webserver api
podman rm webserver api

# Remove the network
podman network rm mynetwork

# Remove all unused networks
podman network prune
```

## Summary

Custom networks in Podman provide DNS-based container discovery, network isolation, and custom subnet configuration. Create networks with `podman network create`, attach containers with `--network`, and use container names for automatic DNS resolution. Use internal networks for backend services that should not have external access, and connect containers to multiple networks for layered architectures.
