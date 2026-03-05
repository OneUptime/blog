# How to Set Up Gitless GitOps with OCI Artifacts in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, OCI, Gitless, Container Registry

Description: Learn how to implement a fully Git-free GitOps workflow using OCI artifacts as the sole delivery mechanism in Flux CD.

---

## Introduction

Traditional GitOps relies on Git as the single source of truth, with controllers polling Git repositories for changes. While this model works well, it introduces dependencies on Git hosting availability, repository size, and API rate limits. Flux CD's OCI support enables a "gitless" GitOps model where OCI artifacts stored in container registries replace Git repositories entirely as the delivery mechanism for Kubernetes manifests.

In a gitless GitOps setup, your CI pipeline builds and pushes OCI artifacts to a registry, and Flux pulls those artifacts directly -- no GitRepository resources needed. Git still serves as your source of truth for code and configuration authoring, but the delivery path to the cluster goes through the registry.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (v0.35 or later)
- The `flux` CLI installed
- An OCI-compatible container registry (GHCR, ECR, ACR, Harbor, Docker Hub, etc.)
- A CI/CD system (GitHub Actions, GitLab CI, etc.)
- `kubectl` configured to access your cluster

## Architecture Overview

```mermaid
graph LR
    A[Developer] -->|git push| B[Git Repository]
    B -->|Trigger| C[CI Pipeline]
    C -->|flux push artifact| D[OCI Registry]
    D -->|OCIRepository pull| E[Flux Source Controller]
    E -->|Reconcile| F[Kustomize Controller]
    F -->|Apply| G[Kubernetes Cluster]

    style B fill:#ffd,stroke:#333
    style D fill:#bbf,stroke:#333
    style G fill:#bfb,stroke:#333
```

Notice that the arrow from Git to the cluster goes through the CI pipeline and OCI registry. Flux never talks to Git directly.

## Step 1: Organize Your Manifest Repository

Structure your repository with clear separation between application manifests and infrastructure.

```bash
# Repository structure for gitless GitOps
tree deploy/
# deploy/
# ├── apps/
# │   ├── frontend/
# │   │   ├── deployment.yaml
# │   │   ├── service.yaml
# │   │   └── kustomization.yaml
# │   └── backend/
# │       ├── deployment.yaml
# │       ├── service.yaml
# │       └── kustomization.yaml
# └── infrastructure/
#     ├── monitoring/
#     │   ├── prometheus.yaml
#     │   └── kustomization.yaml
#     └── ingress/
#         ├── nginx-ingress.yaml
#         └── kustomization.yaml
```

## Step 2: Set Up the CI Pipeline to Push OCI Artifacts

Configure your CI system to push OCI artifacts on every relevant change. Here is a GitHub Actions workflow.

```yaml
# .github/workflows/push-oci-artifacts.yaml -- Push all deployment artifacts
name: Push OCI Artifacts
on:
  push:
    branches: [main]
    paths: ["deploy/**"]

permissions:
  packages: write

jobs:
  push-artifacts:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component:
          - { name: "apps", path: "./deploy/apps" }
          - { name: "infrastructure", path: "./deploy/infrastructure" }
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Push OCI artifact
        run: |
          flux push artifact \
            oci://ghcr.io/${{ github.repository }}/${{ matrix.component.name }}:${{ github.sha }} \
            --path=${{ matrix.component.path }} \
            --source="${{ github.repositoryUrl }}" \
            --revision="${{ github.ref_name }}@sha1:${{ github.sha }}" \
            --creds=flux:${{ secrets.GITHUB_TOKEN }}

      - name: Tag as latest
        run: |
          flux tag artifact \
            oci://ghcr.io/${{ github.repository }}/${{ matrix.component.name }}:${{ github.sha }} \
            --tag=latest \
            --creds=flux:${{ secrets.GITHUB_TOKEN }}
```

## Step 3: Bootstrap Flux Without GitRepository

When setting up Flux for gitless GitOps, you can apply Flux components directly instead of using `flux bootstrap`, which assumes a Git repository.

Install Flux components.

