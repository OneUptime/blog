# How to Deploy a FastAPI Application with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, FastAPI, Python, Uvicorn, API

Description: Deploy a FastAPI Python application to Kubernetes using Flux CD GitOps, with Uvicorn workers, OpenAPI documentation, and automated image updates.

---

## Introduction

FastAPI is a modern, high-performance Python web framework built on top of Starlette and Pydantic. It supports async request handling, automatic OpenAPI documentation generation, and type-safe request validation. These properties make it ideal for data-intensive APIs, ML inference endpoints, and microservices that need to handle significant concurrent load.

Deploying FastAPI to Kubernetes with Flux CD gives you the best of both worlds: the framework's native async performance combined with Kubernetes's horizontal scaling and self-healing. Flux ensures your cluster always matches the desired state in Git, so configuration changes are tracked, reviewable, and reversible.

This guide walks through containerizing a FastAPI application with Uvicorn, writing production Kubernetes manifests, and setting up the Flux pipeline for automated deployments.

## Prerequisites

- A FastAPI application (`main.py` with an `app` or `create_app` function)
- A Kubernetes cluster with Flux CD bootstrapped
- A container registry
- `kubectl` and `flux` CLIs installed

## Step 1: Containerize FastAPI with Uvicorn

FastAPI is served by Uvicorn, an ASGI server. For production, run multiple Uvicorn workers under Gunicorn using the `uvicorn.workers.UvicornWorker` worker class.

```dockerfile
# Dockerfile
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends gcc
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM base AS runner
COPY --from=builder /install /usr/local
COPY . .
RUN adduser --disabled-password --gecos '' apiuser && chown -R apiuser /app
USER apiuser
EXPOSE 8000
# Use Gunicorn with Uvicorn workers for production multi-process setup
CMD ["gunicorn", "main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "4", \
     "--bind", "0.0.0.0:8000", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
```

A minimal `requirements.txt`:

```plaintext
fastapi==0.111.0
uvicorn[standard]==0.30.0
gunicorn==22.0.0
pydantic==2.7.0
```

```bash
docker build -t ghcr.io/your-org/my-fastapi-app:1.0.0 .
docker push ghcr.io/your-org/my-fastapi-app:1.0.0
```

## Step 2: Add Health and Readiness Endpoints to the FastAPI App

```python
# main.py
from fastapi import FastAPI

app = FastAPI(
    title="My FastAPI Service",
    version="1.0.0",
    # Disable docs in production if not needed (security hardening)
    docs_url="/docs" if not False else None,
)

@app.get("/health", tags=["Monitoring"])
async def health_check():
    """Liveness probe endpoint."""
    return {"status": "ok"}

@app.get("/ready", tags=["Monitoring"])
async def readiness_check():
    """Readiness probe - check DB connectivity here."""
    return {"status": "ready"}

@app.get("/api/v1/items")
async def list_items():
    return [{"id": 1, "name": "example"}]
```

## Step 3: Write Kubernetes Manifests

```yaml
# deploy/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-fastapi-app
---
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-fastapi-app
  namespace: my-fastapi-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-fastapi-app
  template:
    metadata:
      labels:
        app: my-fastapi-app
      annotations:
        # Prometheus scraping annotations
        prometheus.io/scrape: "true"
        prometheus.io/path: "/metrics"
        prometheus.io/port: "8000"
    spec:
      containers:
        - name: my-fastapi-app
          image: ghcr.io/your-org/my-fastapi-app:1.0.0  # {"$imagepolicy": "flux-system:my-fastapi-app"}
          ports:
            - containerPort: 8000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: fastapi-secrets
                  key: DATABASE_URL
          envFrom:
            - configMapRef:
                name: fastapi-config
          resources:
            requests:
              cpu: "200m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]
      terminationGracePeriodSeconds: 30
---
# deploy/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fastapi-config
  namespace: my-fastapi-app
data:
  LOG_LEVEL: "info"
  CORS_ORIGINS: "https://app.example.com"
  ENVIRONMENT: "production"
---
# deploy/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-fastapi-app
  namespace: my-fastapi-app
spec:
  selector:
    app: my-fastapi-app
  ports:
    - name: http
      port: 80
      targetPort: 8000
---
# deploy/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-fastapi-app
  namespace: my-fastapi-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-fastapi-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Step 4: Configure Flux GitRepository and Kustomization

```yaml
# clusters/my-cluster/apps/my-fastapi-app/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-fastapi-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/my-fastapi-app
  ref:
    branch: main
---
# clusters/my-cluster/apps/my-fastapi-app/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-fastapi-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-fastapi-app
  path: ./deploy
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-fastapi-app
      namespace: my-fastapi-app
```

## Step 5: Configure Image Automation

```yaml
# clusters/my-cluster/apps/my-fastapi-app/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-fastapi-app
  namespace: flux-system
spec:
  image: ghcr.io/your-org/my-fastapi-app
  interval: 5m
  secretRef:
    name: ghcr-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-fastapi-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-fastapi-app
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: my-fastapi-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-fastapi-app
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxbot@your-org.com
        name: Flux Bot
      messageTemplate: "chore: update fastapi app to {{range .Updated.Images}}{{.}}{{end}}"
    push:
      branch: main
  update:
    path: ./deploy
    strategy: Setters
```

## Step 6: Verify the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations my-fastapi-app

# Verify pods
kubectl get pods -n my-fastapi-app

# Access the OpenAPI docs
kubectl port-forward -n my-fastapi-app svc/my-fastapi-app 8000:80
# Visit http://localhost:8000/docs
```

## Best Practices

- Disable the interactive `/docs` and `/redoc` endpoints in production if the API is internal, or protect them with authentication middleware.
- Use Pydantic `BaseSettings` to load configuration from environment variables with type validation and default values.
- For CPU-bound workloads (e.g., ML inference), prefer multiple single-worker Uvicorn pods over multi-worker Gunicorn, so Kubernetes can scale and schedule them independently.
- Add `prometheus-fastapi-instrumentator` for out-of-the-box Prometheus metrics on all routes.
- Use `asyncpg` or `databases` for async database access to take full advantage of FastAPI's async request handling.

## Conclusion

FastAPI's performance and developer experience pair well with Kubernetes and Flux CD's GitOps model. Async workers handle high-concurrency workloads efficiently, Horizontal Pod Autoscaler scales the API under load, and Flux ensures every deployment is traceable and reversible through Git history.
