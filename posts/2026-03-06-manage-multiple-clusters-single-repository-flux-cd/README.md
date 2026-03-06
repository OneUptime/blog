# How to Manage Multiple Clusters from a Single Repository with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Cluster, Fleet Management, Centralized management

Description: Learn how to manage multiple Kubernetes clusters from a single Git repository using Flux CD with cluster-specific configurations and shared components.

---

## Introduction

As organizations grow, the number of Kubernetes clusters increases. You may have separate clusters for development, staging, and production, or clusters in different regions, or clusters for different teams. Managing each cluster's configuration in a separate repository quickly becomes unmanageable. Flux CD enables you to manage all clusters from a single repository while maintaining per-cluster customization.

This guide walks through the patterns and practices for multi-cluster management with a single Flux CD repository.

## Why a Single Repository?

Managing multiple clusters from one repository provides:

- A single source of truth for all cluster configurations
- Easy comparison of what is deployed across clusters
- Centralized change management through pull requests
- Reduced repository sprawl and simpler access control
- Consistent infrastructure across all clusters

## Repository Structure

```text
fleet-repo/
├── base/
│   ├── infrastructure/
│   │   ├── kustomization.yaml
│   │   ├── cert-manager/
│   │   ├── ingress-nginx/
│   │   └── monitoring/
│   └── apps/
│       ├── kustomization.yaml
│       ├── api-server/
│       └── web-frontend/
├── clusters/
│   ├── dev-us-east/
│   │   ├── flux-system/
│   │   │   ├── gotk-components.yaml
│   │   │   ├── gotk-sync.yaml
│   │   │   └── kustomization.yaml
│   │   ├── infrastructure.yaml
│   │   └── apps.yaml
│   ├── staging-us-east/
│   │   ├── flux-system/
│   │   ├── infrastructure.yaml
│   │   └── apps.yaml
│   ├── prod-us-east/
│   │   ├── flux-system/
│   │   ├── infrastructure.yaml
│   │   └── apps.yaml
│   └── prod-eu-west/
│       ├── flux-system/
│       ├── infrastructure.yaml
│       └── apps.yaml
└── overlays/
    ├── dev/
    │   ├── infrastructure/
    │   │   ├── kustomization.yaml
    │   │   └── patches/
    │   └── apps/
    │       ├── kustomization.yaml
    │       └── patches/
    ├── staging/
    │   ├── infrastructure/
    │   └── apps/
    ├── prod-us-east/
    │   ├── infrastructure/
    │   └── apps/
    └── prod-eu-west/
        ├── infrastructure/
        └── apps/
```

## How Flux Bootstraps Each Cluster

Each cluster gets its own bootstrap configuration that points Flux to the correct path in the repository.

```bash
# Bootstrap the development cluster
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-repo \
  --branch=main \
  --path=clusters/dev-us-east \
  --personal

# Bootstrap the production US East cluster
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-repo \
  --branch=main \
  --path=clusters/prod-us-east \
  --personal

# Bootstrap the production EU West cluster
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-repo \
  --branch=main \
  --path=clusters/prod-eu-west \
  --personal
```

Each cluster only reconciles the manifests under its own `clusters/<name>/` path, but those manifests can reference shared resources elsewhere in the repository.

## Shared Base Configuration

Define shared infrastructure and application manifests in the base directory.

```yaml
# base/infrastructure/kustomization.yaml
# Shared infrastructure components
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - cert-manager/
  - ingress-nginx/
  - monitoring/
```

```yaml
# base/infrastructure/cert-manager/helmrelease.yaml
# cert-manager with default settings for all clusters
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 30m
  chart:
    spec:
      chart: cert-manager
      version: "1.14.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  install:
    crds: CreateReplace
  upgrade:
    crds: CreateReplace
  values:
    replicaCount: 2
    prometheus:
      enabled: true
```

```yaml
# base/apps/kustomization.yaml
# Shared application manifests
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - api-server/
  - web-frontend/
```

```yaml
# base/apps/api-server/deployment.yaml
# Base API server deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  labels:
    app: api-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api-server
          image: myorg/api-server:v3.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 400m
              memory: 512Mi
```

## Cluster-Specific Overlays

Each cluster has its own overlay that customizes the base manifests.

```yaml
# overlays/dev/apps/kustomization.yaml
# Development overlay - minimal replicas, debug logging
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../base/apps
patches:
  - path: patches/api-server-dev.yaml
  - path: patches/web-frontend-dev.yaml
```

```yaml
# overlays/dev/apps/patches/api-server-dev.yaml
# Development: 1 replica, debug mode, lower resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: api-server
          env:
            - name: LOG_LEVEL
              value: "debug"
            - name: ENVIRONMENT
              value: "development"
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
```

```yaml
# overlays/prod-us-east/apps/kustomization.yaml
# Production US East overlay - full scale, production settings
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../base/apps
patches:
  - path: patches/api-server-prod.yaml
```

