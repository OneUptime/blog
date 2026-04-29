# How to Migrate from Docker Compose to Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Docker Compose, Kubernetes, Migration, Container Orchestration

Description: Learn how to migrate your Docker Compose application definitions to Rancher-managed Kubernetes, converting compose files to Helm charts or Kubernetes manifests.

## Introduction

Docker Compose is excellent for local development and simple deployments, but as applications grow, Kubernetes-based orchestration becomes necessary for scalability and resilience. Rancher simplifies Kubernetes management and provides tooling to ease the migration from Docker Compose.

## Prerequisites

- A Rancher instance managing a Kubernetes cluster
- kubectl configured for your cluster
- Kompose installed for automated conversion
- Your existing Docker Compose files

## Step 1: Audit Your Compose File

Review your `docker-compose.yml` to identify components that need special handling, especially `depends_on` and internal-only services that still need `expose` or `ports`, because Kompose does not translate every Compose feature 1:1 to Kubernetes:

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app

  app:
    image: myapp:1.2.3
    environment:
      DATABASE_URL: postgres://db:5432/myapp
      SECRET_KEY: mysecret
    ports:
      - "8080:8080"

  db:
    image: postgres:15
    expose:
      - "5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: dbpassword

volumes:
  db_data:
```

## Step 2: Convert with Kompose

Kompose translates Docker Compose files to Kubernetes manifests:

```bash
# Install Kompose

curl -L https://github.com/kubernetes/kompose/releases/latest/download/kompose-linux-amd64 \
  -o kompose && chmod +x kompose

# Convert
./kompose convert -f docker-compose.yml -o k8s-manifests/
```

This typically generates Deployments, Services, PersistentVolumeClaims, and ConfigMaps for supported file mounts.

## Step 3: Review and Adjust Generated Manifests

Kompose output often needs adjustments. Review each manifest:

```yaml
# k8s-manifests/app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
        - name: app
          image: myapp:1.2.3
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              value: "postgres://db:5432/myapp"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
```

## Step 4: Handle Secrets

Move secrets from environment variables to Kubernetes Secrets:

```bash
kubectl create secret generic app-secrets \
  --from-literal=SECRET_KEY=mysecret \
  --from-literal=POSTGRES_PASSWORD=dbpassword \
  -n production
```

Reference in your Deployment:

```yaml
env:
  - name: SECRET_KEY
    valueFrom:
      secretKeyRef:
        name: app-secrets
        key: SECRET_KEY
```

In Rancher, navigate to **Storage** > **Secrets** or **More Resources** > **Core** > **Secrets** to manage these through the UI.

## Step 5: Deploy via Rancher

### Option A: Apply Manifests via Rancher UI

1. In Rancher, select your cluster and click **Explore**.
2. Use **Create** > **Create from YAML**.
3. Paste your manifest files or use **Read from File**.
4. Click **Create**.

### Option B: Deploy via kubectl

```bash
kubectl apply -f k8s-manifests/ -n production
```

### Option C: Use Rancher Fleet for GitOps

Add your manifests or Helm chart to a Git repository and configure Fleet. If you're deploying a Helm chart, a `fleet.yaml` can look like this:

```yaml
# fleet.yaml
defaultNamespace: production
helm:
  chart: ./helm-chart
  values:
    replicaCount: 2
    image:
      tag: "1.2.3"
```

## Step 6: Configure Ingress

Replace Docker Compose port mappings with a Kubernetes Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app
                port:
                  number: 8080
```

## Best Practices

- Add resource requests and limits - absent in Docker Compose, but strongly recommended in Kubernetes and sometimes enforced by namespace policies.
- Replace hardcoded secrets with Kubernetes Secrets or an external vault.
- Add health check probes (`readinessProbe`, `livenessProbe`) to all containers.
- Use namespaces to separate environments.
- Consider converting to Helm charts for parameterized, reusable deployments.

## Conclusion

Migrating from Docker Compose to Rancher-managed Kubernetes opens the door to enterprise-grade orchestration. By converting compose files to Kubernetes manifests and leveraging Rancher's management capabilities, you gain scalability, resilience, and centralized control over your application deployments.
