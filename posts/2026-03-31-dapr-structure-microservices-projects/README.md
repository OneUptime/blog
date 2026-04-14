# How to Structure Dapr Microservices Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Microservice, Project Structure, Architecture, Best Practice

Description: Learn how to structure a Dapr microservices project with consistent directory layouts, component organization, and shared configuration for maintainable codebases.

---

## Overview

A consistent project structure makes Dapr microservices easier to onboard, test, and deploy. Without structure, Dapr component files, resiliency policies, and service code scatter across the repository making it difficult to understand dependencies and manage configuration drift.

## Recommended Repository Layout

For a monorepo containing multiple Dapr services:

```text
my-platform/
  dapr/
    components/           # Shared Dapr component definitions
      local/              # Local development overrides
      staging/
      production/
    config/               # Dapr Configuration CRDs
      tracing.yaml
      metrics.yaml
    resiliency/           # Dapr Resiliency policies (separate CRD)
      resiliency.yaml
    subscriptions/        # Pub/sub subscription manifests
  services/
    order-service/
      src/
      Dockerfile
      dapr.yaml           # Multi-App Run template
    payment-service/
      src/
      Dockerfile
      dapr.yaml
    inventory-service/
      src/
      Dockerfile
      dapr.yaml
  deploy/
    kubernetes/           # Kubernetes manifests per service
      order-service/
        deployment.yaml
        service.yaml
      payment-service/
    helm/                 # Helm charts
  docker-compose.yaml     # Local multi-service development
  Makefile
```

## Service Directory Structure

Each service should follow a consistent internal layout:

```text
order-service/
  src/
    handlers/             # Request handlers (HTTP/gRPC)
      orders.js
      health.js
    services/             # Business logic
      order-processor.js
    dapr/                 # Dapr-specific integration code
      state-client.js
      pubsub-client.js
    config/
      index.js            # Environment-driven config
  tests/
    unit/
    integration/          # Tests using Dapr local runner
  Dockerfile
  package.json
  dapr.yaml               # Multi-App Run template
```

## Dapr Component Directory Organization

Separate component files by environment to prevent accidental misapplication:

```yaml
# dapr/components/production/redis-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      secretKeyRef:
        name: redis-secret
        key: host
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
    - name: enableTLS
      value: "true"
```

```yaml
# dapr/components/local/redis-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "localhost:6379"
    - name: redisPassword
      value: ""
```

## Local Development with docker-compose

Provide a docker-compose file for running all services with Dapr locally:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  order-service:
    build: ./services/order-service
    environment:
      - APP_PORT=8080
    ports:
      - "8080:8080"

  order-service-dapr:
    image: daprio/daprd:1.13.0
    command:
      - ./daprd
      - --app-id
      - order-service
      - --app-port
      - "8080"
      - --resources-path
      - /dapr/components/local
    volumes:
      - ./dapr/components/local:/dapr/components/local
    depends_on:
      - order-service
      - redis
    network_mode: "service:order-service"
```

## Makefile for Common Commands

Provide a Makefile to standardize development workflows:

```makefile
.PHONY: dev test deploy-staging lint-components

dev:
	docker-compose up -d

test:
	cd services/order-service && npm test
	cd services/payment-service && go test ./...

deploy-staging:
	kubectl apply -f dapr/components/staging/ -n staging
	kubectl apply -f deploy/kubernetes/ -n staging

lint-components:
	kubectl apply --dry-run=client -f ./dapr/components/production/
```

## Summary

A structured Dapr project separates component definitions by environment, keeps service code organized internally, and provides a docker-compose setup for consistent local development. Placing all Dapr configuration (components, resiliency, subscriptions) under a top-level `dapr/` directory makes the infrastructure contract explicit and improves collaboration between application and platform teams.
