# How to Use Flux CD with Tilt for Local Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tilt, Local Development, Kubernetes, GitOps, Developer Experience

Description: Learn how to combine Flux CD with Tilt to create a seamless local development workflow that mirrors your production GitOps pipeline.

---

## Introduction

Tilt is a development tool that watches your code, rebuilds containers, and updates your Kubernetes cluster in real time. While Flux CD handles production GitOps deployments, developers need a fast inner loop during development. By combining Tilt for local development with Flux CD for production, you create a consistent workflow where the same Kubernetes manifests work in both contexts.

This guide shows you how to set up Tilt alongside Flux CD so developers can iterate quickly while maintaining compatibility with the production GitOps pipeline.

## Prerequisites

Before getting started, ensure you have:

- A local Kubernetes cluster (kind, minikube, or Docker Desktop)
- Flux CD installed and bootstrapped on your production cluster
- Tilt installed locally
- A Git repository with Flux CD-managed manifests
- Docker installed for building container images
- kubectl configured for your local cluster

## Installing Tilt

```bash
# Install on macOS
brew install tilt-dev/tap/tilt

# Install on Linux
curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash

# Verify installation
tilt version
```

## Project Structure

Structure your repository so Tilt and Flux CD share the same manifests:

```text
repo/
  apps/
    frontend/
      src/                    # Application source code
      Dockerfile              # Container build instructions
      k8s/
        deployment.yaml       # Shared Kubernetes manifests
        service.yaml
        kustomization.yaml
    backend/
      src/
      Dockerfile
      k8s/
        deployment.yaml
        service.yaml
        kustomization.yaml
  clusters/
    production/
      apps/                   # Flux Kustomizations
        frontend.yaml
        backend.yaml
  Tiltfile                    # Tilt configuration
```

## Shared Kubernetes Manifests

Create manifests that work for both Tilt and Flux CD:

```yaml
# apps/frontend/k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  labels:
    app: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          # Tilt will override this image reference during development
          image: myregistry.io/frontend:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "development"
            - name: API_URL
              value: "http://backend:8080"
          resources:
            limits:
              cpu: "500m"
              memory: "256Mi"
            requests:
              cpu: "100m"
              memory: "128Mi"
```

```yaml
# apps/frontend/k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 3000
      protocol: TCP
  type: ClusterIP
```

```yaml
# apps/backend/k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  labels:
    app: backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: myregistry.io/backend:latest
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              value: "postgresql://postgres:password@postgres:5432/myapp"
            - name: REDIS_URL
              value: "redis://redis:6379"
          resources:
            limits:
              cpu: "500m"
              memory: "256Mi"
            requests:
              cpu: "100m"
              memory: "128Mi"
```

## Writing the Tiltfile

The Tiltfile configures Tilt to use the same manifests Flux CD uses in production:

```python
# Tiltfile

# ============================================================
# Configuration
# ============================================================

# Allow deploying to the local kind cluster
allow_k8s_contexts('kind-dev')

# Set default registry for local development images
default_registry('localhost:5000')

# ============================================================
# Frontend Application
# ============================================================

# Build the frontend container image with live reload
docker_build(
    'myregistry.io/frontend',
    context='./apps/frontend',
    dockerfile='./apps/frontend/Dockerfile',
    # Live update rules for fast iteration without full rebuilds
    live_update=[
        # Sync source files into the running container
        sync('./apps/frontend/src', '/app/src'),
        # Restart the process when package.json changes
        run('npm install', trigger=['./apps/frontend/package.json']),
    ],
)

# Apply the same Kubernetes manifests that Flux CD uses
k8s_yaml(kustomize('./apps/frontend/k8s'))

# Configure the frontend resource in the Tilt UI
k8s_resource(
    'frontend',
    port_forwards=[
        # Forward local port 3000 to the container
        port_forward(3000, 3000, name='Frontend UI'),
    ],
    labels=['apps'],
)

# ============================================================
# Backend Application
# ============================================================

# Build the backend container image
docker_build(
    'myregistry.io/backend',
    context='./apps/backend',
    dockerfile='./apps/backend/Dockerfile',
    live_update=[
        # Sync Go source files
        sync('./apps/backend/src', '/app/src'),
        # Rebuild the binary when Go files change
        run('go build -o /app/server ./src/...', trigger=['./apps/backend/src']),
        # Restart the server process
        run('kill -HUP 1'),
    ],
)

# Apply backend Kubernetes manifests
k8s_yaml(kustomize('./apps/backend/k8s'))

# Configure backend resource
k8s_resource(
    'backend',
    port_forwards=[
        port_forward(8080, 8080, name='Backend API'),
    ],
    labels=['apps'],
)

# ============================================================
# Local Development Dependencies
# ============================================================

# Deploy PostgreSQL for local development
k8s_yaml('./dev/postgres.yaml')
k8s_resource(
    'postgres',
    port_forwards=[port_forward(5432, 5432, name='PostgreSQL')],
    labels=['deps'],
)

# Deploy Redis for local development
k8s_yaml('./dev/redis.yaml')
k8s_resource(
    'redis',
    port_forwards=[port_forward(6379, 6379, name='Redis')],
    labels=['deps'],
)
```

## Local Development Dependencies

Create local development-only manifests for dependencies:

```yaml
# dev/postgres.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          env:
            # Local development credentials
            - name: POSTGRES_USER
              value: "postgres"
            - name: POSTGRES_PASSWORD
              value: "password"
            - name: POSTGRES_DB
              value: "myapp"
          volumeMounts:
            - name: pgdata
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: pgdata
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
```

```yaml
# dev/redis.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
```

