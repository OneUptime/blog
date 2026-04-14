# How to Use Dapr with Tilt for Local Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tilt, Development, Kubernetes, Hot Reload

Description: Configure Tilt to automate local Kubernetes development for Dapr microservices with live code updates, dependency management, and service visualization.

---

## Overview

Tilt is a local development tool for Kubernetes that watches your code, rebuilds containers on changes, and provides a live dashboard. Combined with Dapr, Tilt eliminates the manual rebuild/redeploy cycle when developing microservices, giving you fast iteration with real Kubernetes behavior.

## Prerequisites

- Tilt installed (`brew install tilt-dev/tap/tilt`)
- Docker Desktop with Kubernetes enabled (or kind/minikube)
- Dapr installed on the local cluster
- kubectl configured

## Basic Tiltfile

Create a `Tiltfile` in your project root:

```python
load('ext://restart_process', 'docker_build_with_restart')

# Install Dapr (once per cluster)
local_resource(
    'dapr-install',
    cmd='dapr init --kubernetes --wait',
    serve_cmd='',
    labels=['infrastructure']
)

# Deploy Dapr components
k8s_yaml(listdir('k8s/components/'))

# Build and deploy order-service
docker_build_with_restart(
    'myorg/order-service',
    context='services/order-service',
    entrypoint=['node', 'src/index.js'],
    live_update=[
        sync('services/order-service/src', '/app/src'),
        run('npm install', trigger=['services/order-service/package.json']),
    ]
)

k8s_yaml('k8s/deployments/order-service.yaml')

k8s_resource(
    'order-service',
    labels=['services'],
    port_forwards=['3001:3001', '3500:3500']
)
```

## Kubernetes Deployment for Tilt

Tilt works with your existing Kubernetes manifests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
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
    spec:
      containers:
      - name: order-service
        image: myorg/order-service
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: development
```

## Multi-Service Tiltfile

For a multi-service setup:

```python
load('ext://restart_process', 'docker_build_with_restart')

# Infrastructure
local_resource('dapr-install', cmd='dapr status -k | grep -q Running || dapr init -k')

k8s_yaml(blob("""
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
"""))

# Services
services = ['order-service', 'inventory-service', 'payment-service']

for svc in services:
    docker_build_with_restart(
        f'myorg/{svc}',
        context=f'services/{svc}',
        entrypoint=['node', 'src/index.js'],
        live_update=[
            sync(f'services/{svc}/src', '/app/src'),
        ]
    )
    k8s_yaml(f'k8s/deployments/{svc}.yaml')
    k8s_resource(svc, labels=['services'])
```

## Running Tilt

```bash
# Start Tilt
tilt up

# Open the Tilt dashboard (auto-opens in browser)
# http://localhost:10350

# View logs for a specific service
tilt logs order-service

# Trigger a manual rebuild
tilt trigger order-service
```

## Live Update Configuration

For faster iteration without rebuilding the container:

```python
docker_build(
    'myorg/order-service',
    context='services/order-service',
    dockerfile='services/order-service/Dockerfile.dev',
    live_update=[
        fall_back_on(['services/order-service/package.json']),
        sync('services/order-service/src', '/app/src'),
        run('npm run build', trigger='services/order-service/src')
    ]
)
```

## Summary

Tilt dramatically improves the Dapr local development experience by automating container builds and Kubernetes deployments on every code change. With live update support and a visual dashboard showing service status, logs, and Dapr sidecar health, developers get rapid iteration cycles with real Kubernetes behavior.
