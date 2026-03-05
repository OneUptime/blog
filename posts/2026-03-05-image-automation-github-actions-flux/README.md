# How to Set Up Image Automation with GitHub Actions and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, GitHub Actions, CI/CD

Description: Learn how to integrate GitHub Actions with Flux CD image automation to build, push, and automatically deploy container images.

---

## Introduction

GitHub Actions and Flux CD form a powerful CI/CD pipeline when combined. GitHub Actions handles the build side, compiling code, running tests, and pushing tagged container images to a registry. Flux CD handles the deploy side, detecting new image tags and updating Kubernetes manifests in your GitOps repository. This guide covers the end-to-end setup from GitHub Actions workflow to Flux image automation.

## Prerequisites

- Flux CD v2.0 or later installed on your Kubernetes cluster
- Flux image-reflector-controller and image-automation-controller installed
- A GitHub repository for your application code
- A separate GitHub repository (or branch) for your Flux GitOps manifests
- A container registry (GitHub Container Registry, Docker Hub, or any OCI registry)

## Architecture Overview

The pipeline flow is:

1. Developer pushes code to the application repository
2. GitHub Actions builds and pushes a tagged image to the container registry
3. Flux image-reflector-controller detects the new tag
4. Flux image-automation-controller updates the manifest in the GitOps repository
5. Flux kustomize-controller deploys the updated manifest to the cluster

## GitHub Actions Workflow

Create a workflow that builds and pushes a container image with a SemVer or build-number tag.

```yaml
# .github/workflows/build-and-push.yaml
name: Build and Push Image

on:
  push:
    branches: [main]
    tags: ['v*']

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
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
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
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=,format=short

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

This workflow triggers on pushes to `main` and on version tags. It pushes to the GitHub Container Registry (ghcr.io).

## Build Number Tagging Variant

If you prefer build-number-based tags:

```yaml
      - name: Generate build number tag
        id: tag
        run: echo "TAG=build-${{ github.run_number }}" >> "$GITHUB_OUTPUT"

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.tag.outputs.TAG }}
```

## Configuring Flux Image Scanning

Create an ImageRepository that points to GHCR. Since GHCR requires authentication for private images, create a secret first.

```bash
# Create a secret for GHCR access (use a personal access token with read:packages scope)
kubectl create secret docker-registry ghcr-auth \
  --namespace flux-system \
  --docker-server=ghcr.io \
  --docker-username=flux-bot \
  --docker-password="${GITHUB_TOKEN}"
```

```yaml
# image-automation/image-repository.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 5m
  secretRef:
    name: ghcr-auth
```

## Configuring ImagePolicy

For SemVer tags created by the GitHub Actions workflow:

```yaml
# image-automation/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
```

For build number tags:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^build-(?P<build>[0-9]+)$'
    extract: '$build'
  policy:
    numerical:
      order: asc
```

## Marking Deployment Manifests

In your GitOps repository, add the marker comment.

```yaml
# apps/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: ghcr.io/my-org/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
```

## Configuring ImageUpdateAutomation

Set up the automation to commit updates to the GitOps repository.

```yaml
# image-automation/image-update-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: github-actions[bot]
        email: github-actions[bot]@users.noreply.github.com
      messageTemplate: |
        chore: update image tags

        {{ range .Changed.Objects -}}
        - {{ .Kind }}/{{ .Name }}: {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## Using GitHub Actions to Trigger Flux Reconciliation

Optionally, you can trigger an immediate Flux reconciliation after pushing an image, rather than waiting for the next scan interval.

```yaml
# Add to your GitHub Actions workflow
      - name: Trigger Flux reconciliation
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.FLUX_WEBHOOK_TOKEN }}" \
            "https://flux-webhook.example.com/hook/image-reflector"
```

Alternatively, configure a Flux Receiver to accept GitHub webhooks.

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-receiver
  namespace: flux-system
spec:
  type: github
  secretRef:
    name: webhook-token
  resources:
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImageRepository
      name: my-app
```

## Verifying the End-to-End Pipeline

```bash
# Push a new tag to trigger GitHub Actions
git tag v1.1.0 && git push origin v1.1.0

# Wait for GitHub Actions to complete, then check Flux
flux get image repository my-app -n flux-system
flux get image policy my-app -n flux-system
flux get image update my-app -n flux-system

# Check the GitOps repo for the automated commit
git pull && git log --oneline -3
```

## Troubleshooting

**ImageRepository shows authentication errors.** Verify the GHCR secret has a valid token with `read:packages` scope. For organization repositories, the token must have access to the organization.

**GitHub Actions builds succeed but Flux does not detect new tags.** Check that the image name in the ImageRepository matches exactly what GitHub Actions pushes. GHCR uses lowercase paths.

**ImageUpdateAutomation fails to push commits.** Ensure the GitRepository source has write access. The deploy key or token used by Flux must have push permissions to the GitOps repository.

## Conclusion

GitHub Actions and Flux CD complement each other naturally in a GitOps workflow. GitHub Actions handles building, testing, and pushing container images, while Flux handles detecting new images and rolling them out to Kubernetes. By connecting them through a container registry and Flux's image automation controllers, you get a fully automated pipeline from code commit to production deployment with a clear audit trail in Git.
