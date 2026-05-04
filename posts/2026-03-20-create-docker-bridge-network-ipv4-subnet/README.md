# How to Create a Custom Docker Bridge Network with a Specific IPv4 Subnet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, IPv4, Bridge Network, Container

Description: Create a custom Docker bridge network with a specific IPv4 subnet and gateway using docker network create, and run containers attached to this isolated network.

## Introduction

Docker's default bridge network (`docker0`) uses `172.17.0.0/16`. In production, creating custom bridge networks with known subnets provides better isolation, predictable IP ranges, and avoids conflicts with other networks.

## Creating a Custom Bridge Network

```bash
# Create a network with a custom subnet and gateway

docker network create \
  --driver bridge \
  --subnet 192.168.100.0/24 \
  --gateway 192.168.100.1 \
  my-app-network

# Verify
docker network inspect my-app-network
```

## Creating a Network with an IP Range

Restrict which IPs Docker assigns from the subnet:

```bash
# Subnet /24, but only assign IPs from .128 to .255
docker network create \
  --driver bridge \
  --subnet 192.168.100.0/24 \
  --gateway 192.168.100.1 \
  --ip-range 192.168.100.128/25 \
  my-app-network-restricted
```

## Running a Container on the Custom Network

```bash
# Run a container and attach it to the custom network
docker run -d \
  --name web-server \
  --network my-app-network \
  nginx:alpine

# Check the container's assigned IP
docker inspect web-server | grep '"IPAddress"'
```

## Listing All Docker Networks

```bash
# Show all networks with subnet info
docker network ls
docker network inspect my-app-network --format '{{json .IPAM.Config}}'
```

## Connecting Two Containers on the Same Network

Containers on the same custom bridge network can communicate by container name:

```bash
# Start a database
docker run -d --name postgres --network my-app-network postgres:15-alpine

# Start an app that connects to the database by name
docker run -d --name app --network my-app-network \
  -e DATABASE_HOST=postgres \
  my-app-image

# Verify name-based DNS resolution works
docker exec app ping -c 3 postgres
```

## Removing a Custom Network

```bash
# Remove the network (all containers must be disconnected first)
docker network rm my-app-network
```

## Using Docker Compose

```yaml
# docker-compose.yml
version: "3.8"

services:
  web:
    image: nginx:alpine
    networks:
      - app-net

networks:
  app-net:
    driver: bridge
    ipam:
      config:
        - subnet: 192.168.100.0/24
          gateway: 192.168.100.1
```

## Conclusion

Custom Docker bridge networks provide a clean, predictable IPv4 space for your containers. Use `--subnet` and `--gateway` to define the network, and `--ip-range` to limit automatic IP assignment. Containers on the same network communicate by name via Docker's embedded DNS.
