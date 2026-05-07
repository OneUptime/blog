# How to Use Podman with ArgoCD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, ArgoCD, GitOps, Kubernetes, CI/CD

Description: Learn how to integrate Podman into a GitOps workflow with ArgoCD for automated Kubernetes deployments triggered by container image builds.

---

> Podman builds the images, ArgoCD deploys them -- together they create a complete GitOps pipeline from source code to production.

ArgoCD is a declarative GitOps continuous delivery tool for Kubernetes. While ArgoCD handles the deployment side, Podman fits naturally into the build side of a GitOps workflow. This guide shows how to use Podman to build and push container images, then trigger ArgoCD to deploy them automatically through Git-based manifest updates.

---

## Understanding the Podman-ArgoCD Workflow

The GitOps workflow with Podman and ArgoCD follows a clear pattern: build with Podman, update manifests in Git, and let ArgoCD sync the changes.

```bash
#!/bin/bash
# The GitOps flow with Podman and ArgoCD:

# 1. Developer pushes code to the application repository
# 2. CI pipeline builds the image with Podman and pushes to a registry
# 3. CI updates the Kubernetes manifests in the GitOps repository
# 4. ArgoCD detects the manifest change and syncs the deployment

# This separation means:
# - Podman handles building and pushing images
# - Git is the single source of truth for desired state
# - ArgoCD handles deployment and reconciliation
```

## Building and Pushing Images with Podman

Set up the CI pipeline to build images with Podman.

```bash
#!/bin/bash
# CI script: Build and push the container image with Podman
# This runs in your application repository's CI pipeline

REGISTRY="registry.example.com"
APP_NAME="myapp"
VERSION="${CI_COMMIT_SHA:0:8}"
FULL_IMAGE="${REGISTRY}/${APP_NAME}:${VERSION}"

# Build the container image
podman build \
  --tag "${FULL_IMAGE}" \
  --label "git.commit=${CI_COMMIT_SHA}" \
  --label "git.branch=${CI_BRANCH}" \
  .

# Log in to the container registry
echo "${REGISTRY_TOKEN}" | podman login "${REGISTRY}" \
  -u "${REGISTRY_USER}" --password-stdin

# Push the image
podman push "${FULL_IMAGE}"

echo "Image pushed: ${FULL_IMAGE}"
echo "VERSION=${VERSION}" >> build.env
```

## Updating GitOps Manifests

After building the image, update the Kubernetes manifests in the GitOps repository.

```bash
#!/bin/bash
# CI script: Update the deployment manifest in the GitOps repo
# This triggers ArgoCD to deploy the new version

GITOPS_REPO="https://github.com/myorg/gitops-manifests.git"
APP_NAME="myapp"
NEW_IMAGE="${REGISTRY}/${APP_NAME}:${VERSION}"

# Clone the GitOps repository
git clone "${GITOPS_REPO}" /tmp/gitops
cd /tmp/gitops

# Update the image tag in the Kubernetes deployment manifest
# Using sed to update the image reference
sed -i "s|image: ${REGISTRY}/${APP_NAME}:.*|image: ${NEW_IMAGE}|g" \
  "apps/${APP_NAME}/deployment.yaml"

# Or, if the ArgoCD Application points to a Kustomize overlay:
# cd "apps/${APP_NAME}/overlays/production"
# kustomize edit set image "${REGISTRY}/${APP_NAME}=${NEW_IMAGE}"

# Commit and push the change
git config user.email "ci-bot@example.com"
git config user.name "CI Bot"
git add -A
git commit -m "deploy: update ${APP_NAME} to ${VERSION}"
git push origin main

echo "GitOps manifest updated. ArgoCD will sync shortly."
```

## ArgoCD Application Configuration

Define the ArgoCD Application resource that watches the GitOps repository.

```yaml
# argocd/application.yaml
# ArgoCD Application that deploys from the GitOps repository
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default

  source:
    repoURL: https://github.com/myorg/gitops-manifests.git
    targetRevision: main
    path: apps/myapp/overlays/production

  destination:
    server: https://kubernetes.default.svc
    namespace: production

  syncPolicy:
    automated:
      # Automatically sync when Git changes are detected
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Kubernetes Deployment Manifest

The deployment manifest that ArgoCD manages.

```yaml
# apps/myapp/deployment.yaml
# Kubernetes Deployment managed by ArgoCD
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 3
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
          # This image tag gets updated by the CI pipeline
          image: registry.example.com/myapp:abc12345
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

## Complete GitHub Actions Pipeline

A full GitHub Actions workflow that builds with Podman and triggers ArgoCD.

```yaml
# .github/workflows/gitops-deploy.yml
name: Build and Deploy via GitOps

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      # Build the image with Podman
      - name: Build image
        run: |
          VERSION=$(echo ${{ github.sha }} | cut -c1-8)
          IMAGE_ID=$(echo "ghcr.io/${{ github.repository }}" | tr '[A-Z]' '[a-z]')
          podman build \
            --tag ${IMAGE_ID}:${VERSION} \
            .
          echo "VERSION=${VERSION}" >> "$GITHUB_ENV"
          echo "IMAGE_ID=${IMAGE_ID}" >> "$GITHUB_ENV"

      # Push to GHCR
      - name: Push image
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | \
            podman login ghcr.io -u ${{ github.actor }} --password-stdin
          podman push "${IMAGE_ID}:${VERSION}"

      # Update GitOps repository to trigger ArgoCD
      - name: Update GitOps manifests
        run: |
          git clone https://x-access-token:${{ secrets.GITOPS_TOKEN }}@github.com/myorg/gitops-manifests.git /tmp/gitops
          cd /tmp/gitops

          # Update the image tag
          sed -i "s|image: ${IMAGE_ID}:.*|image: ${IMAGE_ID}:${VERSION}|g" \
            apps/myapp/deployment.yaml

          git config user.email "github-actions@github.com"
          git config user.name "GitHub Actions"
          git add -A
          git commit -m "deploy: myapp to ${VERSION}"
          git push
```

## Monitoring Deployment with ArgoCD CLI

Verify that ArgoCD synced the new deployment after the image update.

```bash
#!/bin/bash
# Monitor the ArgoCD sync after pushing a new image

# Check the application sync status
argocd app get myapp --output json | jq '.status.sync.status'

# Wait for the sync to complete
argocd app wait myapp --timeout 300

# Verify the deployed image version
kubectl get deployment myapp -n production \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Summary

Podman and ArgoCD complement each other perfectly in a GitOps workflow. Podman handles the CI side, building and pushing container images to a registry. The CI pipeline then updates Kubernetes manifests in a GitOps repository, which ArgoCD watches and automatically syncs to the cluster. This separation of concerns means your build pipeline focuses on creating artifacts, while ArgoCD handles the deployment lifecycle. The Git repository serves as the single source of truth for what should be running in your cluster, providing full audit trails and easy rollbacks.
