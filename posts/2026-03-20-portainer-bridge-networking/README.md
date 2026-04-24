# How to Understand Docker Bridge Networking in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Networking, Bridge Network, Container Communication, Network Management

Description: Learn how Docker bridge networking works in Portainer, how to create and manage custom bridge networks, and how containers communicate within them.

---

The default `bridge` network is Docker's default network for standalone containers on Linux. Each user-defined bridge network creates a software bridge on the host, and containers on the same user-defined bridge can communicate by name. Portainer provides a visual interface for managing these networks.

## How Bridge Networks Work

```mermaid
graph TD
    Host[Docker Host] --> Bridge0[Default bridge network (docker0 on Linux)]
    Host --> Bridge1[Custom Bridge: my-app_net]
    Bridge0 --> C1[Container A - IP only]
    Bridge0 --> C2[Container B - IP only]
    Bridge1 --> C3[Service api]
    Bridge1 --> C4[Service postgres]
    C3 -- "postgres:5432" --> C4
```

The default `bridge` network (`docker0` on Linux) does not support DNS-based container name resolution. User-defined bridges created by Docker Compose or manually do support it - containers resolve each other by service name or alias.

## Creating a Network in Portainer

In Portainer, go to **Networks > Add network**:

- **Name**: `my-app-net`
- **Driver**: `bridge`
- **Subnet**: `172.20.0.0/16` (optional - Docker assigns one if left blank)
- **Gateway**: `172.20.0.1` (optional)
- **IP range**: `172.20.0.0/24` (optional, restricts automatic IP assignment)

## Custom Bridge Network in a Stack

Define isolated networks per stack to keep services isolated unless they share a network:

```yaml
services:
  api:
    image: my-api:latest
    networks:
      - frontend     # Accessible from the ingress
      - backend      # Can reach the database
    ports:
      - "3000:3000"

  postgres:
    image: postgres:15
    networks:
      - backend      # Isolated - only reachable from backend network
    environment:
      POSTGRES_PASSWORD: secret

  nginx:
    image: nginx:alpine
    networks:
      - frontend     # Only needs to reach the API
    ports:
      - "80:80"

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true   # Creates an externally isolated backend network
```

## Inspecting Networks via Portainer

View network details including connected containers and IPAM config:

```bash
# List all networks

docker network ls

# Inspect a specific network
docker network inspect my-app_backend | jq '.[0] | {Subnet: .IPAM.Config[0].Subnet, Containers: (.Containers | keys)}'
```

In Portainer, click **Networks** then click the network name to see connected containers and IP assignments.

## Connecting a Running Container to a Network

Attach a container to an additional network without restarting it:

```bash
# Connect container to another network
docker network connect my-app_frontend my-container-name

# Disconnect from a network
docker network disconnect my-app_backend my-container-name
```

In Portainer, open the container details page to connect or disconnect networks. For networks created in Portainer, enable manual container attachment when you create the network.

## Network Isolation Best Practices

| Practice | Benefit |
|----------|---------|
| Use `internal: true` for database networks | Creates an externally isolated network for containers on that network |
| Create per-stack networks | Containers on separate user-defined networks are isolated by default |
| Avoid the default `bridge` network | No automatic DNS-based container name resolution |
| Limit ports exposed to host | Reduces attack surface |
| Use separate frontend and backend networks | Defense in depth |

## Troubleshooting Connectivity

Test connectivity between containers on the same bridge:

```bash
# From inside the api container, test database connectivity (if `nc` is installed in the image)
docker exec -it $(docker ps -qf name=api) sh -c "nc -zv postgres 5432 && echo OK"

# Check which networks a container is on
docker inspect $(docker ps -qf name=api) | jq '.[0].NetworkSettings.Networks | keys'
```
