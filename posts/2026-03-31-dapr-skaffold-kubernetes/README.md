# How to Use Dapr with Skaffold for Kubernetes Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Skaffold, Kubernetes, Development, CI/CD

Description: Use Skaffold to automate build-deploy cycles for Dapr microservices on Kubernetes, with file watching, port forwarding, and CI mode for pipelines.

---

## Overview

Skaffold is a command-line tool that handles the workflow for building, pushing, and deploying applications to Kubernetes. For Dapr development, Skaffold automates the image build and kubectl apply cycle, handles port forwarding, and provides a consistent pipeline from local development to CI/CD.

## Prerequisites

- Skaffold installed (`brew install skaffold`)
- Docker Desktop with Kubernetes or a remote cluster
- Dapr installed on the cluster
- kubectl configured

## Basic skaffold.yaml

Create a `skaffold.yaml` in your project root:

```yaml
apiVersion: skaffold/v4beta6
kind: Config
metadata:
  name: dapr-services

build:
  artifacts:
  - image: myorg/order-service
    context: services/order-service
    docker:
      dockerfile: Dockerfile
  - image: myorg/inventory-service
    context: services/inventory-service

  local:
    push: false
    useBuildkit: true

deploy:
  kubectl:
    manifests:
    - k8s/components/*.yaml
    - k8s/deployments/*.yaml

portForward:
- resourceType: deployment
  resourceName: order-service
  namespace: default
  port: 3001
  localPort: 3001
- resourceType: deployment
  resourceName: order-service
  namespace: default
  port: 3500
  localPort: 3500
  address: "0.0.0.0"

profiles:
- name: production
  deploy:
    kubectl:
      manifests:
      - k8s/components/production/*.yaml
      - k8s/deployments/*.yaml
```

## Kubernetes Deployment

Dapr-annotated deployment compatible with Skaffold:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  labels:
    app: order-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "3001"
        dapr.io/log-level: "debug"
        dapr.io/log-as-json: "true"
    spec:
      containers:
      - name: order-service
        image: myorg/order-service
        ports:
        - containerPort: 3001
```

## Development Workflow

```bash
# Start Skaffold in watch mode
skaffold dev

# Start with a specific profile
skaffold dev --profile=staging

# Run once and exit (CI mode)
skaffold run

# Delete all deployed resources
skaffold delete
```

## File Sync for Fast Iteration

Configure sync rules to update files without rebuilding:

```yaml
build:
  artifacts:
  - image: myorg/order-service
    context: services/order-service
    sync:
      manual:
      - src: "src/**/*.js"
        dest: /app/src
      - src: "config/*.yaml"
        dest: /app/config
      hooks:
        after:
        - container:
            command: ["node", "-e", "process.exit(0)"]
```

## CI/CD Pipeline Integration

```bash
# In CI pipeline - build and deploy
skaffold run \
  --filename=skaffold.yaml \
  --profile=production \
  --tag=$CI_COMMIT_SHA \
  --namespace=production

# Verify deployment status
kubectl rollout status deployment/order-service -n production --timeout=5m
```

## Using Skaffold with Helm Deployments

```yaml
deploy:
  helm:
    releases:
    - name: order-service
      chartPath: charts/order-service
      valuesFiles:
      - charts/order-service/values-dev.yaml
      setValueTemplates:
        image.tag: "{{.IMAGE_TAG}}"
      setValues:
        dapr.enabled: "true"
```

## Summary

Skaffold provides a streamlined build-deploy-watch cycle for Dapr microservices on Kubernetes. Its file sync capabilities minimize rebuild time during development, while CI mode ensures the same tooling works consistently in automated pipelines. The profile system makes it easy to target different environments from the same configuration.
