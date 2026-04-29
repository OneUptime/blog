# How to Migrate from Docker Swarm to Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Docker Swarm, Kubernetes, Migration, Container Orchestration

Description: Learn how to migrate Docker Swarm services and stacks to Rancher-managed Kubernetes clusters, translating Swarm concepts to their Kubernetes equivalents.

## Introduction

Docker Swarm provides basic container orchestration, but Rancher with Kubernetes offers significantly more capabilities: advanced scheduling, richer networking, and a thriving ecosystem of tools. This guide walks you through migrating Swarm services to Kubernetes deployments managed by Rancher.

## Swarm vs. Kubernetes Concept Mapping

| Docker Swarm | Kubernetes (Rancher) |
|---|---|
| Stack | Namespace + related resources |
| Service | Deployment/StatefulSet/DaemonSet + Service |
| Task | Pod |
| Secret | Secret |
| Config | ConfigMap |
| Overlay network | Pod network (CNI) + optional NetworkPolicy |
| Ingress routing mesh | Service (`LoadBalancer` or `NodePort`) + optional Ingress |

## Step 1: Inspect Swarm Stack Configuration

```bash
docker stack ls
docker stack services myapp
docker service inspect myapp_web
```

Inspect the service output to capture the image, replica counts, environment variables, volume mounts, secrets, and published ports.

## Step 2: Convert Swarm Compose to Kubernetes Manifests

Given a Swarm stack:

```yaml
version: "3.8"

services:
  api:
    image: myapi:2.0.0
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    secrets:
      - db_password
    ports:
      - "8080:8080"
    networks:
      - backend

secrets:
  db_password:
    external: true

networks:
  backend:
    driver: overlay
```

A Kubernetes Deployment for the same workload might look like:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: myapi:2.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              memory: "256Mi"
            limits:
              memory: "512Mi"
          volumeMounts:
            - name: app-secrets
              mountPath: /run/secrets
              readOnly: true
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
      volumes:
        - name: app-secrets
          secret:
            secretName: app-secrets
```

## Step 3: Migrate Secrets

In Swarm, secrets are mounted as files. In Kubernetes, use Secrets. Docker Swarm does not let you read an existing secret's value back through the CLI, so recreate it from the original source of truth:

```bash
# Verify the secret exists in Swarm
docker secret ls

# Create the Kubernetes Secret from the original secret file or value source
kubectl create secret generic app-secrets \
  --from-file=db_password=./secrets/db_password.txt \
  -n myapp
```

In Rancher, navigate to **Secrets** > **Add Secret** to create it through the UI.

## Step 4: Migrate Configs to ConfigMaps

Swarm configs become Kubernetes ConfigMaps:

```bash
kubectl create configmap nginx-config \
  --from-file=nginx.conf=./swarm-config/nginx.conf \
  -n myapp
```

```yaml
volumes:
  - name: nginx-config
    configMap:
      name: nginx-config
volumeMounts:
  - name: nginx-config
    mountPath: /etc/nginx/nginx.conf
    subPath: nginx.conf
```

## Step 5: Create Services and Ingress

Replace Swarm's published ports and routing mesh with a Kubernetes Service and, for HTTP routing, an Ingress:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: myapp
spec:
  selector:
    app: api
  ports:
    - port: 8080
      targetPort: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: myapp
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 8080
```

## Step 6: Deploy via Rancher

1. In Rancher, open your cluster and use the YAML import editor.
2. Apply the namespace first, then secrets, then deployments and services.
3. Monitor the rollout in the cluster's **Workloads** or **Deployments** view.

## Step 7: Decommission Swarm

After verifying the Kubernetes deployment:

```bash
# Optionally drain Swarm nodes
docker node update --availability drain <node-id>

# Remove the Swarm stack
docker stack rm myapp
```

## Best Practices

- Migrate one service at a time, validating each before moving to the next.
- Use Rancher monitoring or your existing observability stack to compare performance metrics during cutover.
- Keep DNS TTLs low during migration to enable quick rollback.
- Use Rancher namespaces to mirror Swarm stack separation.
- Test in a non-production Kubernetes cluster before the production migration.

## Conclusion

Migrating from Docker Swarm to Rancher-managed Kubernetes brings your workloads to a production-grade orchestration platform. While the concepts map closely, take time to add proper health probes, resource limits, and Kubernetes-native ingress configuration for a robust, long-term deployment.
