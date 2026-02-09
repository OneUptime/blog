# How to Configure Okteto for Cloud-Based Kubernetes Development Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevEx, Development

Description: Learn how to set up Okteto for cloud-based Kubernetes development environments that provide instant access to production-like clusters without local infrastructure requirements.

---

Running Kubernetes clusters locally requires significant resources and can strain developer machines, especially for large applications with multiple services. Local clusters often don't match production configurations, leading to environment-specific bugs. Okteto solves this by providing cloud-based development environments that give developers instant access to production-like Kubernetes clusters with automatic code synchronization and hot-reloading.

With Okteto, developers can work in actual Kubernetes clusters without managing local infrastructure, collaborate easily by sharing development URLs, and test against production-like configurations. In this guide, you'll learn how to configure and use Okteto for efficient cloud-based development.

## Understanding Okteto Architecture

Okteto works by replacing pods in a Kubernetes cluster with development containers that sync code from your local machine. When you activate a development environment, Okteto swaps the production container with a development container that has your development tools installed, syncs your local code to the container, forwards ports for access, and provides shell access for debugging.

This creates a hybrid environment where you code locally but run in the cloud, getting the benefits of both local development speed and cloud infrastructure power.

## Installing Okteto CLI

Install the Okteto CLI:

```bash
# macOS
brew install okteto/cli/okteto

# Linux
curl https://get.okteto.com -sSfL | sh

# Windows
scoop install okteto

# Verify installation
okteto version

# Login to Okteto Cloud (or self-hosted instance)
okteto context use https://cloud.okteto.com
okteto login
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
    # Container to replace
    selector:
      app: api-service

    # Development image with tools
    image: okteto/node:18

    # Command to run in dev mode
    command: bash

    # Working directory
    workdir: /app

    # Sync configuration
    sync:
      - .:/app
      excludes:
        - node_modules
        - .git
        - '*.log'
        - dist/
        - coverage/

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
    image: okteto/node:18
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
FROM node:18-alpine as base
WORKDIR /app

# Production dependencies
FROM base as dependencies
COPY package*.json ./
RUN npm ci --only=production

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
# 3. Replace pod with dev container
# 4. Sync local files
# 5. Forward ports
# 6. Open shell
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
curl http://database-service:5432
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
    image: okteto/node:18
    sync:
      - ./services/api:/app
    forward:
      - 3000:3000
    command: ["bash"]

  frontend:
    selector:
      app: frontend
    image: okteto/node:18
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
# Start all services
okteto up

# Start specific service
okteto up api

# Start multiple specific services
okteto up api worker
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
      - uses: actions/checkout@v3

      - name: Install Okteto CLI
        run: |
          curl https://get.okteto.com -sSfL | sh

      - name: Authenticate with Okteto
        run: |
          okteto context use ${{ secrets.OKTETO_URL }}
          echo ${{ secrets.OKTETO_TOKEN }} | okteto login --token

      - name: Deploy Preview
        run: |
          okteto preview deploy pr-${{ github.event.pull_request.number }}

      - name: Get Preview URL
        id: preview
        run: |
          URL=$(okteto preview list | grep pr-${{ github.event.pull_request.number }} | awk '{print $2}')
          echo "url=$URL" >> $GITHUB_OUTPUT

      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview environment deployed: ${{ steps.preview.outputs.url }}'
            })
```

## Creating Development Stacks

Define reusable development stacks:

```yaml
# okteto-stack.yml
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

Deploy the stack:

```bash
# Deploy stack
okteto stack deploy -f okteto-stack.yml

# List running stacks
okteto stack list

# View stack logs
okteto stack logs

# Destroy stack
okteto stack destroy
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
    image: okteto/node:18

    # Secrets from Kubernetes
    secrets:
      - name: database-credentials
        file: /app/.env.db

      - name: api-keys
        file: /app/.env.keys

    # External secrets
    externalSecrets:
      - name: aws-credentials
        backend: aws-secrets-manager
        data:
          - key: /prod/database/password
            name: DB_PASSWORD

    environment:
      DATABASE_PASSWORD: ${DB_PASSWORD}
```

Create secrets:

```bash
# Create secret from file
kubectl create secret generic database-credentials \
  --from-file=.env.db

# Create secret from literals
kubectl create secret generic api-keys \
  --from-literal=API_KEY=your-key \
  --from-literal=SECRET_KEY=your-secret

# Use Okteto to manage secrets
okteto secret create AWS_ACCESS_KEY_ID=xxx
okteto secret create AWS_SECRET_ACCESS_KEY=yyy
```

## Configuring Custom Domains

Set up custom domains for preview environments:

```yaml
# okteto.yml
name: api-service

deploy:
  - kubectl apply -f k8s/

ingress:
  enabled: true
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  rules:
    - host: ${OKTETO_NAMESPACE}.${OKTETO_DOMAIN}
      http:
        paths:
          - path: /
            backend:
              serviceName: api-service
              servicePort: 80
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

      # Exclude patterns
      - .:/app
      excludes:
        - node_modules/
        - .git/
        - '*.log'
        - coverage/
        - dist/
        - build/
        - .next/
        - .cache/

    # Use persistent volumes for dependencies
    volumes:
      - /app/node_modules
      - /app/.next
      - /app/build
```

Monitor sync status:

```bash
# Watch file sync
okteto up --verbose

# Check sync status
okteto status

# Force resync
okteto restart
```

Okteto transforms Kubernetes development by providing instant access to cloud-based development environments that mirror production. By eliminating local infrastructure requirements while maintaining the speed and convenience of local development through intelligent file syncing and port forwarding, Okteto enables teams to develop efficiently regardless of their local machine capabilities or network conditions.
