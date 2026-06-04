# How to Configure Okteto for Cloud-Based Kubernetes Development Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevEx, Development

Description: Learn how to set up Okteto for cloud-based Kubernetes development environments that provide instant access to production-like clusters without local infrastructure requirements.

---

Running Kubernetes clusters locally requires significant resources and can strain developer machines, especially for large applications with multiple services. Local clusters often don't match production configurations, leading to environment-specific bugs. Okteto solves this by providing cloud-based development environments that give developers instant access to production-like Kubernetes clusters with automatic code synchronization and hot-reloading.

With Okteto, developers can work in actual Kubernetes clusters without managing local infrastructure, collaborate easily by sharing development URLs, and test against production-like configurations. In this guide, you'll learn how to configure and use Okteto for efficient cloud-based development.

## Understanding Okteto Architecture

Okteto works by scaling the selected Kubernetes deployment to zero and creating a mirror deployment with a development container that syncs code from your local machine. When you activate a development environment, Okteto overrides the original container settings with a development container that has your development tools installed, syncs your local code to the container, forwards ports for access, and provides shell access for debugging.

This creates a hybrid environment where you code locally but run in the cloud, getting the benefits of both local development speed and cloud infrastructure power.

## Installing Okteto CLI

Install the Okteto CLI:

```bash
# macOS

brew install okteto

# Linux
curl https://get.okteto.com -sSfL | sh

# Windows
scoop install okteto

# Verify installation
okteto version

# Login to Okteto Cloud (or self-hosted instance)
okteto context use https://cloud.okteto.com
```

Configure Okteto for your cluster:

```bash
# Use existing Kubernetes context
okteto context use your-cluster-context

# Or use Okteto Cloud
okteto context use https://cloud.okteto.com

# Create namespace
okteto namespace create dev-environment

# List available contexts
okteto context list
```

## Creating Okteto Manifest

Create an okteto.yml configuration:

```yaml
# okteto.yml
name: api-service
namespace: development

# Development container configuration
dev:
  api:
    # Deployment to mirror
    selector:
      app: api-service

    # Development image with tools
    image: node:22

    # Command to run in dev mode
    command: bash

    # Working directory
    workdir: /app

    # Sync configuration
    sync:
      - .:/app

    # Port forwarding
    forward:
      - 3000:3000    # Application
      - 9229:9229    # Node debugger

    # Volume mounts
    volumes:
      - /app/node_modules

    # Environment variables
    environment:
      NODE_ENV: development
      DEBUG: "app:*"
      LOG_LEVEL: debug

    # Persistent volume
    persistentVolume:
      enabled: true
      size: 10Gi
      storageClass: standard

    # Security context
    securityContext:
      runAsUser: 0
      runAsGroup: 0

    # Resource limits
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: 2000m
        memory: 2Gi

  # Additional services
  worker:
    selector:
      app: worker-service
    image: node:22
    sync:
      - ./services/worker:/app
    forward:
      - 3001:3001

# Build configuration
build:
  api:
    context: .
    dockerfile: Dockerfile
    target: development

# Deploy configuration
deploy:
  - kubectl apply -f k8s/

# Destroy configuration
destroy:
  - kubectl delete -f k8s/
```

## Configuring Development Dockerfile

Create a development-optimized Dockerfile:

```dockerfile
# Dockerfile
FROM node:22-alpine as base
WORKDIR /app

# Production dependencies
FROM base as dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Development dependencies
FROM base as dev-dependencies
COPY package*.json ./
RUN npm install

# Development stage
FROM base as development
COPY package*.json ./
RUN npm install -g nodemon
COPY --from=dev-dependencies /app/node_modules ./node_modules
COPY . .
EXPOSE 3000 9229
CMD ["nodemon", "--inspect=0.0.0.0:9229", "src/app.js"]

# Production build
FROM base as build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production stage
FROM base as production
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/app.js"]
```

## Starting Development Environment

Activate your development environment:

```bash
# Start development mode
okteto up

# This will:
# 1. Build development image
# 2. Deploy manifests
# 3. Scale the original deployment to zero
# 4. Create a mirror deployment with the dev container
# 5. Sync local files
# 6. Forward ports
# 7. Open shell
```

Inside the development container:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Access other cluster services
nc -vz database-service 5432
curl http://auth-service:8080

# Exit development mode
exit
```

Stop development:

```bash
# Deactivate development mode
okteto down

# This restores the original deployment
```

## Multi-Service Development

Configure multiple services:

```yaml
# okteto.yml
name: microservices-app

dev:
  api:
    selector:
      app: api
    image: node:22
    sync:
      - ./services/api:/app
    forward:
      - 3000:3000
    command: ["bash"]

  frontend:
    selector:
      app: frontend
    image: node:22
    sync:
      - ./services/frontend:/app
    forward:
      - 8080:8080
    command: ["bash"]

  worker:
    selector:
      app: worker
    image: okteto/python:3.11
    sync:
      - ./services/worker:/app
    forward:
      - 5000:5000
    command: ["bash"]

