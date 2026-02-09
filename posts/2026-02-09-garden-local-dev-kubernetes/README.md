# How to Build a Local Development Workflow with Garden and Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevEx, Development

Description: Learn how to use Garden to create fast, automated local development workflows for Kubernetes applications with hot-reloading, dependency management, and integrated testing.

---

Managing local Kubernetes development workflows becomes complex as applications grow. You need to build multiple services, manage dependencies between them, sync code changes, run tests, and handle configuration across different environments. Doing this manually with scripts and tools quickly becomes unwieldy and error-prone.

Garden is a development orchestration tool that automates these workflows. It provides dependency-aware builds, intelligent caching, hot-reloading, integrated testing, and a unified interface for multi-service development. In this guide, you'll learn how to set up Garden for efficient Kubernetes development.

## Understanding Garden Architecture

Garden works by analyzing your project's dependency graph and automatically building, deploying, and testing services in the correct order. It uses a declarative configuration where you define actions for building, deploying, running, and testing your services.

Garden monitors file changes and automatically rebuilds and redeploys affected services. It caches build results and only rebuilds what's necessary, dramatically reducing iteration time. The tool works with local Kubernetes clusters like kind, minikube, or k3d, as well as remote development clusters.

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
apiVersion: garden.io/v1
kind: Project
name: my-application
defaultEnvironment: local

environments:
  - name: local
    defaultNamespace: development-${local.username}
  - name: dev
    defaultNamespace: dev-${local.username}

providers:
  - name: kubernetes
    environments: [local, dev]
    context: kind-local
    deploymentStrategy: rolling

    # Build images locally with docker
    buildMode: local-docker

    # Enable hot-reloading
    sync:
      defaults:
        exclude:
          - node_modules
          - .git
          - '*.log'
```

## Configuring Services with Garden

Create a Garden module for a Node.js API service:

```yaml
# services/api/garden.yml
apiVersion: garden.io/v1
kind: Module
name: api-service
type: container
description: Main API service

# Dependencies
dependencies:
  - database
  - redis

# Build configuration
build:
  dependencies:
    - name: shared-lib
      copy:
        - source: ./dist
          target: /app/lib

# Service configuration
services:
  - name: api
    dependencies:
      - database
      - redis
    sourceModule: api-service

    # Hot reload configuration
    hotReload:
      sync:
        - source: /src
          target: /app/src

    # Deployment spec
    spec:
      image: ${modules.api-service.outputs.deployment-image-id}
      replicas: 1
      ports:
        - name: http
          containerPort: 3000
          servicePort: 80
      env:
        NODE_ENV: development
        DATABASE_URL: postgres://postgres:5432/app
        REDIS_URL: redis://redis:6379

      # Health checks
      healthCheck:
        httpGet:
          path: /health
          port: http

      # Resource limits
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi

# Test configuration
tests:
  - name: unit
    command: [npm, test]
    dependencies: []

  - name: integration
    command: [npm, run, test:integration]
    dependencies:
      - database
      - redis
```

Create a database module:

```yaml
# services/database/garden.yml
apiVersion: garden.io/v1
kind: Module
name: database
type: helm
description: PostgreSQL database

# Use Bitnami PostgreSQL chart
chart: bitnami/postgresql
version: "12.1.0"

repo: https://charts.bitnami.com/bitnami

values:
  auth:
    postgresPassword: ${var.db-password}
    database: app

  primary:
    persistence:
      enabled: false  # Disable for local dev

    resources:
      requests:
        memory: 256Mi
        cpu: 100m

services:
  - name: database
    dependencies: []
    ports:
      - name: postgresql
        containerPort: 5432
```

## Implementing Hot-Reloading

Configure hot-reloading for fast development:

```yaml
# services/api/garden.yml
apiVersion: garden.io/v1
kind: Module
name: api-service
type: container

services:
  - name: api
    hotReload:
      sync:
        - source: /src
          target: /app/src
          mode: two-way
          exclude:
            - '**/*.test.js'
            - '**/node_modules/**'

        - source: /public
          target: /app/public
          mode: one-way-replica

      # Post-sync command to restart the process
      postSyncCommand: [npm, run, dev]

# Dockerfile needs to support hot-reload
dockerfile: |
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

Define tasks for common operations:

```yaml
# services/api/garden.yml
apiVersion: garden.io/v1
kind: Module
name: api-service
type: container

tasks:
  - name: migrate
    description: Run database migrations
    command: [npm, run, migrate]
    dependencies:
      - database
    env:
      DATABASE_URL: ${services.database.outputs.connection-string}

  - name: seed
    description: Seed database with test data
    command: [npm, run, seed]
    dependencies:
      - migrate

  - name: shell
    description: Open interactive shell in container
    command: [/bin/sh]
    dependencies:
      - api
    interactive: true

  - name: logs
    description: Stream application logs
    command: [kubectl, logs, -f, -l, app=api-service]
```

