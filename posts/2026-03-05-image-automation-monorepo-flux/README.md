# How to Set Up Image Automation for Monorepo with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, Monorepo, Multi-app

Description: Learn how to configure Flux image automation for a monorepo containing multiple applications with separate image update paths.

---

## Introduction

Monorepos host multiple applications in a single Git repository. When using Flux image automation with a monorepo, you need to carefully scope each ImageUpdateAutomation to the correct directory path so that image tag updates for one application do not interfere with another. This guide shows how to set up a clean image automation workflow for a monorepo.

## Prerequisites

- A Kubernetes cluster with Flux installed
- The image-reflector-controller and image-automation-controller deployed
- A monorepo containing multiple application manifests

## Monorepo Structure

Consider a repository with the following layout.

```bash
# Typical monorepo directory structure
my-monorepo/
  apps/
    frontend/
      deployment.yaml
      kustomization.yaml
    backend/
      deployment.yaml
      kustomization.yaml
    worker/
      deployment.yaml
      kustomization.yaml
  clusters/
    production/
      apps.yaml
      flux-system/
```

Each application under `apps/` has its own container image, and each should be updated independently.

## Step 1: Create ImageRepository Resources

Create one ImageRepository per container image.

```yaml
# image-repositories.yaml
# Scan each application's container registry independently
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: frontend
  namespace: flux-system
spec:
  image: ghcr.io/my-org/frontend
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: backend
  namespace: flux-system
spec:
  image: ghcr.io/my-org/backend
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: worker
  namespace: flux-system
spec:
  image: ghcr.io/my-org/worker
  interval: 5m
```

## Step 2: Create ImagePolicy Resources

Create one ImagePolicy per application to select the latest tag.

```yaml
# image-policies.yaml
# Each policy resolves the latest semver tag for its application
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: frontend
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: frontend
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: backend
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: backend
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: worker
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: worker
  policy:
    semver:
      range: ">=1.0.0"
```

## Step 3: Add Image Policy Markers to Manifests

Add markers to each application's deployment manifest.

```yaml
# apps/frontend/deployment.yaml
# Frontend deployment with image policy marker
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: default
spec:
  replicas: 3
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
          image: ghcr.io/my-org/frontend:1.0.0 # {"$imagepolicy": "flux-system:frontend"}
          ports:
            - containerPort: 3000
```

```yaml
# apps/backend/deployment.yaml
# Backend deployment with image policy marker
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: default
spec:
  replicas: 2
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
          image: ghcr.io/my-org/backend:1.0.0 # {"$imagepolicy": "flux-system:backend"}
          ports:
            - containerPort: 8080
```

## Step 4: Configure ImageUpdateAutomation

You have two approaches for monorepo image automation.

### Option A: Single ImageUpdateAutomation Covering All Apps

Use a single ImageUpdateAutomation with the update path set to the root or the `apps/` directory.

```yaml
# image-update-automation-all.yaml
# Single automation resource scanning the entire apps directory
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: all-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@example.com
        name: Flux
      messageTemplate: |
        Automated image update

        {{range .Changed.Changes}}
        - {{.OldValue}} -> {{.NewValue}}
        {{end}}
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

This approach is simpler but produces commits that may touch multiple applications at once if several images update simultaneously.

### Option B: Separate ImageUpdateAutomation Per Application

Create one ImageUpdateAutomation per application, each scoped to its specific directory. This provides more granular control and cleaner commit history.

```yaml
# image-update-automation-frontend.yaml
# Automation scoped to the frontend directory only
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: frontend
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@example.com
        name: Flux
      messageTemplate: "Update frontend image: {{range .Changed.Changes}}{{.NewValue}}{{end}}"
    push:
      branch: main
  update:
    path: ./apps/frontend
    strategy: Setters
---
# image-update-automation-backend.yaml
# Automation scoped to the backend directory only
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: backend
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@example.com
        name: Flux
      messageTemplate: "Update backend image: {{range .Changed.Changes}}{{.NewValue}}{{end}}"
    push:
      branch: main
  update:
    path: ./apps/backend
    strategy: Setters
```

### Choosing Between the Options

| Criteria | Single Automation | Per-App Automation |
|---|---|---|
| Simplicity | Easier to manage | More YAML to maintain |
| Commit granularity | Mixed commits | Per-app commits |
| Independent intervals | Not possible | Each app on its own schedule |
| Conflict risk | Lower | Slightly higher with concurrent pushes |

## Step 5: Apply and Verify

Apply all the resources and confirm they are working.

```bash
# Apply all image automation resources
kubectl apply -f image-repositories.yaml
kubectl apply -f image-policies.yaml
kubectl apply -f image-update-automation-frontend.yaml
kubectl apply -f image-update-automation-backend.yaml

# Check the status of all image automation resources
flux get image all -n flux-system
```

## Handling Git Conflicts

When multiple ImageUpdateAutomation resources push to the same branch, there is a small chance of conflicts. Flux handles this by retrying the operation on the next reconciliation cycle. To minimize conflict risk:

- Stagger the intervals (e.g., frontend at `10m`, backend at `12m`, worker at `14m`)
- Use a single ImageUpdateAutomation with a broader path if conflicts become frequent

## Conclusion

Monorepo image automation in Flux works by scoping each ImageUpdateAutomation to the correct directory path. Whether you choose a single automation resource or per-application resources depends on your needs for commit granularity and independent scheduling. Both approaches reliably update image tags when new container images are pushed to your registries.
