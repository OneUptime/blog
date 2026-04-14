# How to Use Dapr with Kubernetes Init Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Init Container, Microservice, Deployment

Description: Use Kubernetes init containers with Dapr-enabled pods to perform pre-startup tasks like database migrations, secret fetching, and dependency checks before the Dapr sidecar starts.

---

## Overview

Init containers run to completion before the main application container and the Dapr sidecar start. They are ideal for tasks like database schema migrations, configuration validation, or waiting for dependent services to become available.

## Basic Init Container with Dapr

Add an init container to a Dapr-enabled deployment:

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
        dapr.io/app-port: "3000"
    spec:
      initContainers:
      - name: db-migrate
        image: myregistry/db-migrator:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        command: ["./migrate", "--direction", "up"]
      containers:
      - name: order-service
        image: myregistry/order-service:latest
        ports:
        - containerPort: 3000
```

## Waiting for Dependencies with Init Containers

Use an init container to wait for a Dapr component's backing service before starting:

```yaml
initContainers:
- name: wait-for-redis
  image: busybox:1.36
  command:
  - sh
  - -c
  - |
    until nc -z redis-master.default.svc.cluster.local 6379; do
      echo "Waiting for Redis..."
      sleep 2
    done
    echo "Redis is ready"
```

## Fetching Secrets with Init Containers

Use an init container to pull secrets from Vault and write them to a shared volume:

```yaml
spec:
  volumes:
  - name: secrets-volume
    emptyDir: {}
  initContainers:
  - name: fetch-secrets
    image: hashicorp/vault:latest
    command:
    - sh
    - -c
    - |
      vault login -method=kubernetes role=order-service
      vault kv get -field=api_key secret/order-service > /secrets/api_key
    volumeMounts:
    - name: secrets-volume
      mountPath: /secrets
  containers:
  - name: order-service
    image: myregistry/order-service:latest
    volumeMounts:
    - name: secrets-volume
      mountPath: /app/secrets
      readOnly: true
```

## Init Container Ordering and Dapr

Dapr's sidecar injector injects the `daprd` container as the last container. Init containers always run before all containers including the Dapr sidecar. Verify the order:

```bash
kubectl describe pod order-service-xyz | grep -A5 "Init Containers:"
```

## Resource Limits for Init Containers

Set resource limits to prevent init containers from consuming excess resources:

```yaml
initContainers:
- name: db-migrate
  image: myregistry/db-migrator:latest
  resources:
    requests:
      cpu: "100m"
      memory: "64Mi"
    limits:
      cpu: "500m"
      memory: "256Mi"
```

## Debugging Failed Init Containers

If an init container fails, inspect its logs:

```bash
kubectl logs pod/order-service-xyz -c db-migrate
kubectl describe pod order-service-xyz
# Look for: "Init containers: db-migrate: Exit Code: 1"
```

## Summary

Init containers in Dapr-enabled pods run before both the application container and the Dapr sidecar, making them ideal for pre-startup tasks like migrations, secret fetching, and dependency readiness checks. Since init containers complete before Dapr starts, you cannot use Dapr APIs within them - use native HTTP or SDK calls to any dependencies instead.
