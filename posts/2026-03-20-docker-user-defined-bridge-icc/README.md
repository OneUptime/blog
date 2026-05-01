# How to Set Up Inter-Container Communication on a User-Defined Bridge Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, Bridge, Inter-Container Communication, IPv4, DNS

Description: Enable reliable inter-container communication using Docker user-defined bridge networks, which provide automatic DNS resolution and network isolation.

## Introduction

Docker's default bridge network (`bridge`, backed by the `docker0` interface) supports inter-container communication via IP addresses, but it lacks automatic DNS resolution. User-defined bridge networks solve this by providing built-in DNS so containers can reach each other by name - a critical feature for microservices.

## Default Bridge vs User-Defined Bridge

| Feature | Default Bridge | User-Defined Bridge |
|---------|----------------|---------------------|
| DNS by container name | No | Yes |
| Network isolation | Shared with all containers | Per-network |
| Dynamic connect/disconnect | No | Yes |

## Creating a User-Defined Bridge Network

```bash
# Create an isolated bridge network for your application

docker network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  --gateway 172.20.0.1 \
  --opt com.docker.network.bridge.name=br-app \
  app-network
```

## Connecting Containers to the Network

```bash
# Run a database container on the network
docker run -d \
  --name postgres \
  --network app-network \
  -e POSTGRES_PASSWORD=secret \
  postgres:15

# Run an app container on the same network
# Use container name for DNS resolution
docker run -d \
  --name api \
  --network app-network \
  -e DB_HOST=postgres \
  myapp:latest
```

The `api` container can reach `postgres` by name - Docker's embedded DNS resolves `postgres` to the container's IP automatically.

## Docker Compose Example

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
    networks:
      - backend

  api:
    image: myapp:latest
    environment:
      DB_HOST: db        # Resolved by Docker DNS
    networks:
      - backend
    depends_on:
      - db

  frontend:
    image: nginx:latest
    networks:
      - backend
      - frontend         # Only this service is on both networks
    ports:
      - "80:80"

networks:
  backend:
    driver: bridge
  frontend:
    driver: bridge
```

## Verifying DNS Resolution

```bash
# Test name resolution from another container on the same network
docker run --rm --network app-network busybox nslookup postgres
docker run --rm --network app-network busybox ping -c 3 postgres
```

## Connecting a Running Container to a Network

```bash
# Attach a running container to an additional network
docker network connect app-network legacy-container

# Disconnect a container from a network
docker network disconnect app-network legacy-container
```

## Inspecting the Network

```bash
# Show all containers and their IPs on a network
docker network inspect app-network

# List networks
docker network ls
```

## Network Isolation

Containers on separate user-defined networks cannot communicate by default:

```bash
# Create two isolated user-defined bridge networks
docker network create net1
docker network create net2

# Start a container on net1
docker run -d --network net1 --name c1 busybox sleep 3600

# This will fail because c1 is not attached to net2
docker run --rm --network net2 busybox ping -c 3 c1
```

This isolation enforces the principle of least privilege between services.

## Conclusion

User-defined bridge networks are the recommended pattern for Docker application networking. They provide DNS resolution, isolation, and dynamic connection management - everything needed for reliable inter-container communication.
