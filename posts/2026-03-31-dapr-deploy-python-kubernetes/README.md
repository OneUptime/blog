# How to Deploy Dapr Python Applications on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, Kubernetes, Deployment, Container

Description: Learn how to containerize and deploy a Dapr Python application on Kubernetes with proper annotations, component secrets, and health checks.

---

## Introduction

Deploying a Dapr Python application to Kubernetes involves containerizing your app, installing Dapr on the cluster, creating component manifests, and adding Dapr annotations to your Deployment. This guide walks through the complete process.

## Prerequisites

```bash
# Install Dapr on Kubernetes
dapr init --kubernetes --wait

# Verify installation
dapr status -k
```

## Containerizing the Python App

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t my-registry/order-service:latest .
docker push my-registry/order-service:latest
```

## Creating Dapr Components

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master.default.svc.cluster.local:6379
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: redis-password
auth:
  secretStore: kubernetes
```

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master.default.svc.cluster.local:6379
```

## Kubernetes Deployment with Dapr Annotations

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: default
spec:
  replicas: 2
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
        dapr.io/app-port: "8000"
        dapr.io/log-level: "info"
        dapr.io/metrics-port: "9090"
    spec:
      containers:
        - name: order-service
          image: my-registry/order-service:latest
          ports:
            - containerPort: 8000
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8000
            initialDelaySeconds: 10
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8000
            initialDelaySeconds: 5
```

## Adding a Health Check Endpoint

```python
# app.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/healthz")
def health_check():
    return {"status": "ok"}
```

## Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
  ports:
    - port: 80
      targetPort: 8000
```

## Deploying to Kubernetes

```bash
kubectl apply -f components/
kubectl apply -f deployment.yaml

# Check Dapr sidecar injection
kubectl get pods -l app=order-service
kubectl logs <pod-name> -c daprd
```

## Summary

Deploying Dapr Python applications to Kubernetes requires three steps: containerize the app, apply Dapr component manifests, and add Dapr annotations to your Deployment spec. The Dapr operator automatically injects the sidecar based on the annotations. Component secrets integrate natively with Kubernetes Secrets through the `auth.secretStore` field.
