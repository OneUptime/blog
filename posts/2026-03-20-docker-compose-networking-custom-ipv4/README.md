# How to Set Up Docker Compose Networking with Custom IPv4 Subnets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Compose, Networking, IPv4, Subnets, Container

Description: Configure custom IPv4 subnets for Docker Compose services using the networks section with IPAM configuration, and connect multiple services to different network tiers.

## Introduction

Docker Compose automatically creates a network for each project, but the default subnet is automatically assigned. Defining custom networks in the `networks:` section of your Compose file ensures consistent, predictable IP addressing and enables network-tier isolation.

## Basic Custom Network in Docker Compose

```yaml
# docker-compose.yml

services:
  web:
    image: nginx:alpine
    networks:
      - frontend

  app:
    image: my-app:latest
    networks:
      - frontend
      - backend

  db:
    image: postgres:15-alpine
    networks:
      - backend
    environment:
      POSTGRES_PASSWORD: secret

networks:
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
          gateway: 172.20.0.1

  backend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.21.0.0/24
          gateway: 172.21.0.1
```

In this configuration:
- `web` and `app` can communicate (both on `frontend`)
- `app` and `db` can communicate (both on `backend`)
- `web` cannot directly reach `db` (not on the same network)

## Running the Stack

```bash
docker compose up -d

# Verify containers and their attached networks
docker compose ps
docker inspect --format='{{.Name}} {{range $name, $network := .NetworkSettings.Networks}}{{printf "%s=%s " $name $network.IPAddress}}{{end}}' \
  $(docker compose ps -q web app db)
```

## Checking Service IPs

```bash
# Show IP addresses of running services
docker inspect --format='web: {{range $name, $network := .NetworkSettings.Networks}}{{printf "%s=%s " $name $network.IPAddress}}{{end}}' "$(docker compose ps -q web)"
docker inspect --format='app: {{range $name, $network := .NetworkSettings.Networks}}{{printf "%s=%s " $name $network.IPAddress}}{{end}}' "$(docker compose ps -q app)"
docker inspect --format='db: {{range $name, $network := .NetworkSettings.Networks}}{{printf "%s=%s " $name $network.IPAddress}}{{end}}' "$(docker compose ps -q db)"
```

## Using External Networks

To connect Compose services to an existing Docker network:

```yaml
networks:
  shared-net:
    external: true
    name: my-existing-network
```

## Naming the Project Network

By default, network names are prefixed with the project name. Set the project name:

```bash
# Use a specific project name to control network naming
COMPOSE_PROJECT_NAME=myapp docker compose up -d
# Creates network: myapp_frontend, myapp_backend
```

## Conclusion

Define networks in the `networks:` section with IPAM configuration to control subnets. Attach services to multiple networks for tier isolation - web servers on a frontend network, databases on a backend network, with application containers bridging both. This reflects real production network segmentation in a development environment.
