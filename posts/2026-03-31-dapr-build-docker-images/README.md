# How to Build Docker Images for Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Docker, Container, Image, Microservice

Description: Learn how to build efficient Docker images for Dapr applications, covering Dockerfile best practices, sidecar injection, and running containers locally.

---

## How Dapr Works with Docker

Dapr runs as a sidecar process alongside your application. In Docker-based deployments, each container runs your application code while the Dapr CLI or Kubernetes operator starts the sidecar. Your Dockerfile only needs to package the application itself - Dapr handles the rest at runtime.

## Writing a Dockerfile for a Dapr Service

Start with a minimal base image and only copy what the application needs. Here is a Dockerfile for a Node.js Dapr service:

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

EXPOSE 3000
CMD ["node", "src/index.js"]
```

For a Python service using FastAPI:

```dockerfile
FROM python:3.12-slim AS base
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Building and Tagging the Image

Build and tag your image with a meaningful version:

```bash
docker build -t order-service:1.0.0 .
docker tag order-service:1.0.0 myregistry.azurecr.io/order-service:1.0.0
docker push myregistry.azurecr.io/order-service:1.0.0
```

## Running the Container with Dapr CLI

The Dapr CLI starts the sidecar when you use `dapr run`. Pass environment variables and port mappings:

```bash
dapr run \
  --app-id order-service \
  --app-port 3000 \
  --dapr-http-port 3500 \
  --components-path ./components \
  -- docker run --rm \
    --network host \
    -e DAPR_HTTP_PORT=3500 \
    order-service:1.0.0
```

For a cleaner local workflow, use Docker Compose to start both your service container and the Dapr sidecar together (covered in the Docker Compose guide).

## Using .dockerignore to Keep Images Small

Always include a `.dockerignore` file to exclude files that should not be in the image:

```text
node_modules
.git
.env
*.log
test/
docs/
Dockerfile
.dockerignore
components/
```

## Verifying the Image

After building, inspect the image to confirm its size and layers:

```bash
docker images order-service:1.0.0
docker history order-service:1.0.0
docker run --rm order-service:1.0.0 node --version
```

For a health check, add a `HEALTHCHECK` directive to your Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/healthz || exit 1
```

## Summary

Building Docker images for Dapr applications follows the same best practices as any containerized service - minimal base images, layered caching, and clean separation of dependencies. Because Dapr runs as a sidecar outside your container, your Dockerfile stays focused on the application code and does not need to include Dapr binaries or configuration files.
