# ArgoCD Best Practices for Repository Structure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Repository Management, DevOps

Description: Learn how to structure Git repositories for ArgoCD including monorepo vs multi-repo strategies, directory layouts, environment management, and config separation patterns.

---

How you structure your Git repositories determines how smoothly ArgoCD operates day to day. A well-organized repo structure means straightforward application definitions, clear environment promotion, easy debugging, and teams that can work independently without stepping on each other. A poorly organized structure leads to tangled dependencies, confusing overrides, and deployments that break in ways nobody can trace.

This guide covers proven repository structure patterns for ArgoCD, when to use each one, and how to avoid the most common organizational mistakes.

## The fundamental decision: monorepo vs multi-repo

### Monorepo approach

All Kubernetes manifests and ArgoCD application definitions live in one repository:

```text
platform/
  argocd/
    install/                    # ArgoCD installation manifests
    projects/                   # AppProject definitions
  apps/                         # ArgoCD Application definitions
    web-frontend.yaml
    api-backend.yaml
    worker-service.yaml
    database.yaml
  manifests/                    # Kubernetes manifests
    web-frontend/
      base/
        deployment.yaml
        service.yaml
        ingress.yaml
        kustomization.yaml
      overlays/
        dev/
          kustomization.yaml
        staging/
          kustomization.yaml
        production/
          kustomization.yaml
          hpa.yaml
    api-backend/
      base/
      overlays/
    worker-service/
      base/
      overlays/
    database/
      base/
      overlays/
  shared/                       # Shared resources
    monitoring/
    logging/
    ingress/
```

**Pros:**
- Single source of truth
- Atomic changes across multiple services
- Simple ArgoCD configuration (one repo to manage)
- Easy to search and audit

**Cons:**
- Large repos slow down Git operations and ArgoCD reconciliation
- All teams commit to the same repo (potential conflicts)
- Hard to apply different access controls per service
- One bad commit can affect all services

**Best for:** Small to medium teams (under 20 engineers) with fewer than 50 services.

### Multi-repo approach

Separate repositories for platform config, team configs, and application source code:

```text
# Platform config repo (platform-config)
argocd/
  install/
  projects/
  applicationsets/
clusters/
  production/
    cluster-config.yaml
  staging/
    cluster-config.yaml
shared-infrastructure/
  monitoring/
  logging/

# Team config repos (one per team)
# payments-config
apps/
  payment-api.yaml
  payment-processor.yaml
manifests/
  payment-api/
    base/
    overlays/
  payment-processor/
    base/
    overlays/

# orders-config
apps/
  order-service.yaml
  order-worker.yaml
manifests/
  order-service/
    base/
    overlays/

# Application source repos (separate from config)
# payment-api-src (contains Dockerfile, source code, tests)
# order-service-src
```

**Pros:**
- Clear ownership boundaries
- Teams work independently
- Granular access control
- Smaller repos are faster

**Cons:**
- More complex ArgoCD setup
- Cross-service changes require multiple PRs
- More repositories to manage and monitor

**Best for:** Large organizations with multiple teams and 50+ services.

## Directory layout patterns

### Pattern 1: Environment-per-directory with Kustomize

The most common and recommended pattern:

```text
service-name/
  base/
    deployment.yaml
    service.yaml
    configmap.yaml
    kustomization.yaml
  overlays/
    dev/
      kustomization.yaml
      patches/
        replicas.yaml
    staging/
      kustomization.yaml
      patches/
        replicas.yaml
        resources.yaml
    production/
      kustomization.yaml
      patches/
        replicas.yaml
        resources.yaml
        hpa.yaml
```

ArgoCD Application definition:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-web-frontend
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/platform.git
    targetRevision: main
    path: manifests/web-frontend/overlays/production
  destination:
    server: https://prod-cluster.example.com
    namespace: web-frontend
```

### Pattern 2: Helm values per environment

When using Helm charts (either your own or third-party):

```text
services/
  web-frontend/
    Chart.yaml              # Or reference to external chart
    values.yaml             # Default values
    values-dev.yaml         # Dev overrides
    values-staging.yaml     # Staging overrides
    values-production.yaml  # Production overrides
    templates/              # If using custom chart
```

ArgoCD Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-web-frontend
spec:
  source:
    repoURL: https://github.com/myorg/platform.git
    targetRevision: main
    path: services/web-frontend
    helm:
      valueFiles:
        - values.yaml
        - values-production.yaml
```

### Pattern 3: Directory-per-environment at the top level

