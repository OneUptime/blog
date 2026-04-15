# How to Deploy Dapr .NET Apps with Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, DotNet, Docker Compose, Deployment, Microservice, Container

Description: Deploy multi-service Dapr .NET applications locally using Docker Compose with sidecars, Redis state store, and Zipkin tracing in a single compose file.

---

## Overview

Docker Compose is a convenient way to run Dapr .NET applications locally when you want a production-like environment without Kubernetes. Each microservice gets its own Dapr sidecar container, and shared infrastructure (Redis, Zipkin) is defined in the same compose file.

## Project Structure

```text
my-app/
  order-service/
    Dockerfile
  inventory-service/
    Dockerfile
  components/
    statestore.yaml
    pubsub.yaml
    config.yaml
  docker-compose.yml
```

## Docker Compose File

```yaml
version: "3.9"

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  zipkin:
    image: openzipkin/zipkin:latest
    ports:
      - "9411:9411"

  order-service:
    build: ./order-service
    ports:
      - "5001:5001"
    environment:
      ASPNETCORE_URLS: "http://+:5001"
    depends_on:
      - redis

  order-service-dapr:
    image: "daprio/daprd:1.14"
    command:
      - "./daprd"
      - "--app-id=order-service"
      - "--app-port=5001"
      - "--dapr-http-port=3500"
      - "--resources-path=/components"
      - "--config=/components/config.yaml"
    volumes:
      - "./components:/components"
    depends_on:
      - order-service
      - redis
    network_mode: "service:order-service"

  inventory-service:
    build: ./inventory-service
    ports:
      - "5002:5002"
    environment:
      ASPNETCORE_URLS: "http://+:5002"
    depends_on:
      - redis

  inventory-service-dapr:
    image: "daprio/daprd:1.14"
    command:
      - "./daprd"
      - "--app-id=inventory-service"
      - "--app-port=5002"
      - "--dapr-http-port=3501"
      - "--resources-path=/components"
      - "--config=/components/config.yaml"
    volumes:
      - "./components:/components"
    depends_on:
      - inventory-service
      - redis
    network_mode: "service:inventory-service"
```

## State Store Component

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
    - name: redisPassword
      value: ""
```

## Dockerfile for a .NET Service

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 5001

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "OrderService.dll"]
```

## Starting the Stack

```bash
docker compose up --build
```

## Summary

Running Dapr .NET services with Docker Compose requires pairing each application container with a `daprd` sidecar container sharing the same network namespace via `network_mode: "service:<name>"`. This pattern closely mirrors Kubernetes pod behavior and gives you a realistic multi-service environment for local development and integration testing.
