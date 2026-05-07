# How to Use Compose Networks with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Networking

Description: Learn how to define and use custom networks in podman-compose files for service isolation and inter-container communication.

---

> Compose networks let you isolate groups of services and control which containers can communicate with each other.

By default, podman-compose creates a single network for all services. Custom networks let you segment services into isolated groups, control DNS resolution, and set up multi-tier architectures where only certain services can talk to each other.

---

## Default Network Behavior

```yaml
# compose.yaml
services:
  web:
    image: docker.io/library/nginx:alpine
  api:
    image: docker.io/library/python:3.12-slim
    command: python -m http.server 5000
  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
```

```bash
# All services are on the same default network
podman-compose up -d

# web can reach api and db by service name
podman-compose exec web ping -c 1 api
podman-compose exec web ping -c 1 db
```

## Custom Networks for Isolation

```yaml
# compose.yaml
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
    networks:
      - frontend

  api:
    image: docker.io/library/python:3.12-slim
    command: python -m http.server 5000
    networks:
      - frontend
      - backend

  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    networks:
      - backend

networks:
  frontend:
  backend:
```

```bash
# Deploy with network isolation
podman-compose up -d

# web can reach api (both on frontend)
podman-compose exec web ping -c 1 api

# web cannot reach db (different networks)
podman-compose exec web ping -c 1 db
# This will fail - web is not on the backend network
```

## Named Networks

```yaml
networks:
  frontend:
    name: my-frontend-net
  backend:
    name: my-backend-net
```

```bash
# Verify the networks were created
podman network ls
# Output includes my-frontend-net and my-backend-net
```

## Custom Network Configuration

```yaml
networks:
  app-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
          gateway: 172.28.0.1
```

## Static IP Addresses

```yaml
services:
  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    networks:
      backend:
        ipv4_address: 172.28.0.10

networks:
  backend:
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

## External Networks

Connect to a network that already exists outside the compose file.

```bash
# Create the network manually
podman network create shared-net
```

```yaml
# compose.yaml
services:
  app:
    image: docker.io/library/nginx:alpine
    networks:
      - shared

networks:
  shared:
    external: true
    name: shared-net
```

## Network Aliases

```yaml
services:
  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    networks:
      backend:
        aliases:
          - database
          - postgres-primary
```

```bash
# The db service can be reached by any of its aliases
podman-compose exec api ping -c 1 database
podman-compose exec api ping -c 1 postgres-primary
```

## Summary

Compose networks in podman-compose isolate groups of services and control inter-container communication. Use multiple networks for multi-tier architectures, static IPs for predictable addressing, external networks for cross-project communication, and aliases for flexible DNS resolution.
