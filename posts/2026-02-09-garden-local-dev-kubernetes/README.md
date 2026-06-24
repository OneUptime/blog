# How to Build a Local Development Workflow with Garden and Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevEx, Development

Description: Learn how to use Garden to create fast, automated local development workflows for Kubernetes applications with hot-reloading, dependency management, and integrated testing.

---

Managing local Kubernetes development workflows becomes complex as applications grow. You need to build multiple services, manage dependencies between them, sync code changes, run tests, and handle configuration across different environments. Doing this manually with scripts and tools quickly becomes unwieldy and error-prone.

Garden is a development orchestration tool that automates these workflows. It provides dependency-aware builds, intelligent caching, code synchronization, integrated testing, and a unified interface for multi-service development. In this guide, you'll learn how to set up Garden for efficient Kubernetes development.

## Understanding Garden Architecture

Garden works by analyzing your project's dependency graph and automatically building, deploying, running, and testing actions in the correct order. It uses a declarative configuration where you define actions for building, deploying, running, and testing your services.

Garden can monitor file changes and sync source files into running containers when you deploy in sync mode. It caches build and test results and only rebuilds what's necessary, dramatically reducing iteration time. The tool works with local Kubernetes clusters like kind, minikube, or k3d, as well as remote development clusters.

## Installing Garden

Install Garden CLI:

```bash
# macOS
brew install garden-io/garden/garden-cli

# Linux
curl -sL https://get.garden.io/install.sh | bash

# Verify installation
garden version

# Initialize Garden in your project
garden init
```

Create a basic Garden configuration:

```yaml
# project.garden.yml
apiVersion: garden.io/v2
kind: Project
name: my-application
defaultEnvironment: local

environments:
  - name: local
    defaultNamespace: development-${local.username}
    variables:
      dbPassword: localpassword
      grafanaPassword: admin
  - name: dev
    defaultNamespace: dev-${local.username}

providers:
  - name: local-kubernetes
    environments: [local]
  - name: kubernetes
    environments: [dev]
    context: dev-cluster
```

## Configuring Services with Garden

Create Garden actions for a Node.js API service:

```yaml
# services/api/garden.yml
kind: Build
name: api-service
type: container
description: Build the API service image
---
kind: Deploy
name: api
type: container
description: Main API service
dependencies:
  - build.api-service
  - deploy.database
  - deploy.redis
spec:
  image: ${actions.build.api-service.outputs.deploymentImageId}
  replicas: 1
  deploymentStrategy: RollingUpdate
  ports:
    - name: http
      containerPort: 3000
      servicePort: 80
      localPort: 3000
  env:
    NODE_ENV: development
    DATABASE_URL: postgres://postgres:${var.dbPassword}@database-postgresql:5432/app
    REDIS_URL: redis://redis:6379
  healthCheck:
    httpGet:
      path: /health
      port: http
  cpu:
    min: 100
    max: 500
  memory:
    min: 128
    max: 512
---
kind: Test
name: api-unit
type: container
dependencies:
  - build.api-service
spec:
  image: ${actions.build.api-service.outputs.deploymentImageId}
  command: [npm, run, test:unit]
  env:
    NODE_ENV: test
---
kind: Test
name: api-integration
type: container
dependencies:
  - build.api-service
  - deploy.database
  - deploy.redis
spec:
  image: ${actions.build.api-service.outputs.deploymentImageId}
  command: [npm, run, test:integration]
  env:
    NODE_ENV: test
    DATABASE_URL: postgres://postgres:${var.dbPassword}@database-postgresql:5432/app
    REDIS_URL: redis://redis:6379
```

Create database and Redis deploy actions:

