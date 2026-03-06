# How to Use Flux CD with Skaffold for Development Workflow

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, skaffold, kubernetes, gitops, development workflow, ci cd

Description: Learn how to combine Skaffold for local development with Flux CD for production GitOps to create a seamless development-to-production workflow.

---

## Introduction

Skaffold is a command-line tool from Google that facilitates continuous development for Kubernetes-native applications. It handles the build, push, and deploy workflow during development and can also be used in CI/CD pipelines. When paired with Flux CD, Skaffold manages the fast inner development loop while Flux CD handles the production GitOps outer loop.

This guide walks through setting up Skaffold alongside Flux CD so your development and production workflows share the same Kubernetes manifests.

## Prerequisites

Before starting, ensure you have:

- A local Kubernetes cluster (minikube, kind, or Docker Desktop)
- Flux CD installed and bootstrapped on your production cluster
- Skaffold CLI installed
- Docker installed for building container images
- A Git repository connected to Flux CD
- kubectl configured for your cluster

## Installing Skaffold

```bash
# Install on macOS
brew install skaffold

# Install on Linux
curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64
chmod +x skaffold
sudo mv skaffold /usr/local/bin/

# Verify installation
skaffold version
```

## Project Structure

Organize your project so Skaffold and Flux CD share Kubernetes manifests:

```
repo/
  apps/
    web-api/
      src/                    # Application source code
      Dockerfile
      k8s/
        base/
          deployment.yaml     # Base deployment manifest
          service.yaml
          kustomization.yaml
        overlays/
          dev/
            kustomization.yaml  # Dev-specific overrides
          production/
            kustomization.yaml  # Production overrides
  clusters/
    production/
      apps/
        web-api.yaml          # Flux Kustomization
  skaffold.yaml               # Skaffold configuration
```

## Base Kubernetes Manifests

Create base manifests shared between Skaffold and Flux CD:

```yaml
# apps/web-api/k8s/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
  labels:
    app: web-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
    spec:
      containers:
        - name: web-api
          # Image tag managed by Skaffold during dev, by Flux in production
          image: myregistry.io/web-api
          ports:
            - containerPort: 8080
              name: http
          env:
            - name: LOG_LEVEL
              value: "info"
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          livenessProbe:
            httpGet:
              path: /healthz
              port: http
            initialDelaySeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 5
```

```yaml
# apps/web-api/k8s/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-api
spec:
  selector:
    app: web-api
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
      name: http
  type: ClusterIP
```

```yaml
# apps/web-api/k8s/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

## Environment-Specific Overlays

### Development Overlay

```yaml
# apps/web-api/k8s/overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: development
resources:
  - ../../base
patches:
  # Enable debug logging in development
  - target:
      kind: Deployment
      name: web-api
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: web-api
      spec:
        replicas: 1
        template:
          spec:
            containers:
              - name: web-api
                env:
                  - name: LOG_LEVEL
                    value: "debug"
                  - name: DATABASE_URL
                    value: "postgresql://postgres:devpass@postgres:5432/myapp"
```

### Production Overlay

```yaml
# apps/web-api/k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
  - ../../base
patches:
  # Production configuration with higher replicas and secrets
  - target:
      kind: Deployment
      name: web-api
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: web-api
      spec:
        replicas: 5
        template:
          spec:
            containers:
              - name: web-api
                env:
                  - name: LOG_LEVEL
                    value: "warn"
                  - name: DATABASE_URL
                    valueFrom:
                      secretKeyRef:
                        name: db-credentials
                        key: url
                resources:
                  requests:
                    cpu: "500m"
                    memory: "512Mi"
                  limits:
                    cpu: "2000m"
                    memory: "1Gi"
```

## Skaffold Configuration

Create the Skaffold configuration file:

```yaml
# skaffold.yaml
apiVersion: skaffold/v4beta11
kind: Config
metadata:
  name: my-application

# ============================================================
# Build configuration
# ============================================================
build:
  artifacts:
    # Web API application
    - image: myregistry.io/web-api
      context: apps/web-api
      docker:
        dockerfile: Dockerfile
      # Sync files for hot reload without full rebuild
      sync:
        manual:
          - src: "src/**/*.go"
            dest: /app/src
            strip: ""

  # Use local Docker daemon for builds
  local:
    push: false
    useBuildkit: true
    concurrency: 2

# ============================================================
# Deploy configuration
# ============================================================
deploy:
  kustomize:
    # Use the dev overlay for local development
    paths:
      - apps/web-api/k8s/overlays/dev

# ============================================================
# Port forwarding for local access
# ============================================================
portForward:
  - resourceType: service
    resourceName: web-api
    port: 80
    localPort: 8080

# ============================================================
# Profiles for different environments
# ============================================================
profiles:
  # CI profile for testing in CI pipelines
  - name: ci
    build:
      artifacts:
        - image: myregistry.io/web-api
          context: apps/web-api
          docker:
            dockerfile: Dockerfile
      local:
        push: true
    deploy:
      kustomize:
        paths:
          - apps/web-api/k8s/overlays/dev

  # Render-only profile for generating manifests
  - name: render
    deploy:
      kustomize:
        paths:
          - apps/web-api/k8s/overlays/production
```

## Running Skaffold for Development

### Continuous Development Mode

```bash
# Start Skaffold in development mode with hot reload
skaffold dev --port-forward

# This will:
# 1. Build container images
# 2. Deploy to the local cluster
# 3. Watch for file changes
# 4. Automatically rebuild and redeploy on changes
# 5. Forward ports for local access
```

### One-Time Build and Deploy

```bash
# Build and deploy once without watching for changes
skaffold run --port-forward

# Clean up deployed resources
skaffold delete
```

### Debug Mode

```bash
# Start in debug mode with debugger attached
skaffold debug --port-forward

