# How to Deploy Dapr Java Applications on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Java, Deployment, Container

Description: Learn how to containerize and deploy a Dapr Java Spring Boot application on Kubernetes with sidecar injection and component configuration.

---

## Introduction

Deploying a Dapr Java application on Kubernetes involves containerizing your service, creating Dapr component manifests, and annotating your Kubernetes Deployment so the Dapr control plane injects a sidecar automatically.

## Containerizing the Application

Create a `Dockerfile`:

```dockerfile
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/order-service-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Build and push the image:

```bash
docker build -t myregistry/order-service:1.0.0 .
docker push myregistry/order-service:1.0.0
```

## Installing Dapr on Kubernetes

```bash
# Install Dapr CLI
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# Initialize Dapr on your cluster
dapr init -k

# Verify installation
dapr status -k
```

## Deploying Dapr Components

Apply state store and pub/sub components:

```yaml
# statestore.yaml
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
        key: password
```

```bash
kubectl apply -f statestore.yaml
```

## Kubernetes Deployment with Dapr Annotations

Annotate the Deployment to enable Dapr sidecar injection:

```yaml
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
        dapr.io/log-level: "info"
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: kubernetes
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

## Exposing the Service

Create a Kubernetes Service:

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
  type: ClusterIP
```

## Verifying the Deployment

```bash
# Check pods - each should have 2 containers (app + dapr sidecar)
kubectl get pods

# Check Dapr sidecar logs
kubectl logs deployment/order-service -c daprd

# View Dapr dashboard
dapr dashboard -k
```

## Summary

Deploying a Dapr Java application on Kubernetes requires containerizing your Spring Boot app, applying Dapr component manifests, and adding Dapr annotations to your Deployment. The Dapr control plane handles sidecar injection automatically, so your application code requires no Kubernetes-specific changes.
