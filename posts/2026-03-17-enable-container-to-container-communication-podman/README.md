# How to Enable Container-to-Container Communication in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Communication, DNS

Description: Learn how to enable and verify direct communication between Podman containers on shared networks.

---

> Containers on the same user-defined Podman network can reach each other by name or IP without any extra configuration.

Container-to-container communication is fundamental to multi-service applications. A web server needs to talk to a database, a cache needs to be reachable by an application server, and so on. Podman provides DNS-based service discovery on user-defined networks, making it straightforward to connect containers.

---

## Using a Shared Network

Containers on the default `podman` network can communicate by IP, but DNS resolution between containers requires a user-defined network.

```bash
# Create a shared network with DNS enabled (the default)

podman network create app-net

# Run a database container
podman run -d --name postgres \
  --network app-net \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16-alpine

# Run an application container on the same network
podman run -d --name webapp \
  --network app-net \
  docker.io/library/alpine sleep 3600
```

## Testing DNS-Based Discovery

```bash
# From the webapp container, resolve the database by name
podman exec webapp nslookup postgres

# Ping the database container by name
podman exec webapp ping -c 3 postgres
```

## Connecting Over TCP

```bash
# Install a PostgreSQL client in the webapp container and test the connection
podman exec webapp apk add --no-cache postgresql-client

# Connect to the database using the container name as the hostname
podman exec webapp pg_isready -h postgres -U postgres
# Expected output: postgres:5432 - accepting connections
```

## Using Network Aliases

```bash
# Run a container with a network alias
podman run -d --name redis \
  --network app-net \
  --network-alias cache \
  docker.io/library/redis:7-alpine

# Other containers can reach it using the alias
podman exec webapp ping -c 2 cache
```

## Verifying Connectivity Between Multiple Containers

```bash
# Run a third service
podman run -d --name api \
  --network app-net \
  docker.io/library/alpine sleep 3600

# Verify that all containers can see each other
podman exec api ping -c 1 postgres
podman exec api ping -c 1 webapp
podman exec api ping -c 1 redis
podman exec webapp ping -c 1 api
```

## Summary

Containers on the same user-defined Podman network automatically discover each other via DNS. Create a shared network, attach your containers to it, and use container names or aliases as hostnames. No manual IP management or host file editing is required.
