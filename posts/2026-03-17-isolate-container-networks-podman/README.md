# How to Isolate Container Networks in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Isolation, Security

Description: Learn how to isolate container networks in Podman to prevent unauthorized cross-network communication.

---

> Network isolation ensures that containers on separate networks cannot reach each other, enforcing security boundaries.

Not every container should be able to talk to every other container. A database should only be reachable from the application tier, not from a public-facing proxy. Podman can enforce network isolation when user-defined bridge networks are created with the `isolate` option. This guide shows how to set up and verify that isolation.

---

## Creating Isolated Networks

```bash
# Create two separate networks

podman network create --opt isolate=1 frontend-net
podman network create --opt isolate=1 database-net

# These networks are isolated from other networks with isolate enabled
```

## Deploying Containers on Separate Networks

```bash
# Run a frontend container on the frontend network
podman run -d --name frontend \
  --network frontend-net \
  docker.io/library/nginx:alpine

# Run a database on the database network
podman run -d --name db \
  --network database-net \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16-alpine
```

## Verifying Isolation

```bash
# Try to reach the database from the frontend container
podman exec frontend ping -c 2 -W 2 db
# This will fail: the containers are on different networks

# Try by IP as well
DB_IP=$(podman inspect db --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
podman exec frontend ping -c 2 -W 2 "$DB_IP"
# This will also fail
```

## Creating a Middle-Tier With Access to Both

```bash
# The application server needs access to both networks
podman run -d --name appserver \
  --network frontend-net \
  --network database-net \
  docker.io/library/alpine sleep 3600

# The appserver can reach both the frontend and the database
podman exec appserver ping -c 1 frontend
podman exec appserver ping -c 1 db

# But the frontend still cannot reach the database directly
podman exec frontend ping -c 2 -W 2 db
# Still fails
```

## Disabling External Access

To prevent containers on a network from reaching external destinations, you can create a network with the `--internal` flag.

```bash
# Create an internal network with no outbound access
podman network create --internal restricted-net

# Containers on this network cannot reach the internet
podman run --rm --network restricted-net docker.io/library/alpine ping -c 2 -W 2 8.8.8.8
# This will fail because the network is internal only
```

## Summary

Podman can isolate containers on different bridge networks when those networks use the `isolate` option. Place containers on separate isolated networks to enforce security boundaries and use multi-network containers as controlled gateways between tiers. Use `--internal` to further restrict outbound access from a network.
