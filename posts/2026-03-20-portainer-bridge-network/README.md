# How to Create a Bridge Network in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Networking, Bridge, DevOps

Description: Learn how to create custom bridge networks in Portainer to enable isolated communication between Docker containers.

## Introduction

Docker bridge networks enable container-to-container communication on the same host. The default `bridge` network (`docker0`) works but lacks automatic DNS resolution between containers. Custom bridge networks provide automatic service discovery, better isolation, and more control over IP addressing. Portainer makes creating custom bridge networks straightforward.

## Prerequisites

- Portainer installed with a connected Docker environment

## Default Bridge vs. Custom Bridge

| Feature | Default bridge | Custom bridge |
|---------|---------------|---------------|
| Container DNS | No automatic DNS (legacy `--link` only) | Yes (use container name) |
| Isolation | Shared with other containers on the default `bridge` network | Isolated to network |
| IP subnet control | Limited | Full control |
| Can be removed | No (system-managed) | Yes |

**For containers on the same Docker host, prefer custom bridge networks over the default bridge.**

## Step 1: Create a Bridge Network in Portainer

1. Navigate to **Networks** in Portainer.
2. Click **Add network**.
3. Configure the network:

```text
Name:    myapp-network
Driver:  bridge
```

If you plan to attach running containers later in Portainer, enable **Manual container attachment** before creating the network.

4. Click **Create the network**.

## Step 2: Configure Custom IP Addressing

Expand the **Advanced configuration** section:

```text
Subnet:   172.20.0.0/16
Gateway:  172.20.0.1
IP range: 172.20.1.0/24  (optional: restrict container IPs to this range)
```

Leave blank to let Docker choose automatically.

## Step 3: Bridge Network Options

Common bridge driver options:

```text
com.docker.network.bridge.name         → Custom bridge interface name
com.docker.network.bridge.enable_icc   → Enable inter-container communication
com.docker.network.bridge.enable_ip_masquerade → Enable IP masquerade (NAT)
com.docker.network.driver.mtu          → MTU for the network
```

Example to disable direct container-to-container traffic on the bridge:

```text
Option: com.docker.network.bridge.enable_icc
Value:  false
```

## Step 4: Create Bridge Network via CLI

```bash
# Basic bridge network:

docker network create myapp-network

# With custom subnet:
docker network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  --gateway 172.20.0.1 \
  --ip-range 172.20.1.0/24 \
  myapp-network

# With options:
docker network create \
  --driver bridge \
  --opt com.docker.network.bridge.name=myapp-br0 \
  --opt com.docker.network.driver.mtu=1500 \
  --subnet 172.21.0.0/24 \
  --gateway 172.21.0.1 \
  frontend-network

# Internal network (externally isolated):
docker network create \
  --driver bridge \
  --internal \
  --subnet 172.22.0.0/24 \
  internal-db-network
```

## Step 5: Use Bridge Networks in Docker Compose

```yaml
# docker-compose.yml with custom bridge networks
services:
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
    networks:
      - frontend
      - backend  # Can talk to both frontend and backend

  app:
    image: myorg/app:latest
    restart: unless-stopped
    networks:
      - backend   # Only on backend network

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    networks:
      - backend   # Only on backend network
      # NOT on frontend - database is isolated from internet-facing containers

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    networks:
      - backend

# Network definitions
networks:
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
          gateway: 172.20.0.1

  backend:
    driver: bridge
    internal: true   # Externally isolated network
    ipam:
      config:
        - subnet: 172.21.0.0/24
          gateway: 172.21.0.1
```

## Step 6: Container DNS on Custom Networks

On user-defined bridge networks, containers can reach each other by name:

```bash
# A container on the same custom network can resolve app by name:
docker run --rm --network myapp-network busybox ping -c 1 app
# Works because Docker provides DNS for user-defined bridge networks

# On the DEFAULT bridge network, name resolution doesn't work automatically:
docker run --rm busybox ping -c 1 app
# ping: bad address 'app'
# On the default bridge, you need the container IP unless you use legacy --link
```

## Step 7: Connect Existing Containers to Network

Add a running container to a network without recreating it:

```bash
# Connect a running container to a network:
docker network connect myapp-network my-container

# With a specific IP:
docker network connect --ip 172.20.1.50 myapp-network my-container

# Disconnect from a network:
docker network disconnect myapp-network my-container
```

In Portainer:
1. Navigate to **Networks**.
2. Click the network name.
3. If **Manual container attachment** was enabled for the network, under **Containers**, click **Join a container**.
4. Select the container.

## Step 8: Inspect Network

```bash
# Inspect a network:
docker network inspect myapp-network

# Output (key sections):
{
  "Name": "myapp-network",
  "Driver": "bridge",
  "IPAM": {
    "Config": [{"Subnet": "172.20.0.0/16", "Gateway": "172.20.0.1"}]
  },
  "Containers": {
    "abc123": {"Name": "nginx", "IPv4Address": "172.20.0.2/16"},
    "def456": {"Name": "app", "IPv4Address": "172.20.0.3/16"},
    "ghi789": {"Name": "postgres", "IPv4Address": "172.20.0.4/16"}
  }
}
```

## Network Isolation Pattern

```yaml
# Secure multi-tier architecture with network isolation
networks:
  dmz:
    driver: bridge      # Internet-facing (nginx)

  app-tier:
    driver: bridge      # Application servers
    internal: true      # Externally isolated

  data-tier:
    driver: bridge      # Databases and caches
    internal: true      # Externally isolated
    # Only app-tier containers can reach data-tier

services:
  nginx:
    networks: [dmz, app-tier]  # Bridges DMZ and app tier

  api:
    networks: [app-tier, data-tier]  # Bridges app and data tier

  postgres:
    networks: [data-tier]  # Only accessible from data tier
```

## Conclusion

Custom bridge networks in Portainer are the preferred way to connect standalone containers on the same host. They provide automatic DNS resolution (containers can find each other by name), network isolation (separate subnets for different application tiers), and better security (internal networks are externally isolated). Prefer dedicated networks for your applications rather than using the default bridge.
