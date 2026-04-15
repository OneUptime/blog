# How to Deploy Dapr Node.js Applications on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Node.js, Deployment, Container

Description: Learn how to containerize and deploy Dapr Node.js microservices on Kubernetes with sidecar injection, component configuration, and health checks.

---

## Introduction

Deploying a Dapr Node.js application on Kubernetes requires containerizing the service, defining Dapr components, and annotating the Deployment so the Dapr control plane injects the sidecar automatically.

## Containerizing the Application

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
EXPOSE 3000
CMD ["node", "src/index.js"]
```

Build and push:

```bash
docker build -t myregistry/order-service:1.0.0 .
docker push myregistry/order-service:1.0.0
```

## Installing Dapr on Kubernetes

```bash
# Install Dapr CLI
curl -fsSL https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | /bin/bash

# Initialize Dapr on your cluster
dapr init -k --wait

# Verify
dapr status -k
```

## Deploying Dapr Components

```yaml
# k8s/statestore.yaml
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
---
# k8s/pubsub.yaml
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

```bash
kubectl apply -f k8s/statestore.yaml
kubectl apply -f k8s/pubsub.yaml
```

## Kubernetes Deployment with Dapr Annotations

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: default
spec:
  replicas: 3
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
        dapr.io/app-port: "3000"
        dapr.io/log-level: "info"
        dapr.io/config: "tracing-config"
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:1.0.0
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "250m"
```

## Kubernetes Service

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
      targetPort: 3000
  type: ClusterIP
```

## Verifying the Deployment

```bash
# Each pod should show 2/2 READY (app + dapr sidecar)
kubectl get pods -l app=order-service

# Check sidecar logs
kubectl logs deployment/order-service -c daprd --tail=50

# Open Dapr dashboard
dapr dashboard -k -p 9999
```

## Summary

Deploying Dapr Node.js applications on Kubernetes is driven by three things: a container image, Dapr component manifests, and sidecar injection annotations on the Deployment. Once the Dapr control plane is installed, your Node.js services get distributed systems capabilities with no changes to application code.
