# How to Build a Complete CI/CD Pipeline with GitHub Actions and Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitHub Actions, CI/CD, GitOps, Kubernetes, DevOps

Description: Learn how to build a complete CI/CD pipeline using GitHub Actions for continuous integration and Flux CD for GitOps-based continuous deployment to Kubernetes.

---

## Introduction

Modern Kubernetes deployments benefit greatly from separating the build and deploy concerns. GitHub Actions excels at building, testing, and pushing container images, while Flux CD handles the GitOps reconciliation loop that keeps your cluster state synchronized with your Git repository. Together they form a robust, auditable pipeline.

The key insight of this architecture is that GitHub Actions never directly touches the cluster. Instead, it updates image tags in your Git repository, and Flux CD detects those changes and reconciles them into the cluster. This separation means your deployment mechanism is not tied to your CI system, and you retain a full Git history of every deployment.

This guide walks through configuring both systems end to end: from a developer pushing code, through GitHub Actions building and pushing an image, to Flux CD detecting the new tag and rolling it out to your cluster.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- A GitHub repository containing your application source code
- A container registry (GitHub Container Registry, Docker Hub, or ECR)
- `flux` CLI and `kubectl` installed locally
- Basic familiarity with Flux CD Kustomizations and GitRepositories

## Step 1: Bootstrap Flux CD on Your Cluster

If Flux is not yet installed, bootstrap it against your GitHub repository:

```bash
flux bootstrap github \
  --owner=your-org \
  --repository=your-fleet-repo \
  --branch=main \
  --path=clusters/production \
  --personal
```

This creates the `flux-system` namespace and installs all Flux controllers. The `clusters/production` path is where Flux reads its configuration.

## Step 2: Define the Application GitRepository and Kustomization

Create the Flux source and reconciliation objects:

```yaml
# clusters/production/apps/myapp-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/your-fleet-repo
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: myapp
  targetNamespace: myapp
```

## Step 3: Define the Application Deployment with Image Policy

Use Flux Image Automation to allow automated image tag updates:

```yaml
# apps/myapp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: ghcr.io/your-org/myapp:latest # {"$imagepolicy": "flux-system:myapp"}
          ports:
            - containerPort: 8080
```

The `# {"$imagepolicy": "flux-system:myapp"}` comment tells the Image Reflector Controller which policy governs this image field.

## Step 4: Configure Flux Image Automation

```yaml
# clusters/production/apps/myapp-image.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  image: ghcr.io/your-org/myapp
  interval: 1m
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: myapp
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: myapp
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxbot@your-org.com
        name: Flux Bot
      messageTemplate: "chore: update myapp image to {{range .Updated.Images}}{{.}}{{end}}"
    push:
      branch: main
  update:
    path: ./apps/myapp
    strategy: Setters
```

## Step 5: Configure the GitHub Actions Workflow

```yaml
# .github/workflows/build-push.yaml
name: Build and Push

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=semver,pattern={{version}}
            type=sha,prefix=sha-

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

## Step 6: Verify the End-to-End Flow

After pushing a commit with a new semantic version tag, verify Flux picks it up:

```bash
# Watch the image policy status
flux get images policy myapp --watch

# Check the image update automation
flux get images update myapp

# Watch the Kustomization reconcile
flux get kustomizations myapp --watch

# Confirm the deployment rolled out
kubectl rollout status deployment/myapp -n myapp
```

## Best Practices

- Tag images with semantic versions (`v1.2.3`) rather than `latest` to give Flux Image Policy a stable range to track.
- Store your fleet repository separately from your application source repository to enforce clear boundaries between build and deploy concerns.
- Use branch protection on your fleet repository; Flux Bot commits should go through PRs in regulated environments.
- Set `prune: true` on Kustomizations so removed manifests are cleaned up from the cluster automatically.
- Add health checks to your Kustomization using `healthChecks` to gate downstream deployments.
- Rotate GHCR credentials used by the ImageRepository secret periodically.

## Conclusion

By combining GitHub Actions for CI with Flux CD for GitOps deployment, you get a pipeline that is auditable, secure, and decoupled. GitHub Actions handles the fast-moving build side, while Flux CD provides the steady, self-healing deployment loop. The result is a system where the cluster always reflects what is in Git, and every image update is traceable to a specific commit.