## Flux CD Configuration for Production

Set up Flux CD to use the same manifests in production:

```yaml
# clusters/production/apps/frontend.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: frontend
  namespace: flux-system
spec:
  interval: 5m
  # Same path that Tilt uses locally
  path: ./apps/frontend/k8s
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: production
  # Production-specific patches
  patches:
    # Override replicas for production
    - target:
        kind: Deployment
        name: frontend
      patch: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: frontend
        spec:
          replicas: 3
    # Override environment for production
    - target:
        kind: Deployment
        name: frontend
      patch: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: frontend
        spec:
          template:
            spec:
              containers:
                - name: frontend
                  env:
                    - name: NODE_ENV
                      value: "production"
                    - name: API_URL
                      value: "http://backend.production.svc:8080"
```

```yaml
# clusters/production/apps/backend.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backend
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/backend/k8s
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: production
  patches:
    - target:
        kind: Deployment
        name: backend
      patch: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: backend
        spec:
          replicas: 5
          template:
            spec:
              containers:
                - name: backend
                  env:
                    - name: DATABASE_URL
                      valueFrom:
                        secretKeyRef:
                          name: db-credentials
                          key: url
                    - name: REDIS_URL
                      valueFrom:
                        secretKeyRef:
                          name: redis-credentials
                          key: url
```

## Running the Development Workflow

### Starting Tilt

```bash
# Create a local kind cluster with a registry
kind create cluster --name dev

# Start Tilt - it watches files and auto-updates
tilt up

# Open the Tilt UI in the browser
# Tilt UI is available at http://localhost:10350
```

### Development Iteration Cycle

```mermaid
graph LR
    A[Edit Code] --> B[Tilt Detects Change]
    B --> C[Live Update or Rebuild]
    C --> D[Deploy to Local Cluster]
    D --> E[Verify in Browser]
    E --> A
```

### Tilt Commands During Development

```bash
# View resource status
tilt get

# Trigger a manual rebuild of a resource
tilt trigger frontend

# View logs for a specific resource
tilt logs frontend

# Tear down the development environment
tilt down
```

## Advanced Tiltfile with Environment Detection

Enhance your Tiltfile to detect whether Flux CD manifests need production overrides:

```python
# Tiltfile - Advanced configuration

# Load Tilt extensions
load('ext://namespace', 'namespace_create')
load('ext://helm_remote', 'helm_remote')

# ============================================================
# Environment Configuration
# ============================================================

# Configuration settings that can be overridden
config.define_string('env', args=True)
cfg = config.parse()
environment = cfg.get('env', 'development')

# Create the development namespace
namespace_create('development')

# ============================================================
# Feature Flags
# ============================================================

config.define_bool('enable-monitoring')
config.define_bool('enable-tracing')
cfg = config.parse()

enable_monitoring = cfg.get('enable-monitoring', False)
enable_tracing = cfg.get('enable-tracing', False)

# ============================================================
# Application Resources
# ============================================================

# Build and deploy frontend
docker_build(
    'myregistry.io/frontend',
    context='./apps/frontend',
    dockerfile='./apps/frontend/Dockerfile',
    live_update=[
        sync('./apps/frontend/src', '/app/src'),
    ],
)

k8s_yaml(kustomize('./apps/frontend/k8s'))
k8s_resource('frontend',
    port_forwards=[port_forward(3000, 3000)],
    labels=['apps'],
    resource_deps=['postgres', 'redis'],  # Wait for deps
)

# ============================================================
# Optional: Local Monitoring Stack
# ============================================================

if enable_monitoring:
    helm_remote(
        'prometheus',
        repo_name='prometheus-community',
        repo_url='https://prometheus-community.github.io/helm-charts',
        namespace='monitoring',
    )
    k8s_resource(
        workload='prometheus-server',
        port_forwards=[port_forward(9090, 9090, name='Prometheus')],
        labels=['monitoring'],
    )
```

## Troubleshooting

### Tilt Cannot Connect to Cluster

```bash
# Verify your kubeconfig is pointing to the local cluster
kubectl config current-context

# Ensure the cluster is running
kind get clusters

# Restart the cluster if needed
kind delete cluster --name dev && kind create cluster --name dev
```

### Image Build Failures

```bash
# Check Tilt logs for build errors
tilt logs --level=debug

# Manually build the image to diagnose
docker build -t myregistry.io/frontend ./apps/frontend/
```

### Live Update Not Working

```bash
# Verify sync paths match your container paths
# Check the Tiltfile sync() paths against the Dockerfile WORKDIR

# Force a full rebuild if live update is stuck
tilt trigger --build frontend
```

## Best Practices

1. **Share manifests** - Use the same Kubernetes manifests for both Tilt and Flux CD. Use Kustomize overlays or Flux patches for production differences.
2. **Use live update** - Configure live update in Tilt to avoid full container rebuilds and keep the iteration loop under 2 seconds.
3. **Keep dev dependencies separate** - Store local development dependencies (databases, caches) in a `dev/` directory that Flux CD does not deploy.
4. **Match production closely** - Keep the local development environment as close to production as possible to catch issues early.
5. **Use resource dependencies** - Configure `resource_deps` in Tilt to ensure databases start before applications that depend on them.

## Conclusion

By using Tilt for local development and Flux CD for production GitOps, you create a workflow where developers iterate quickly with live reload and automatic rebuilds, while the same Kubernetes manifests are deployed to production through a robust GitOps pipeline. The key is sharing manifests between both tools and using environment-specific overrides only where necessary. This approach reduces drift between development and production while keeping the developer experience fast and responsive.
