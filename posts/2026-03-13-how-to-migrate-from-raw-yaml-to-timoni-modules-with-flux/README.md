# How to Migrate from Raw YAML to Timoni Modules with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, kubernetes, gitops, timoni, migration, yaml

Description: A practical guide to migrating existing raw YAML Flux configurations to Timoni modules for better maintainability and type safety.

---

## Introduction

Many teams start their Flux journey by writing raw YAML manifests for GitRepository, Kustomization, and HelmRelease resources. As the number of deployments grows, managing these manifests becomes increasingly difficult: inconsistencies creep in, copy-paste errors multiply, and configuration drift across environments is hard to detect. Migrating to Timoni modules replaces raw YAML with type-checked, modular configurations that enforce standards and reduce maintenance overhead.

This guide provides a practical migration path from raw YAML Flux resources to Timoni modules, covering assessment, conversion, validation, and cutover strategies.

## Prerequisites

- A Kubernetes cluster with Flux installed
- Existing raw YAML Flux resources (GitRepository, Kustomization, HelmRelease)
- Timoni CLI installed (v0.20 or later)
- `kubectl` and `flux` CLI tools

## Step 1: Inventory Existing Resources

Before migrating, catalog your existing Flux resources:

```bash
# List all Flux sources
flux get sources all -A

# List all Kustomizations
flux get kustomizations -A

# List all HelmReleases
flux get helmreleases -A
```

Export your existing resources for reference:

```bash
kubectl get gitrepositories -A -o yaml > git-repos-backup.yaml
kubectl get kustomizations.kustomize.toolkit.fluxcd.io -A -o yaml > kustomizations-backup.yaml
kubectl get helmreleases -A -o yaml > helmreleases-backup.yaml
```

## Step 2: Identify Migration Candidates

Group your resources by pattern. Common patterns to migrate:

### Git Sync Pattern (GitRepository + Kustomization)

Existing raw YAML:

```yaml
# Before: raw YAML
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-frontend
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/frontend
  ref:
    branch: main
  secretRef:
    name: git-credentials
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-frontend
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: app-frontend
  path: ./deploy/production
  prune: true
  wait: true
  targetNamespace: production
  timeout: 5m
  postBuild:
    substitute:
      ENVIRONMENT: production
    substituteFrom:
      - kind: ConfigMap
        name: cluster-vars
```

### Helm Release Pattern (HelmRepository + HelmRelease)

```yaml
# Before: raw YAML
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.bitnami.com/bitnami
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: redis
      version: "18.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
  targetNamespace: cache
  install:
    createNamespace: true
  values:
    architecture: replication
    replica:
      replicaCount: 3
```

## Step 3: Convert Git Sync Resources

Replace the raw YAML with Timoni module values:

```yaml
# After: Timoni values for flux-git-sync module
# frontend-values.yaml
values:
  git:
    url: "https://github.com/your-org/frontend"
    ref:
      branch: "main"
    path: "./deploy/production"
    interval: "5m"
    secretRef:
      name: "git-credentials"
  sync:
    prune: true
    wait: true
    interval: "5m"
    targetNamespace: "production"
    timeout: "5m"
    postBuild:
      substitute:
        ENVIRONMENT: "production"
      substituteFrom:
        - kind: ConfigMap
          name: cluster-vars
```

Build to verify the generated resources match your original YAML:

```bash
timoni build app-frontend oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values frontend-values.yaml \
  --namespace flux-system
```

Compare the output with your original YAML to ensure parity.

## Step 4: Convert Helm Release Resources

```yaml
# After: Timoni values for flux-helm-release module
# redis-values.yaml
values:
  repository:
    url: "https://charts.bitnami.com/bitnami"
    interval: "1h"
  chart:
    name: "redis"
    version: "18.x"
  release:
    interval: "10m"
    targetNamespace: "cache"
    createNamespace: true
    values:
      architecture: replication
      replica:
        replicaCount: 3
```

Verify:

```bash
timoni build redis oci://ghcr.io/stefanprodan/modules/flux-helm-release \
  --values redis-values.yaml \
  --namespace flux-system
```

## Step 5: Perform the Cutover

For each resource, follow this cutover process to avoid downtime:

```bash
# 1. Suspend the existing Flux resource
flux suspend kustomization app-frontend -n flux-system

# 2. Apply the Timoni module instance
timoni apply app-frontend oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values frontend-values.yaml \
  --namespace flux-system

# 3. Verify the new instance is reconciling
timoni status app-frontend -n flux-system
flux get kustomizations app-frontend -n flux-system

# 4. Remove the old raw YAML from your Git repository
# (delete the old GitRepository and Kustomization YAML files)
```

For Helm releases:

```bash
# 1. Suspend the existing HelmRelease
flux suspend helmrelease redis -n flux-system

# 2. Apply the Timoni module
timoni apply redis oci://ghcr.io/stefanprodan/modules/flux-helm-release \
  --values redis-values.yaml \
  --namespace flux-system

# 3. Verify
timoni status redis -n flux-system
flux get helmreleases redis -n flux-system
```

## Step 6: Migrate in Batches

For large environments, migrate in batches. Start with non-critical resources:

```bash
# Batch 1: Development environment
timoni apply dev-frontend oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values dev-frontend-values.yaml --namespace flux-system
timoni apply dev-backend oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values dev-backend-values.yaml --namespace flux-system

# Batch 2: Staging environment (after dev is verified)
timoni apply staging-frontend oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values staging-frontend-values.yaml --namespace flux-system

# Batch 3: Production environment (after staging is verified)
timoni apply prod-frontend oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values prod-frontend-values.yaml --namespace flux-system
```

## Step 7: Organize Values Files

Establish a directory structure for your Timoni values:

```
fleet-config/
  modules/
    frontend/
      base-values.yaml
      dev-values.yaml
      staging-values.yaml
      production-values.yaml
    backend/
      base-values.yaml
      dev-values.yaml
      staging-values.yaml
      production-values.yaml
    redis/
      base-values.yaml
      production-values.yaml
```

## Step 8: Verify Migration Completeness

After migrating all resources, verify nothing was missed:

```bash
# List Timoni instances
timoni list -A

# Compare with original Flux resource count
flux get all -A

# Ensure all deployments are healthy
flux get kustomizations -A --status-selector ready=true
flux get helmreleases -A --status-selector ready=true
```

## Conclusion

Migrating from raw YAML to Timoni modules is a worthwhile investment for any team managing multiple Flux deployments. The process is straightforward: export existing resources, convert them to Timoni values files, verify parity with the build command, and perform a suspend-apply cutover for each resource. The result is a more maintainable, type-safe configuration layer that catches errors before deployment and enforces consistent patterns across your infrastructure. Batch the migration starting with non-critical environments to build confidence before tackling production resources.
