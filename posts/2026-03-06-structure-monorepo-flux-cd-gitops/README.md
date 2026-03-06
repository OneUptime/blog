# How to Structure a Monorepo for Flux CD GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, monorepo, gitops, repository structure, kubernetes, best practices

Description: A practical guide to structuring a monorepo for Flux CD GitOps, covering directory layout, multi-cluster support, and separation of concerns.

---

## Introduction

A monorepo approach to Flux CD GitOps keeps all your infrastructure and application configurations in a single Git repository. This strategy simplifies dependency management, ensures consistency across environments, and provides a single source of truth for your entire platform. However, it requires careful organization to remain maintainable as the project scales.

This guide covers a battle-tested monorepo structure for Flux CD, with practical examples for multi-cluster, multi-environment setups.

## When to Use a Monorepo

A monorepo works well when:

- You have a small to medium-sized team (under 20 engineers managing infrastructure)
- You want a single place to review all changes
- Cross-cutting changes are frequent (e.g., updating a shared configuration across all environments)
- You need tight coupling between infrastructure and application configurations

## Recommended Directory Structure

Here is the top-level layout for a Flux CD monorepo:

```
flux-platform/
├── clusters/
│   ├── production/
│   ├── staging/
│   └── development/
├── infrastructure/
│   ├── base/
│   ├── production/
│   ├── staging/
│   └── development/
├── apps/
│   ├── base/
│   ├── production/
│   ├── staging/
│   └── development/
├── tenants/
│   ├── team-frontend/
│   └── team-backend/
└── scripts/
    └── validate.sh
```

## The Clusters Directory

The `clusters/` directory is the entry point for each cluster. It contains the Flux Kustomization resources that bootstrap everything else:

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
```

```yaml
# clusters/production/infrastructure.yaml
# This Kustomization points to the infrastructure layer
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  retryInterval: 1m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/production
  prune: true
  wait: true
```

```yaml
# clusters/production/apps.yaml
# This Kustomization points to the applications layer
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  retryInterval: 1m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production
  prune: true
  dependsOn:
    - name: infrastructure
```

## The Infrastructure Directory

The `infrastructure/` directory contains cluster-wide infrastructure components like ingress controllers, cert-manager, monitoring, and storage classes.

### Base Infrastructure

```yaml
# infrastructure/base/cert-manager/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager
```

```yaml
# infrastructure/base/cert-manager/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 1h
  chart:
    spec:
      chart: cert-manager
      version: "1.14.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  values:
    installCRDs: true
    # Common settings for all environments
    prometheus:
      enabled: true
```

```yaml
# infrastructure/base/cert-manager/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrelease.yaml
```

### Environment-Specific Overrides

```yaml
# infrastructure/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base/sources
  - ../base/cert-manager
  - ../base/ingress-nginx
  - ../base/monitoring
patches:
  - path: patches/cert-manager-values.yaml
    target:
      kind: HelmRelease
      name: cert-manager
```

```yaml
# infrastructure/production/patches/cert-manager-values.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  values:
    # Production-specific: higher replica count
    replicaCount: 3
    # Production-specific: resource limits
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
```

## The Apps Directory

The `apps/` directory mirrors the infrastructure pattern with base and overlay structure:

```yaml
# apps/base/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 1
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
          image: registry.example.com/my-app:latest
          ports:
            - containerPort: 8080
          env:
            - name: ENVIRONMENT
              value: "${ENVIRONMENT}"
            - name: LOG_LEVEL
              value: "${LOG_LEVEL}"
```

```yaml
# apps/base/my-app/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - ingress.yaml
```

```yaml
# apps/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base/my-app
  - ../base/api-gateway
  - ../base/worker
patches:
  - path: patches/my-app-replicas.yaml
    target:
      kind: Deployment
      name: my-app
