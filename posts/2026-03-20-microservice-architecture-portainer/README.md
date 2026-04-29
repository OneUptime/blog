# How to Deploy a Microservice Architecture with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Microservice, Architecture, DevOps, Docker Swarm

Description: Deploy a complete microservice architecture with API gateway, service discovery, and inter-service communication using Portainer and Docker Swarm.

## Introduction

Microservices break monolithic applications into small, independently deployable services. Portainer makes managing multiple microservices tractable by providing a single dashboard for all containers, stacks, and networks. This guide covers deploying a real-world microservice architecture with an API gateway, authentication service, and business services.

## Architecture Overview

```text
Client → API Gateway (Traefik)
              ↓
    ┌────────────────────┐
    │   Auth Service     │ ← JWT validation
    │   User Service     │ ← User management
    │   Order Service    │ ← Order processing
    │   Product Service  │ ← Product catalog
    └────────────────────┘
              ↓
    ┌────────────────────┐
    │   Message Bus      │ ← RabbitMQ/Kafka
    │   Shared Cache     │ ← Redis
    │   Databases        │ ← Per-service DBs
    └────────────────────┘
```

## Step 1: Initialize Docker Swarm

```bash
# Initialize Swarm on the manager node

docker swarm init --advertise-addr YOUR_SERVER_IP

# Get worker join token
docker swarm join-token worker

# Add worker nodes (run on worker machines)
docker swarm join \
  --token SWMTKN-1-xxxxx \
  YOUR_MANAGER_IP:2377
```

## Step 2: Create Overlay Networks

```bash
# Create networks in Portainer: Networks > Add network
# Or via CLI:

# Public network (connected to Traefik)
docker network create \
  --driver overlay \
  --attachable \
  public_network

# Private service mesh network
docker network create \
  --driver overlay \
  --attachable \
  services_network

# Database network (isolated)
docker network create \
  --driver overlay \
  --attachable \
  db_network
```

## Step 3: Deploy the Infrastructure Stack

```yaml
# infrastructure-stack.yml
version: "3.8"

networks:
  public_network:
    external: true
  services_network:
    external: true

services:
  # API Gateway
  traefik:
    image: traefik:v3.6
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /opt/traefik:/etc/traefik
    networks:
      - public_network
      - services_network
    command:
      - "--api.insecure=true"
      - "--providers.swarm.endpoint=unix:///var/run/docker.sock"
      - "--providers.swarm.exposedByDefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"

  # Message broker
  rabbitmq:
    image: rabbitmq:3-management-alpine
    deploy:
      replicas: 1
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=rabbitmq_password
    networks:
      - services_network

  # Distributed cache
  redis:
    image: redis:7-alpine
    deploy:
      replicas: 1
    ports:
      - "6379:6379"
    networks:
      - services_network
```

## Step 4: Deploy Authentication Service

```yaml
# auth-service-stack.yml
version: "3.8"

networks:
  public_network:
    external: true
  services_network:
    external: true
  db_network:
    external: true

volumes:
  auth_db:

services:
  auth_db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=auth_db
      - POSTGRES_USER=auth
      - POSTGRES_PASSWORD=auth_db_password
    volumes:
      - auth_db:/var/lib/postgresql/data
    networks:
      - db_network
    deploy:
      replicas: 1

  auth_service:
    image: myrepo/auth-service:latest
    environment:
      - DB_URL=postgresql://auth:auth_db_password@auth_db:5432/auth_db
      - JWT_SECRET=your_jwt_secret_key
      - REDIS_URL=redis://redis:6379/1
      - PORT=8001
    networks:
      - public_network
      - services_network
      - db_network
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      rollback_config:
        parallelism: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.auth.rule=PathPrefix(`/api/auth`)"
        - "traefik.http.services.auth.loadbalancer.server.port=8001"
        - "traefik.swarm.network=public_network"
```

## Step 5: Deploy Business Services

```yaml
# services-stack.yml
version: "3.8"

networks:
  public_network:
    external: true
  services_network:
    external: true
  db_network:
    external: true

volumes:
  user_db:
  order_db:
  product_db:

services:
  # User Service
  user_service:
    image: myrepo/user-service:latest
    environment:
      - DB_URL=postgresql://user:user_pass@user_db:5432/user_db
      - REDIS_URL=redis://redis:6379/2
      - AUTH_SERVICE_URL=http://auth_service:8001
      - RABBITMQ_URL=amqp://admin:rabbitmq_password@rabbitmq:5672
      - PORT=8002
    networks:
      - public_network
      - services_network
      - db_network
    deploy:
      replicas: 2
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.users.rule=PathPrefix(`/api/users`)"
        - "traefik.http.services.users.loadbalancer.server.port=8002"
        - "traefik.swarm.network=public_network"

  # Order Service
  order_service:
    image: myrepo/order-service:latest
    environment:
      - DB_URL=postgresql://order:order_pass@order_db:5432/order_db
      - REDIS_URL=redis://redis:6379/3
      - USER_SERVICE_URL=http://user_service:8002
      - PRODUCT_SERVICE_URL=http://product_service:8003
      - RABBITMQ_URL=amqp://admin:rabbitmq_password@rabbitmq:5672
      - PORT=8004
    networks:
      - public_network
      - services_network
      - db_network
    deploy:
      replicas: 3
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.orders.rule=PathPrefix(`/api/orders`)"
        - "traefik.http.services.orders.loadbalancer.server.port=8004"
        - "traefik.swarm.network=public_network"

  # Product Service
  product_service:
    image: myrepo/product-service:latest
    environment:
      - DB_URL=postgresql://product:product_pass@product_db:5432/product_db
      - REDIS_URL=redis://redis:6379/4
      - RABBITMQ_URL=amqp://admin:rabbitmq_password@rabbitmq:5672
      - PORT=8003
    networks:
      - public_network
      - services_network
      - db_network
    deploy:
      replicas: 2
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.products.rule=PathPrefix(`/api/products`)"
        - "traefik.http.services.products.loadbalancer.server.port=8003"
        - "traefik.swarm.network=public_network"

  # Database for user service
  user_db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=user_db
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=user_pass
    volumes:
      - user_db:/var/lib/postgresql/data
    networks:
      - db_network
    deploy:
      replicas: 1

  # Database for order service
  order_db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=order_db
      - POSTGRES_USER=order
      - POSTGRES_PASSWORD=order_pass
    volumes:
      - order_db:/var/lib/postgresql/data
    networks:
      - db_network
    deploy:
      replicas: 1

  # Database for product service
  product_db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=product_db
      - POSTGRES_USER=product
      - POSTGRES_PASSWORD=product_pass
    volumes:
      - product_db:/var/lib/postgresql/data
    networks:
      - db_network
    deploy:
      replicas: 1
```

## Step 6: Deploy Stacks via Portainer

1. In Portainer, navigate to **Stacks**
2. Click **Add stack**
3. Give it a name (e.g., `infrastructure`)
4. Paste the stack YAML
5. Deploy
6. Repeat for each service stack

## Scaling Services in Portainer

```bash
# Scale via Portainer UI: Services > service_name > Scale
# Or via CLI:
docker service scale myapp_order_service=5

# View service status in Portainer:
# Services > order_service > check replicas
```

## Conclusion

You've deployed a complete microservice architecture using Docker Swarm and Portainer. Each service has its own database (Database per Service pattern), communicates via RabbitMQ for async events and direct HTTP for synchronous calls, and is independently scalable. Portainer's Services view shows you the status of all replicas, and the Stacks view organizes related services together. This architecture can be managed in Portainer CE and extended to larger licensed Portainer Business Edition deployments.