Useful when environments have significantly different configurations:

```text
environments/
  dev/
    web-frontend/
      deployment.yaml
      service.yaml
    api-backend/
      deployment.yaml
      service.yaml
  staging/
    web-frontend/
      deployment.yaml
      service.yaml
    api-backend/
      deployment.yaml
      service.yaml
  production/
    web-frontend/
      deployment.yaml
      service.yaml
      hpa.yaml
      pdb.yaml
    api-backend/
      deployment.yaml
      service.yaml
      hpa.yaml
```

This pattern causes duplication but makes it very clear what each environment looks like. Good for teams that want maximum visibility into production state.

## Separate config from application source code

This is one of the most important best practices. Your application source code (Go files, Python files, Dockerfiles) should live in a separate repository from your Kubernetes manifests:

```text
# Source code repo: myorg/web-frontend
src/
Dockerfile
tests/
.github/workflows/ci.yaml    # Builds and pushes Docker image

# Config repo: myorg/platform-config
manifests/web-frontend/
  base/
    deployment.yaml           # References image tag
```

**Why separate repos?**

1. **Different change cadences** - Code changes frequently, infrastructure config changes less often
2. **Different reviewers** - Code reviews and infrastructure reviews involve different people
3. **Prevents accidental deployments** - A code commit should not trigger a deployment unless the image tag is updated
4. **Clear audit trail** - Git history shows config changes separate from code changes

The CI pipeline in the source repo builds the image, and then a separate process (manual PR, Image Updater, or CI step) updates the config repo:

```yaml
# CI pipeline updates the config repo after building
# .github/workflows/ci.yaml in source repo
- name: Update config repo
  run: |
    cd /tmp
    git clone https://github.com/myorg/platform-config.git
    cd platform-config
    kustomize edit set image myorg/web-frontend=myorg/web-frontend:${{ github.sha }}
    git add .
    git commit -m "Update web-frontend to ${{ github.sha }}"
    git push
```

## Application definition organization

Keep ArgoCD Application definitions organized and consistent:

```text
apps/
  # Group by environment
  dev/
    web-frontend.yaml
    api-backend.yaml
  staging/
    web-frontend.yaml
    api-backend.yaml
  production/
    web-frontend.yaml
    api-backend.yaml

  # Or use ApplicationSets to generate from config
  applicationsets/
    dev-services.yaml
    staging-services.yaml
    production-services.yaml

  # App-of-apps at the top
  root-app.yaml
```

Use naming conventions consistently:

```yaml
# Naming convention: <env>-<service-name>
# Examples: prod-web-frontend, staging-api-backend, dev-worker-service
metadata:
  name: prod-web-frontend
  labels:
    environment: production
    team: frontend
    service: web-frontend
```

## Handling shared resources

Resources used across multiple services (monitoring, logging, ingress controllers) need their own structure:

```text
shared/
  monitoring/
    prometheus/
      base/
      overlays/
    grafana/
      base/
      overlays/
  logging/
    fluentbit/
    elasticsearch/
  ingress/
    nginx-ingress/
  cert-manager/
  external-secrets/
```

Deploy shared resources through a dedicated ArgoCD application or project:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: shared-infrastructure
spec:
  sourceRepos:
    - https://github.com/myorg/platform-config.git
  destinations:
    - server: "*"
      namespace: monitoring
    - server: "*"
      namespace: logging
    - server: "*"
      namespace: ingress-nginx
```

## Avoiding common mistakes

**1. Do not put Kubernetes manifests inside application source repos.**
This couples your deployment config to your code releases.

**2. Do not use branch-per-environment.**
Using `dev`, `staging`, `production` branches sounds clean but creates merge hell and makes promotion difficult. Use directory-per-environment instead.

**3. Do not nest too deeply.**
If your path to a manifest is more than 4 directories deep, it is probably too complex. Flatten where possible.

**4. Do not mix tool types within a single application.**
One ArgoCD application should use either Kustomize OR Helm, not both in the same path.

**5. Do keep environment differences minimal.**
If your production manifests look completely different from staging, you are not actually testing your production config in staging.

## Summary

Repository structure for ArgoCD should prioritize clarity, team autonomy, and separation of concerns. Use monorepo for small teams and multi-repo for larger organizations. Separate application source code from deployment configuration. Choose a consistent directory pattern (Kustomize overlays is the most common), organize ArgoCD Application definitions clearly, and avoid branch-per-environment strategies. The structure you choose on day one will shape your team's workflow for years, so invest the time to get it right.