```yaml
# services/database/garden.yml
kind: Deploy
name: database
type: helm
description: PostgreSQL database
spec:
  chart:
    name: postgresql
    repo: https://charts.bitnami.com/bitnami
    version: "12.1.0"
  values:
    auth:
      postgresPassword: ${var.dbPassword}
      database: app
    primary:
      persistence:
        enabled: false  # Disable for local dev
      resources:
        requests:
          memory: 256Mi
          cpu: 100m
---
kind: Deploy
name: redis
type: container
description: Redis cache
spec:
  image: redis:7-alpine
  ports:
    - name: redis
      containerPort: 6379
      servicePort: 6379
```

## Implementing Hot-Reloading

Configure code synchronization for fast development:

```yaml
# services/api/garden.yml
kind: Build
name: api-service
type: container
spec:
  dockerfile: Dockerfile
---
kind: Deploy
name: api
type: container
dependencies:
  - build.api-service
spec:
  image: ${actions.build.api-service.outputs.deploymentImageId}
  ports:
    - name: http
      containerPort: 3000
      servicePort: 80
      localPort: 3000
  sync:
    command: [npm, run, dev]
    paths:
      - source: src
        target: /app/src
        mode: one-way-safe
        exclude:
          - '**/*.test.js'
          - '**/node_modules/**'
      - source: public
        target: /app/public
        mode: one-way-safe
```

Your Dockerfile should support the development command used in sync mode:

```dockerfile
FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Install nodemon for hot-reloading
RUN npm install -g nodemon

# Development command with nodemon
CMD ["nodemon", "--watch", "src", "src/app.js"]
```

## Creating Development Tasks

Define Run actions for common operations:

```yaml
# services/api/garden.yml
kind: Run
name: migrate
type: container
description: Run database migrations
dependencies:
  - build.api-service
  - deploy.database
spec:
  image: ${actions.build.api-service.outputs.deploymentImageId}
  command: [npm, run, migrate]
  env:
    DATABASE_URL: postgres://postgres:${var.dbPassword}@database-postgresql:5432/app
---
kind: Run
name: seed
type: container
description: Seed database with test data
dependencies:
  - build.api-service
  - deploy.database
  - run.migrate
spec:
  image: ${actions.build.api-service.outputs.deploymentImageId}
  command: [npm, run, seed]
  env:
    DATABASE_URL: postgres://postgres:${var.dbPassword}@database-postgresql:5432/app
---
kind: Run
name: cleanup
type: container
description: Clean up test data
dependencies:
  - build.api-service
  - deploy.database
spec:
  image: ${actions.build.api-service.outputs.deploymentImageId}
  command: [npm, run, cleanup]
  env:
    DATABASE_URL: postgres://postgres:${var.dbPassword}@database-postgresql:5432/app
```

Run tasks and inspect the service:

```bash
# Run migrations
garden run migrate

# Seed database
garden run seed

# Open shell in the deployed API container
garden exec api -- sh

# View logs
garden logs api --follow
```

## Setting Up Development Environment

Create an environment-specific configuration:

```yaml
# project.garden.yml
apiVersion: garden.io/v2
kind: Project
name: my-application

environments:
  - name: local
    defaultNamespace: dev-${local.username}
    variables:
      dbPassword: localpassword
      apiReplicas: 1
      logLevel: debug

providers:
  - name: local-kubernetes
    environments: [local]
```

Start the full development environment:

```bash
# Deploy all services
garden deploy

# Deploy specific services
garden deploy api

# Deploy with sync enabled
garden deploy --sync=api

# Open the interactive dev console
garden dev

# Deploy and follow logs
garden deploy api --logs
```

## Creating Automated Workflows

Define workflows for common development scenarios:

```yaml
# workflows.garden.yml
kind: Workflow
name: full-test
description: Run all tests in correct order

steps:
  - command: [deploy]
    description: Deploy all services

  - command: [run, migrate]
    description: Run database migrations

  - command: [test]
    description: Run all tests

  - command: [run, cleanup]
    description: Clean up test data
    when: always

---
kind: Workflow
name: dev-setup
description: Set up development environment

steps:
  - command: [deploy, database, redis]
    description: Deploy infrastructure services

  - command: [run, migrate]
    description: Run migrations

  - command: [run, seed]
    description: Seed test data

  - command: [deploy, api]
    description: Deploy API service

  - script: |
      echo "Development environment ready!"
      echo "API available through the port forward created by Garden."
```

