# How to Use Multiple Networks with a Single Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Multi-Network

Description: Learn how to attach a single Podman container to multiple networks for segmented communication.

---

> Attaching a container to multiple networks gives it access to different network segments without bridging them together.

In multi-tier applications, a container sometimes needs to communicate with services on separate networks. A reverse proxy might need access to both a frontend network and a backend network. Podman supports connecting a single container to multiple networks either at creation time or after the container is running.

---

## Creating Multiple Networks

```bash
# Create a frontend network

podman network create frontend-net

# Create a backend network
podman network create backend-net

# Verify both networks exist
podman network ls
```

## Attaching Multiple Networks at Container Creation

Pass multiple `--network` flags when running a container.

```bash
# Run a container connected to both networks
podman run -d --name proxy \
  --network frontend-net \
  --network backend-net \
  docker.io/library/nginx:alpine
```

## Connecting a Running Container to an Additional Network

If a container is already running, use `podman network connect`.

```bash
# Start a container on the frontend network
podman run -d --name webapp --network frontend-net docker.io/library/nginx:alpine

# Connect it to the backend network while it is running
podman network connect backend-net webapp
```

## Verifying Network Interfaces

```bash
# List all network interfaces inside the container
podman exec proxy ip addr show

# You will see multiple interfaces, one per network
# Podman typically names them eth0, eth1, and so on
```

## Testing Cross-Network Connectivity

```bash
# Run a database container on the backend network only
podman run -d --name db --network backend-net \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16-alpine

# The proxy container can reach the database
podman exec proxy ping -c 2 db

# A frontend-only container cannot reach the database
podman run --rm --network frontend-net docker.io/library/alpine ping -c 2 db
# This will fail because db is only on backend-net
```

## Disconnecting from a Network

```bash
# Remove the container from the frontend network
podman network disconnect frontend-net proxy

# Verify the container now only has the backend interface
podman exec proxy ip addr show
```

## Summary

Podman allows a single container to participate in multiple networks, providing fine-grained control over which services can communicate with each other. Use `--network` at creation or `podman network connect` at runtime to attach containers to additional network segments.
