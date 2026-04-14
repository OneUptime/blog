# How to Deploy Dapr Go Applications on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, Kubernetes, Deployment, Container, Microservice

Description: Deploy production-ready Dapr Go microservices on Kubernetes with sidecar injection, component configuration, RBAC, and health checks.

---

## Overview

Deploying Dapr Go applications to Kubernetes involves three steps: containerizing your Go service, applying Dapr component manifests, and adding Dapr annotations to your Deployment. The Dapr control plane automatically injects the sidecar when it sees the correct annotations.

## Step 1: Containerize the Go Service

```dockerfile
# Dockerfile
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app ./cmd/order-service

FROM gcr.io/distroless/static:nonroot
COPY --from=build /app /app
ENTRYPOINT ["/app"]
```

```bash
docker build -t myregistry/order-service:1.0.0 .
docker push myregistry/order-service:1.0.0
```

## Step 2: Install Dapr on Kubernetes

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm install dapr dapr/dapr --namespace dapr-system --create-namespace
```

## Step 3: Apply Dapr Components

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
      value: "redis-master.default.svc.cluster.local:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: redis-password
```

```bash
kubectl apply -f components/
```

## Step 4: Deploy the Go Service

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
        dapr.io/app-port: "8080"
        dapr.io/app-protocol: "http"
        dapr.io/log-level: "info"
        dapr.io/enable-metrics: "true"
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:1.0.0
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 5
          resources:
            requests:
              cpu: "100m"
              memory: "64Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
```

```bash
kubectl apply -f deployment.yaml
```

## Step 5: Verify Sidecar Injection

```bash
kubectl get pods -l app=order-service
# Should show 2/2 containers ready (app + dapr sidecar)

kubectl describe pod <pod-name> | grep dapr
```

## Exposing the Service

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
      targetPort: 8080
```

## Summary

Deploying a Dapr Go service to Kubernetes requires a minimal Dockerfile, Dapr component YAML files applied to the cluster, and Dapr-specific annotations on the Deployment pod template. The Dapr operator injects the sidecar automatically, and your Go service connects to it via `dapr.NewClient()` which reads the injected `DAPR_GRPC_PORT` environment variable.