```

```yaml
# apps/production/patches/my-app-replicas.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 5
```

## Multi-Cluster Support

For organizations running multiple production clusters, extend the clusters directory:

```
clusters/
├── production-us-east-1/
│   ├── flux-system/
│   ├── infrastructure.yaml
│   └── apps.yaml
├── production-eu-west-1/
│   ├── flux-system/
│   ├── infrastructure.yaml
│   └── apps.yaml
├── staging/
│   ├── flux-system/
│   ├── infrastructure.yaml
│   └── apps.yaml
└── development/
    ├── flux-system/
    ├── infrastructure.yaml
    └── apps.yaml
```

Use post-build variable substitution to differentiate clusters:

```yaml
# clusters/production-us-east-1/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production
  prune: true
  dependsOn:
    - name: infrastructure
  postBuild:
    substitute:
      CLUSTER_NAME: production-us-east-1
      REGION: us-east-1
      ENVIRONMENT: production
    substituteFrom:
      - kind: ConfigMap
        name: cluster-settings
```

## Shared Resources with Sources

Define Helm repositories and OCI sources in a shared location:

```yaml
# infrastructure/base/sources/helm-repositories.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jetstack
  namespace: flux-system
spec:
  interval: 24h
  url: https://charts.jetstack.io
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 24h
  url: https://kubernetes.github.io/ingress-nginx
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 24h
  url: https://prometheus-community.github.io/helm-charts
```

## Handling Secrets

Store encrypted secrets alongside the configurations they belong to:

```
infrastructure/
├── base/
│   └── external-secrets/
│       ├── kustomization.yaml
│       ├── namespace.yaml
│       └── helmrelease.yaml
├── production/
│   ├── kustomization.yaml
│   └── secrets/
│       └── cluster-secrets.enc.yaml
```

```yaml
# infrastructure/production/secrets/cluster-secrets.enc.yaml
# This file is encrypted with SOPS
apiVersion: v1
kind: Secret
metadata:
  name: cluster-secrets
  namespace: flux-system
type: Opaque
stringData:
  DATABASE_URL: ENC[AES256_GCM,data:...,type:str]
  API_KEY: ENC[AES256_GCM,data:...,type:str]
```

Enable SOPS decryption in the Kustomization:

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/production
  prune: true
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Validation and CI

Add a validation script to your monorepo:

```bash
#!/bin/bash
# scripts/validate.sh
# Validates all kustomize builds in the repository

set -euo pipefail

echo "Validating kustomize builds..."

# Find all directories containing kustomization.yaml
DIRS=$(find . -name "kustomization.yaml" -not -path "./clusters/*/flux-system/*" \
  -exec dirname {} \; | sort -u)

ERRORS=0

for dir in $DIRS; do
  echo "Building: $dir"
  if ! kustomize build "$dir" > /dev/null 2>&1; then
    echo "FAIL: $dir"
    kustomize build "$dir" 2>&1 | tail -5
    ERRORS=$((ERRORS + 1))
  else
    echo "OK: $dir"
  fi
done

if [ $ERRORS -gt 0 ]; then
  echo "Validation failed with $ERRORS errors"
  exit 1
fi

echo "All kustomize builds passed"
```

## Best Practices

1. **Layer dependencies clearly** - Infrastructure should be independent of apps. Apps depend on infrastructure.
2. **Use base and overlays** - Keep common configurations in `base/` and environment-specific changes in overlays.
3. **Limit directory depth** - Keep the structure shallow (3-4 levels deep maximum) for readability.
4. **Use CODEOWNERS** - Define code owners for different directories to control review requirements.
5. **Validate in CI** - Run `kustomize build` on all paths in your CI pipeline before merging.
6. **Document the structure** - Keep a top-level diagram showing the relationships between directories.
7. **Use branch protection** - Protect the main branch and require reviews for production changes.

## Conclusion

A well-structured monorepo provides a unified, auditable, and manageable approach to GitOps with Flux CD. By separating concerns into clusters, infrastructure, and applications layers, and using base/overlay patterns for environment-specific customization, you can maintain clarity even as your platform grows. The key is to establish conventions early and enforce them through CI validation and code review.
