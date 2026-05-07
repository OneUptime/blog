# How to Assign a Static IPv4 Address to a Docker Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, IPv4, Static IP, Container, Docker Compose

Description: Assign a static IPv4 address to a Docker container using the --ip flag with docker run or the ipv4_address option in Docker Compose, using a custom user-defined network.

## Introduction

Docker assigns IPs automatically from the network's address pool. To assign a static IP, you must use a **user-defined network** (not the default `bridge` network, which maps to `docker0` on Linux) and specify the IP at container runtime or in Docker Compose.

## Step 1: Create a Network with a Known Subnet

```bash
# Create a custom network - static IPs require a user-defined network

docker network create \
  --subnet 192.168.200.0/24 \
  --gateway 192.168.200.1 \
  static-net
```

## Step 2: Run a Container with a Static IP

```bash
# Use --ip to assign a specific IP from the subnet
docker run -d \
  --name nginx-static \
  --network static-net \
  --ip 192.168.200.10 \
  nginx:alpine

# Verify the assigned IP
docker inspect nginx-static | grep '"IPAddress"'
```

## Step 3: Verify from Another Container

```bash
# Start another container on the same network
docker run --rm --network static-net alpine ping -c 3 192.168.200.10
```

## Docker Compose with Static IPs

```yaml
# docker-compose.yml
services:
  web:
    image: nginx:alpine
    networks:
      app-net:
        ipv4_address: 192.168.200.10

  db:
    image: postgres:15-alpine
    networks:
      app-net:
        ipv4_address: 192.168.200.20
    environment:
      POSTGRES_PASSWORD: secret

networks:
  app-net:
    driver: bridge
    ipam:
      config:
        - subnet: 192.168.200.0/24
          gateway: 192.168.200.1
```

```bash
docker compose up -d
docker inspect $(docker compose ps -q web) | grep '"IPAddress"'
```

## Why Static IPs Cannot Be Used on the Default Bridge

The default `bridge` network (`docker run` without `--network`, backed by `docker0` on Linux) does not support user-specified container IPs with `--ip`. Docker only supports user-specified IP addresses on user-defined networks.

## Confirming the IP Persists Across Container Restarts

```bash
# Restart the container
docker restart nginx-static

# Check - the IP should be the same
docker inspect nginx-static | grep '"IPAddress"'
```

Static IP assignments in user-defined networks persist across restarts as long as the container definition is unchanged.

## Conclusion

Assign static IPs to Docker containers using `--ip` with `docker run` or `ipv4_address` in Docker Compose. Always create a user-defined network with a defined subnet first - user-specified container IPs are not supported on the default `bridge` network.