build:
  api:
    context: ./services/api
  frontend:
    context: ./services/frontend
  worker:
    context: ./services/worker

deploy:
  - helm upgrade --install api ./charts/api
  - helm upgrade --install frontend ./charts/frontend
  - helm upgrade --install worker ./charts/worker
```

Develop multiple services:

```bash
# Start development mode and choose a service if prompted
okteto up

# Start specific service
okteto up api

# Start another service in a separate terminal
okteto up worker
```

## Configuring CI/CD Integration

Integrate Okteto with GitHub Actions:

```yaml
# .github/workflows/preview.yml
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Okteto CLI
        run: |
          curl https://get.okteto.com -sSfL | sh

      - name: Authenticate with Okteto
        run: |
          okteto context use ${{ secrets.OKTETO_URL }} --token ${{ secrets.OKTETO_TOKEN }}

      - name: Deploy Preview
        run: |
          okteto preview deploy pr-${{ github.event.pull_request.number }}

      - name: Get Preview URL
        id: preview
        run: |
          ENDPOINTS=$(okteto preview endpoints pr-${{ github.event.pull_request.number }} -o md)
          {
            echo "body<<EOF"
            echo "Preview environment deployed:"
            echo "$ENDPOINTS"
            echo "EOF"
          } >> "$GITHUB_OUTPUT"

      - name: Comment on PR
        uses: actions/github-script@v9
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `${{ steps.preview.outputs.body }}`
            })
```

## Creating Docker Compose Development Environments

Define a reusable Docker Compose development environment:

```yaml
# docker-compose.yml
name: development-stack

services:
  api:
    build: ./services/api
    ports:
      - 3000:3000
    environment:
      DATABASE_URL: postgres://postgres:5432/app
      REDIS_URL: redis://redis:6379
    volumes:
      - ./services/api:/app

  database:
    image: postgres:15
    ports:
      - 5432:5432
    environment:
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: app
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379

  frontend:
    build: ./services/frontend
    ports:
      - 8080:8080
    environment:
      API_URL: http://api:3000

volumes:
  postgres-data:
```

Deploy the environment:

```bash
# Deploy the Compose environment
okteto deploy

# List public endpoints
okteto endpoints

# View service logs
okteto logs api

# Destroy the environment
okteto destroy
```

## Implementing Secrets Management

Handle secrets securely:

```yaml
# okteto.yml
name: api-service

dev:
  api:
    selector:
      app: api
    image: node:22

    # Local secret files to sync into the development container
    secrets:
      - .env.db:/app/.env.db:600
      - .env.keys:/app/.env.keys:600

    environment:
      DATABASE_PASSWORD: ${DB_PASSWORD}
```

Prepare secrets:

```bash
# Create local secret files referenced by dev.secrets
printf "DATABASE_URL=postgres://postgres:dev@database:5432/app\n" > .env.db
printf "API_KEY=your-key\nSECRET_KEY=your-secret\n" > .env.keys

# Create a Kubernetes secret for deployed workloads
kubectl create secret generic database-credentials \
  --from-file=.env.db

# Create secret from literals
kubectl create secret generic api-keys \
  --from-literal=API_KEY=your-key \
  --from-literal=SECRET_KEY=your-secret

# Pass environment variables from your shell or Okteto variables
export DB_PASSWORD=dev-password
```

## Configuring Custom Domains

Set up custom domains for preview environments:

```yaml
# okteto.yml
name: api-service

deploy:
  - envsubst < k8s/ingress.yaml | kubectl apply -f -
```

Create the Ingress manifest:

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-service
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  rules:
    - host: ${OKTETO_NAMESPACE}.${OKTETO_DOMAIN}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
  tls:
    - hosts:
        - ${OKTETO_NAMESPACE}.${OKTETO_DOMAIN}
      secretName: api-tls
```

## Optimizing Development Performance

Improve sync performance:

```yaml
# okteto.yml
name: api-service

dev:
  api:
    sync:
      # Use compression
      compression: true

      # Verbose mode for debugging
      verbose: false

      # Sync settings
      rescanInterval: 300

      # Sync folders
      folders:
        - .:/app

    # Use persistent volumes for dependencies
    volumes:
      - /app/node_modules
      - /app/.next
      - /app/build
```

Monitor sync status:

```bash
# Watch file sync
okteto status --watch

# Check sync status
okteto status

# Force resync
okteto up --reset
```

Okteto transforms Kubernetes development by providing instant access to cloud-based development environments that mirror production. By eliminating local infrastructure requirements while maintaining the speed and convenience of local development through intelligent file syncing and port forwarding, Okteto enables teams to develop efficiently regardless of their local machine capabilities or network conditions.