Run workflows:

```bash
# Run full test suite
garden workflow full-test

# Set up development environment
garden workflow dev-setup
```

## Integrating Tests

Configure comprehensive testing:

```yaml
# services/api/garden.yml
kind: Test
name: api-unit
type: container
dependencies:
  - build.api-service
spec:
  image: ${actions.build.api-service.outputs.deploymentImageId}
  command: [npm, run, test:unit]
  env:
    NODE_ENV: test
---
kind: Test
name: api-integration
type: container
dependencies:
  - build.api-service
  - deploy.database
  - deploy.redis
spec:
  image: ${actions.build.api-service.outputs.deploymentImageId}
  command: [npm, run, test:integration]
  env:
    NODE_ENV: test
    DATABASE_URL: postgres://postgres:${var.dbPassword}@database-postgresql:5432/app
    REDIS_URL: redis://redis:6379
---
kind: Test
name: api-e2e
type: container
dependencies:
  - build.api-service
  - deploy.api
spec:
  image: ${actions.build.api-service.outputs.deploymentImageId}
  command: [npm, run, test:e2e]
  env:
    API_URL: http://api
```

Run tests:

```bash
# Run all tests
garden test

# Run specific test
garden test api-unit

# Force a cached test to run again
garden test api-integration --force

# Run tests interactively
garden test api-integration -i
```

## Creating a Complete Development Script

Automate the entire development workflow:

```bash
#!/bin/bash
# start-dev.sh

set -e

echo "🌱 Starting Garden development environment..."

# Ensure cluster is running
if ! kubectl cluster-info &> /dev/null; then
    echo "Creating local Kubernetes cluster..."
    kind create cluster --name garden-dev
    kubectl config use-context kind-garden-dev
fi

# Deploy with sync enabled and stream logs
garden deploy --sync=api --logs &
GARDEN_PID=$!

# Run initial setup tasks
echo "🔧 Running setup tasks..."
garden run migrate
garden run seed

# Display access information
echo ""
echo "✅ Development environment ready!"
echo ""
echo "Status:"
garden get status
echo ""
echo "Available commands:"
echo "  garden logs <deploy>   - View deploy logs"
echo "  garden exec <deploy> -- sh  - Execute a shell in a deploy"
echo "  garden test            - Run tests"
echo ""
echo "Press Ctrl+C to stop"

# Handle cleanup
trap "echo '🛑 Stopping Garden...' && kill $GARDEN_PID && garden cleanup env" EXIT

# Wait for interrupt
wait $GARDEN_PID
```

## Monitoring Development Environment

Create monitoring dashboards:

```yaml
# monitoring.garden.yml
kind: Deploy
name: monitoring
type: helm
spec:
  chart:
    name: kube-prometheus-stack
    repo: https://prometheus-community.github.io/helm-charts
  values:
    prometheus:
      prometheusSpec:
        serviceMonitorSelectorNilUsesHelmValues: false
    grafana:
      enabled: true
      adminPassword: ${var.grafanaPassword}
  portForwards:
    - name: grafana
      resource: Service/monitoring-grafana
      targetPort: 80
      localPort: 3000
    - name: prometheus
      resource: Service/monitoring-kube-prometheus-prometheus
      targetPort: 9090
      localPort: 9090
```

Access monitoring:

```bash
# Start Garden-managed port forwards for monitoring
garden deploy monitoring --forward

# View logs for the monitoring deploy
garden logs monitoring --follow
```

Garden provides a comprehensive development orchestration platform that eliminates the complexity of managing multi-service Kubernetes applications. By automating builds, deployments, testing, and code synchronization while intelligently managing dependencies and caching, Garden dramatically accelerates development workflows and reduces the friction of cloud-native development.
