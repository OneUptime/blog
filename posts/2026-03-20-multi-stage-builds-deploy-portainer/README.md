# How to Use Multi-Stage Builds and Deploy with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Multi-Stage Build, CI/CD, Container Deployment

Description: Learn how to use Docker multi-stage builds to create lean production images and deploy them efficiently using Portainer stacks and webhooks.

## Introduction

Docker multi-stage builds allow you to use multiple `FROM` instructions in a Dockerfile, copying only the necessary artifacts from build stages to the final image. This results in significantly smaller production images. Combined with Portainer's stack webhooks, you can automate deployments triggered by CI/CD pipelines.

## Why Multi-Stage Builds

A typical Go application without multi-stage builds might produce a 1GB image with all build tools included. With multi-stage builds:

- Final image contains only the compiled binary and runtime dependencies.
- Image sizes reduce from gigabytes to megabytes.
- Attack surface is dramatically reduced.
- Build cache is more efficient.

## Example: Node.js Application

```dockerfile
# Stage 1: Dependencies

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

USER nextjs

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Example: Go Application

```dockerfile
# Stage 1: Build
FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /app/server ./cmd/server

# Stage 2: Production - minimal scratch image
FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

The resulting Go image is just a few megabytes.

## Deploying with Portainer

### Step 1: Push Image to a Registry

```bash
docker build -t registry.example.com/myapp:1.2.3 .
docker push registry.example.com/myapp:1.2.3
```

### Step 2: Create a Stack in Portainer

Navigate to **Stacks** > **Add stack** and enter:

```yaml
version: "3.8"

services:
  app:
    image: registry.example.com/myapp:1.2.3
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
```

### Step 3: Enable Stack Webhooks for Auto-Deploy

In Portainer, after creating the stack:
1. Go to the stack settings.
2. Enable the **Webhook** option.
3. Copy the webhook URL.

Trigger redeployment from your CI/CD pipeline:

```bash
# GitHub Actions
- name: Deploy to Portainer
  run: |
    curl -X POST "${{ secrets.PORTAINER_WEBHOOK_URL }}"
```

## CI/CD Pipeline Integration

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build multi-stage image
        run: |
          docker build \
            --target runner \
            -t registry.example.com/myapp:${{ github.sha }} \
            -t registry.example.com/myapp:latest \
            .

      - name: Push image
        run: |
          docker push registry.example.com/myapp:${{ github.sha }}
          docker push registry.example.com/myapp:latest

      - name: Trigger Portainer deploy
        run: |
          curl -X POST "${{ secrets.PORTAINER_WEBHOOK_URL }}"
```

## Targeting a Specific Build Stage

Build only a specific stage for testing:

```bash
# Build only the test stage
docker build --target builder -t myapp:test .
docker run --rm myapp:test npm test
```

## Best Practices

- Keep the final stage as minimal as possible; use `alpine` or `scratch` base images.
- Use specific version tags for base images, not `latest`.
- Copy only required files to the final stage using `--from`.
- Run containers as non-root users in the final stage.
- Use `COPY --chown` to set file ownership in a single layer.
- Use Portainer's webhook auto-redeploy to pull the latest image tag automatically.

## Conclusion

Multi-stage Docker builds dramatically reduce image sizes and attack surfaces. Combined with Portainer's webhook-driven redeployment, you have a streamlined pipeline from code commit to running container without complex CI/CD infrastructure.