# This configures containers for remote debugging:
# - Go: Delve debugger on port 56268
# - Java: JDWP on port 5005
# - Node.js: Inspector on port 9229
# - Python: debugpy on port 5678
```

## Flux CD Configuration for Production

Configure Flux CD to deploy the same manifests using the production overlay:

```yaml
# clusters/production/apps/web-api.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: web-api
  namespace: flux-system
spec:
  interval: 5m
  # Use the production overlay
  path: ./apps/web-api/k8s/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Wait for resources to be ready
  wait: true
  timeout: 3m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: web-api
      namespace: production
```

## CI Pipeline Integration

Use Skaffold in CI to build, test, and push images, then let Flux CD handle deployment:

```yaml
# .github/workflows/ci.yaml
name: CI Pipeline

on:
  push:
    branches: [main]
    paths:
      - 'apps/**'

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Skaffold
        run: |
          curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64
          chmod +x skaffold
          sudo mv skaffold /usr/local/bin/

      - name: Login to registry
        run: |
          echo "${{ secrets.REGISTRY_PASSWORD }}" | \
            docker login myregistry.io -u ${{ secrets.REGISTRY_USER }} --password-stdin

      - name: Build and push images with Skaffold
        run: |
          # Build images and push to registry
          skaffold build \
            --profile ci \
            --file-output=build-artifacts.json \
            --default-repo=myregistry.io

      - name: Render production manifests
        run: |
          # Render manifests with the built image tags
          skaffold render \
            --profile render \
            --build-artifacts=build-artifacts.json \
            --output=rendered-manifests.yaml

      - name: Update image tags in Git
        run: |
          # Extract the image tag from build artifacts
          IMAGE_TAG=$(jq -r '.builds[0].tag' build-artifacts.json)

          # Update the kustomization with the new image
          cd apps/web-api/k8s/overlays/production
          kustomize edit set image "myregistry.io/web-api=$IMAGE_TAG"

          # Commit and push for Flux CD to pick up
          git config user.name "ci-bot"
          git config user.email "ci@example.com"
          git add .
          git commit -m "chore: update web-api image to $IMAGE_TAG"
          git push
```

## Skaffold with Multiple Microservices

Extend the Skaffold configuration for a multi-service application:

```yaml
# skaffold.yaml - Multi-service configuration
apiVersion: skaffold/v4beta11
kind: Config
metadata:
  name: microservices

build:
  artifacts:
    # Frontend service
    - image: myregistry.io/frontend
      context: apps/frontend
      docker:
        dockerfile: Dockerfile
      sync:
        manual:
          - src: "src/**/*.{js,jsx,ts,tsx}"
            dest: /app/src

    # Backend API service
    - image: myregistry.io/backend
      context: apps/backend
      docker:
        dockerfile: Dockerfile

    # Worker service
    - image: myregistry.io/worker
      context: apps/worker
      docker:
        dockerfile: Dockerfile

  local:
    push: false
    useBuildkit: true
    # Build up to 3 images in parallel
    concurrency: 3

deploy:
  kustomize:
    paths:
      - apps/frontend/k8s/overlays/dev
      - apps/backend/k8s/overlays/dev
      - apps/worker/k8s/overlays/dev

portForward:
  - resourceType: service
    resourceName: frontend
    port: 80
    localPort: 3000
  - resourceType: service
    resourceName: backend
    port: 80
    localPort: 8080
```

## Using Skaffold Render for Flux CD

Generate static manifests with Skaffold that Flux CD can deploy:

```bash
# Render manifests with resolved image tags
skaffold render \
  --profile render \
  --output=generated/production/manifests.yaml

# The rendered output contains fully resolved image references
# that Flux CD can deploy directly
```

```yaml
# clusters/production/apps/rendered-manifests.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: rendered-web-api
  namespace: flux-system
spec:
  interval: 5m
  # Path to Skaffold-rendered manifests
  path: ./generated/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Troubleshooting

### Skaffold Build Failures

```bash
# Run build with verbose logging
skaffold build -v debug

# Check Docker daemon status
docker info

# Verify Dockerfile exists and is valid
docker build -t test ./apps/web-api/
```

### Sync Not Working

```bash
# Verify sync configuration matches file paths
skaffold dev -v debug

# Check that the container has the expected file structure
kubectl exec -it deployment/web-api -- ls /app/src/
```

### Manifest Conflicts Between Skaffold and Flux

```bash
# Ensure Skaffold and Flux use different overlays
# Skaffold: apps/web-api/k8s/overlays/dev
# Flux CD: apps/web-api/k8s/overlays/production

# Verify no namespace conflicts
kubectl get deployments --all-namespaces | grep web-api
```

## Best Practices

1. **Use Kustomize overlays** - Share base manifests between Skaffold and Flux CD, using overlays for environment-specific configuration.
2. **Keep dev dependencies local** - Use Skaffold profiles to add development dependencies (databases, message queues) that production gets from managed services.
3. **Leverage file sync** - Use Skaffold's sync feature to avoid full container rebuilds for interpreted languages like Python, JavaScript, and Ruby.
4. **Use render for CI** - Use `skaffold render` in CI pipelines to generate manifests with resolved image tags that Flux CD can deploy.
5. **Match image references** - Use the same image references in base manifests so both Skaffold and Flux CD can override them consistently.

## Conclusion

Skaffold and Flux CD complement each other perfectly. Skaffold provides a fast, iterative development experience with automatic builds, hot reload, and debugging support, while Flux CD ensures production deployments are consistent, auditable, and reconciled through GitOps. By structuring your project with shared base manifests and environment-specific overlays, both tools work from the same source of truth, minimizing drift between development and production.