```bash
# Install Flux components without Git bootstrap
flux install --components=source-controller,kustomize-controller,helm-controller,notification-controller
```

## Step 4: Create Registry Credentials

Create the authentication secret for your registry.

```bash
# Create registry credentials for Flux
kubectl create secret docker-registry oci-auth \
  --namespace=flux-system \
  --docker-server=ghcr.io \
  --docker-username=flux \
  --docker-password=$GITHUB_TOKEN
```

## Step 5: Configure OCIRepository Sources

Create OCIRepository resources for each component.

```yaml
# oci-sources.yaml -- OCIRepository resources for all components
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 1m
  url: oci://ghcr.io/your-org/your-repo/apps
  ref:
    # Use 'latest' tag for continuous deployment
    tag: latest
  secretRef:
    name: oci-auth
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 1m
  url: oci://ghcr.io/your-org/your-repo/infrastructure
  ref:
    tag: latest
  secretRef:
    name: oci-auth
```

## Step 6: Create Kustomizations

Wire up Kustomizations that reference the OCIRepository sources.

```yaml
# kustomizations.yaml -- Deploy all components from OCI artifacts
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: OCIRepository
    name: infrastructure
  path: ./
  prune: true
  wait: true
  timeout: 5m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    # Apps depend on infrastructure being ready first
    - name: infrastructure
  sourceRef:
    kind: OCIRepository
    name: apps
  path: ./
  prune: true
  wait: true
  timeout: 5m
```

Apply all resources.

```bash
# Apply the OCI sources and Kustomizations
kubectl apply -f oci-sources.yaml
kubectl apply -f kustomizations.yaml
```

## Step 7: Verify the Setup

Check that everything is running.

```bash
# Check all Flux sources
flux get sources oci

# Check all Kustomizations
flux get kustomizations

# Watch for real-time updates
flux get kustomizations --watch
```

## Managing Flux Configuration Without Git

Since Flux itself is not bootstrapped from Git, you need a strategy for managing Flux's own configuration. Options include:

1. **Store Flux config as an OCI artifact**: Push Flux's own resource definitions (OCIRepository, Kustomization) as a separate OCI artifact and have a bootstrap Kustomization that applies them.

2. **Use a config management tool**: Tools like Terraform or Pulumi can manage Flux resources as part of cluster provisioning.

3. **Manual initial setup**: Apply the initial Flux resources manually or via a setup script, then manage subsequent changes through OCI artifacts.

Here is an example of the self-managing approach.

```yaml
# flux-config OCIRepository -- Flux manages its own configuration via OCI
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: flux-config
  namespace: flux-system
spec:
  interval: 1m
  url: oci://ghcr.io/your-org/your-repo/flux-config
  ref:
    tag: latest
  secretRef:
    name: oci-auth
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flux-config
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: OCIRepository
    name: flux-config
  path: ./
  prune: true
```

## Benefits of Gitless GitOps

- **No Git rate limits**: OCI registries handle high pull rates better than Git hosting APIs
- **Faster reconciliation**: OCI artifacts are smaller than full Git clones
- **Registry replication**: Use registry mirroring to distribute artifacts globally
- **Unified infrastructure**: Same registry for images and deployment manifests
- **Decoupled delivery**: Git outages do not block deployments (artifacts are already in the registry)

## Trade-offs to Consider

- **No Git audit trail in Flux**: Flux cannot show Git commit history for changes. Use `--source` and `--revision` flags when pushing to embed Git metadata in artifacts.
- **Initial setup complexity**: Without `flux bootstrap`, you need to handle the initial Flux configuration manually.
- **Dependency on CI**: Every change must go through CI to become an OCI artifact. Direct Git-based reconciliation is no longer available.

## Conclusion

Gitless GitOps with Flux CD and OCI artifacts provides a scalable, fast, and resilient deployment pipeline. By routing all manifest delivery through an OCI registry, you eliminate Git as a runtime dependency for your clusters while still using Git as the authoring and review platform. This architecture is well-suited for multi-cluster environments, air-gapped deployments, and organizations that want to leverage their existing container registry infrastructure for all deployment artifacts.
