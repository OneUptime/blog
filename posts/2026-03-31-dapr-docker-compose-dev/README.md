# How to Use Dapr with Docker Compose for Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Docker Compose, Development, Local, Container

Description: Set up a local Dapr development environment using Docker Compose to run multiple microservices with Dapr sidecars, Redis, and other dependencies locally.

---

## Overview

Docker Compose simplifies local development by running all services and their dependencies in containers. With Dapr's Docker Compose support, you can run your microservices alongside Dapr sidecars, Redis, Zipkin, and other components locally without Kubernetes, making development and testing faster.

## Prerequisites

- Docker Desktop installed
- Dapr CLI installed and initialized
- Docker Compose v2+

## Project Structure

```text
my-dapr-app/
  docker-compose.yml
  components/
    statestore.yaml
    pubsub.yaml
  config/
    config.yaml
  services/
    order-service/
      Dockerfile
      app.js
    inventory-service/
      Dockerfile
      app.py
```

## Docker Compose File

```yaml
version: "3.8"

services:
  # Redis for state store and pub/sub
  redis:
    image: redis:7-alpine
    ports:
    - "6379:6379"
    networks:
    - dapr-network

  # Zipkin for tracing
  zipkin:
    image: openzipkin/zipkin:latest
    ports:
    - "9411:9411"
    networks:
    - dapr-network

  # Order Service
  order-service:
    build: ./services/order-service
    ports:
    - "3001:3001"
    - "3500:3500"
    depends_on:
    - redis
    networks:
    - dapr-network

  # Dapr sidecar for Order Service
  order-service-dapr:
    image: daprio/daprd:1.13.0
    command:
    - ./daprd
    - -app-id
    - order-service
    - -app-port
    - "3001"
    - -dapr-http-port
    - "3500"
    - -resources-path
    - /components
    - -config
    - /config/config.yaml
    volumes:
    - ./components:/components
    - ./config:/config
    depends_on:
    - redis
    - order-service
    network_mode: "service:order-service"

  # Inventory Service
  inventory-service:
    build: ./services/inventory-service
    ports:
    - "3002:3002"
    depends_on:
    - redis
    networks:
    - dapr-network

  # Dapr sidecar for Inventory Service
  inventory-service-dapr:
    image: daprio/daprd:1.13.0
    command:
    - ./daprd
    - -app-id
    - inventory-service
    - -app-port
    - "3002"
    - -dapr-http-port
    - "3501"
    - -resources-path
    - /components
    volumes:
    - ./components:/components
    depends_on:
    - redis
    - inventory-service
    network_mode: "service:inventory-service"

networks:
  dapr-network:
    driver: bridge
```

## Component Configuration

`components/statestore.yaml`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: redisPassword
    value: ""
```

`components/pubsub.yaml`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
```

## Running the Environment

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f order-service order-service-dapr

# Test service invocation
curl http://localhost:3500/v1.0/invoke/inventory-service/method/health

# Stop all services
docker compose down
```

## Hot Reload for Development

Mount source code as a volume and use nodemon:

```yaml
  order-service:
    volumes:
    - ./services/order-service:/app
    command: npm run dev
```

## Summary

Docker Compose with Dapr sidecars provides a realistic local development environment that mirrors Kubernetes behavior. By running services, sidecars, and infrastructure dependencies together, developers can test Dapr building blocks locally before pushing to a cluster, significantly reducing the feedback loop during development.