Run tasks:

```bash
# Run migrations
garden run task migrate

# Seed database
garden run task seed

# Open shell
garden run task shell

# View logs
garden run task logs
```

## Setting Up Development Environment

Create an environment-specific configuration:

```yaml
# garden.local.yml
apiVersion: garden.io/v1
kind: Project
name: my-application

environments:
  - name: local
    variables:
      db-password: localpassword
      api-replicas: 1
      log-level: debug

providers:
  - name: kubernetes
    namespace: dev-${local.username}

    # Use local Docker registry
    dockerRegistry:
      hostname: localhost:5000
      namespace: development
```

Start the full development environment:

```bash
# Deploy all services
garden deploy

# Deploy specific services
garden deploy api-service

# Deploy with hot-reload enabled
garden dev

# Deploy and follow logs
garden logs --follow api-service
```

## Creating Automated Workflows

Define workflows for common development scenarios:

```yaml
# workflows.garden.yml
apiVersion: garden.io/v1
kind: Workflow
name: full-test
description: Run all tests in correct order

steps:
  - command: [deploy]
    description: Deploy all services

  - command: [run, task, migrate]
    description: Run database migrations

  - command: [test]
    description: Run all tests

  - command: [run, task, cleanup]
    description: Clean up test data
    when: always

---
apiVersion: garden.io/v1
kind: Workflow
name: dev-setup
description: Set up development environment

steps:
  - command: [deploy, database, redis]
    description: Deploy infrastructure services

  - command: [run, task, migrate]
    description: Run migrations

  - command: [run, task, seed]
    description: Seed test data

  - command: [deploy, api-service]
    description: Deploy API service

  - script: |
      echo "Development environment ready!"
      echo "API available at http://localhost:3000"
```

Run workflows:

```bash
# Run full test suite
garden run workflow full-test

# Set up development environment
garden run workflow dev-setup
```

## Integrating Tests

Configure comprehensive testing:

```yaml
# services/api/garden.yml
apiVersion: garden.io/v1
kind: Module
name: api-service
type: container

tests:
  - name: unit
    command: [npm, run, test:unit]
    dependencies: []
    env:
      NODE_ENV: test

  - name: integration
    command: [npm, run, test:integration]
    dependencies:
      - database
      - redis
    env:
      NODE_ENV: test
      DATABASE_URL: ${services.database.outputs.connection-string}

  - name: e2e
    command: [npm, run, test:e2e]
    dependencies:
      - api
    env:
      API_URL: ${services.api.outputs.ingress-url}
```

Run tests:

```bash
# Run all tests
garden test

# Run specific test
garden test api-service unit

# Run tests in watch mode
garden test --watch

# Run tests with specific tag
garden test --tag integration
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
fi

# Start Garden in development mode
garden dev --hot-reload --logs all &
GARDEN_PID=$!

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
garden deploy --wait

# Run initial setup tasks
echo "🔧 Running setup tasks..."
garden run task migrate
garden run task seed

# Display access information
echo ""
echo "✅ Development environment ready!"
echo ""
echo "Services:"
garden get services
echo ""
echo "Available commands:"
echo "  garden logs <service>  - View service logs"
echo "  garden exec <service>  - Execute command in service"
echo "  garden test            - Run tests"
echo ""
echo "Press Ctrl+C to stop"

# Handle cleanup
trap "echo '🛑 Stopping Garden...' && kill $GARDEN_PID && garden delete env" EXIT

# Wait for interrupt
wait $GARDEN_PID
```

## Monitoring Development Environment

Create monitoring dashboards:

```yaml
# monitoring.garden.yml
apiVersion: garden.io/v1
kind: Module
name: monitoring
type: helm

chart: prometheus-community/kube-prometheus-stack
repo: https://prometheus-community.github.io/helm-charts

values:
  prometheus:
    prometheusSpec:
      serviceMonitorSelectorNilUsesHelmValues: false

  grafana:
    enabled: true
    adminPassword: ${var.grafana-password}

services:
  - name: prometheus
    ports:
      - name: web
        containerPort: 9090

  - name: grafana
    ports:
      - name: web
        containerPort: 3000
```

Access monitoring:

```bash
# Port forward to Grafana
garden port-forward grafana 3000

# View Prometheus metrics
garden port-forward prometheus 9090
```

Garden provides a comprehensive development orchestration platform that eliminates the complexity of managing multi-service Kubernetes applications. By automating builds, deployments, testing, and hot-reloading while intelligently managing dependencies and caching, Garden dramatically accelerates development workflows and reduces the friction of cloud-native development.