```yaml
# overlays/prod-us-east/apps/patches/api-server-prod.yaml
# Production US East: high replicas, production endpoints
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 10
  template:
    spec:
      containers:
        - name: api-server
          env:
            - name: LOG_LEVEL
              value: "warn"
            - name: ENVIRONMENT
              value: "production"
            - name: DATABASE_HOST
              value: "db.us-east.prod.internal"
            - name: CACHE_HOST
              value: "redis.us-east.prod.internal"
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
```

```yaml
# overlays/prod-eu-west/apps/patches/api-server-prod.yaml
# Production EU West: similar to US East but with EU-specific endpoints
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 8
  template:
    spec:
      containers:
        - name: api-server
          env:
            - name: LOG_LEVEL
              value: "warn"
            - name: ENVIRONMENT
              value: "production"
            - name: DATABASE_HOST
              value: "db.eu-west.prod.internal"
            - name: CACHE_HOST
              value: "redis.eu-west.prod.internal"
            - name: GDPR_MODE
              value: "enabled"
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
```

## Wiring Cluster Configurations

Each cluster directory contains Flux Kustomization resources that point to the appropriate overlay.

```yaml
# clusters/dev-us-east/infrastructure.yaml
# Development cluster infrastructure
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
  path: ./overlays/dev/infrastructure
  prune: true
  timeout: 5m
```

```yaml
# clusters/dev-us-east/apps.yaml
# Development cluster applications
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  dependsOn:
    - name: infrastructure
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./overlays/dev/apps
  prune: true
  timeout: 5m
```

```yaml
# clusters/prod-us-east/infrastructure.yaml
# Production US East infrastructure
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
  path: ./overlays/prod-us-east/infrastructure
  prune: true
  timeout: 10m
```

```yaml
# clusters/prod-us-east/apps.yaml
# Production US East applications with health checks
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  dependsOn:
    - name: infrastructure
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./overlays/prod-us-east/apps
  prune: true
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: api-server
      namespace: default
    - apiVersion: apps/v1
      kind: Deployment
      name: web-frontend
      namespace: default
```

## Handling Cluster-Specific Secrets

Use SOPS or Sealed Secrets for cluster-specific secrets.

```yaml
# overlays/prod-us-east/apps/secrets/database-credentials.yaml
# Encrypted with SOPS - only the production cluster can decrypt
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: default
type: Opaque
stringData:
  username: ENC[AES256_GCM,data:...,type:str]
  password: ENC[AES256_GCM,data:...,type:str]
sops:
  kms:
    - arn: arn:aws:kms:us-east-1:123456789:key/abc-def
```

Enable SOPS decryption in the Flux Kustomization:

```yaml
# clusters/prod-us-east/apps.yaml
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
  path: ./overlays/prod-us-east/apps
  prune: true
  # Enable SOPS decryption for encrypted secrets
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Cross-Cluster Comparison

One of the key benefits of a single repository is easy cross-cluster comparison.

```bash
# Compare what differs between production clusters
diff <(kustomize build overlays/prod-us-east/apps) \
     <(kustomize build overlays/prod-eu-west/apps)

# Check image versions across all clusters
grep -r "image:" overlays/*/apps/patches/

# View all cluster-specific patches
find overlays/ -name "*.yaml" -path "*/patches/*" | sort

# Check reconciliation status across clusters (requires kubeconfig contexts)
for ctx in dev-us-east staging-us-east prod-us-east prod-eu-west; do
  echo "=== $ctx ==="
  kubectl --context "$ctx" -n flux-system get kustomizations
done
```

## Scaling to Many Clusters

As the number of clusters grows, consider organizing overlays by tier.

```text
overlays/
├── tier-dev/
│   └── ... (shared dev overlay)
├── tier-staging/
│   └── ... (shared staging overlay)
├── tier-prod/
│   ├── base/
│   │   └── ... (shared prod overlay)
│   ├── us-east/
│   │   └── ... (region-specific patches on top of prod base)
│   └── eu-west/
│       └── ... (region-specific patches on top of prod base)
```

This adds another layer of Kustomize overlays but keeps the configuration DRY even as cluster count grows.

## Best Practices

### Use Descriptive Cluster Names

Name your cluster directories with enough context to identify the environment, region, and purpose (for example `prod-us-east` not `cluster-1`).

### Keep Base Manifests Stable

The base directory should change infrequently. Most changes should happen in overlays. This keeps the blast radius of base changes predictable.

### Use Health Checks on Production Clusters

Always add health checks to production Kustomizations so Flux can detect failed deployments and report them.

### Implement Progressive Rollout

When making changes that affect all clusters, update overlays in order: dev first, then staging, then production clusters one at a time.

### Monitor Repository Size

As the repository grows with many clusters, monitor its size. Large repositories can slow down Flux's Git operations. Consider splitting into separate repositories if the repository exceeds a few hundred megabytes.

### Protect the Clusters Directory

Use CODEOWNERS or branch protection rules to require reviews for changes to the `clusters/` directory, since these changes directly affect live environments.

## Conclusion

Managing multiple Kubernetes clusters from a single Git repository with Flux CD is a powerful approach that scales well when organized properly. By using a base-overlay pattern with per-cluster Kustomize overlays, you maintain consistency while allowing per-cluster customization. The key is to establish clear directory conventions, use dependency ordering, and implement proper access controls to ensure changes are reviewed before reaching production.
