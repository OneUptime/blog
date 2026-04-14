# How to Migrate from Docker Compose to Dapr Multi-App Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Multi-App Run, Docker Compose, Migration, Local Development

Description: Learn how to replace Docker Compose for local Dapr development with the Dapr Multi-App Run configuration to simplify sidecar setup and service coordination.

---

## Why Switch to Dapr Multi-App Run?

When developing with Dapr locally, Docker Compose files grow complex: you define each service, its Dapr sidecar, shared component volumes, and networking. Dapr Multi-App Run (introduced in Dapr CLI v1.10) provides a single YAML file that starts all services and their sidecars without Docker at all - just processes managed by the Dapr CLI.

## Before: Docker Compose with Dapr

```yaml
# docker-compose.yaml
version: '3.8'
services:
  order-service:
    build: ./order-service
    ports:
      - "3000:3000"
    environment:
      - DAPR_HTTP_PORT=3500

  order-service-dapr:
    image: daprio/daprd:latest
    command: ./daprd
      --app-id order-service
      --app-port 3000
      --dapr-http-port 3500
      --resources-path /components
    volumes:
      - ./components:/components
    depends_on:
      - order-service
    network_mode: "service:order-service"

  inventory-service:
    build: ./inventory-service
    ports:
      - "3001:3001"

  inventory-service-dapr:
    image: daprio/daprd:latest
    command: ./daprd
      --app-id inventory-service
      --app-port 3001
      --dapr-http-port 3501
      --resources-path /components
    volumes:
      - ./components:/components
    depends_on:
      - inventory-service
    network_mode: "service:inventory-service"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

Running:

```bash
docker-compose up
```

## After: Dapr Multi-App Run

```yaml
# dapr.yaml
version: 1
common:
  resourcesPath: ./components
  logLevel: info

apps:
  - appID: order-service
    appDirPath: ./order-service
    appPort: 3000
    daprHTTPPort: 3500
    command: ["node", "server.js"]
    env:
      NODE_ENV: development

  - appID: inventory-service
    appDirPath: ./inventory-service
    appPort: 3001
    daprHTTPPort: 3501
    command: ["node", "server.js"]
    env:
      NODE_ENV: development

  - appID: payment-service
    appDirPath: ./payment-service
    appPort: 3002
    daprHTTPPort: 3502
    command: ["go", "run", "main.go"]
    env:
      GO_ENV: development
```

Running:

```bash
dapr run -f dapr.yaml
```

## Viewing Logs Per Service

```bash
# All services with colored output
dapr run -f dapr.yaml

# Filter to one service
dapr run -f dapr.yaml --log-level debug 2>&1 | grep "order-service"
```

## Stopping All Services

```bash
# Ctrl+C stops all services at once
# Or use:
dapr stop -f dapr.yaml
```

## Profile-Based Overrides

```yaml
# dapr-prod-sim.yaml - simulate production settings locally
version: 1
common:
  resourcesPath: ./components-prod-sim

apps:
  - appID: order-service
    appDirPath: ./order-service
    appPort: 3000
    daprHTTPPort: 3500
    command: ["node", "server.js"]
    env:
      NODE_ENV: staging
      FEATURE_FLAGS: "new-checkout=true"
```

## Side-by-Side Comparison

| Feature | Docker Compose | Dapr Multi-App Run |
|---------|---------------|-------------------|
| Sidecar configuration | Per-service Docker container | Inline in dapr.yaml |
| Hot reload | Requires volume mounts | Native process - use nodemon etc. |
| Startup order | `depends_on` | Simultaneous |
| Debugging | Attach to container | Attach to local process |
| No Docker needed | No | Yes |

## Summary

Dapr Multi-App Run replaces Docker Compose for local Dapr development by managing service processes and their sidecars from a single `dapr.yaml` file. Services run as local processes instead of containers, making debugging with IDEs straightforward. The component directory is shared automatically, and `dapr run -f dapr.yaml` replaces `docker-compose up` entirely.
