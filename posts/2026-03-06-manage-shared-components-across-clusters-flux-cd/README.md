# How to Manage Shared Components Across Clusters with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, shared components, Multi-Cluster, Infrastructure

Description: Learn how to define and manage shared infrastructure components like monitoring, ingress, and cert-manager across multiple Kubernetes clusters using Flux CD.

---

## Introduction

In a multi-cluster Kubernetes setup, certain components are deployed to every cluster: monitoring stacks, ingress controllers, certificate managers, and policy engines. Managing these shared components individually across clusters is error-prone and time-consuming. Flux CD provides a clean way to define shared components once and deploy them consistently everywhere.

This guide shows you how to structure your Flux CD repository so shared components are defined once and reused across all clusters.

## The Problem with Duplicated Components

Without a shared component strategy, you end up with:

- Duplicated YAML across cluster directories
- Configuration drift between clusters
- Difficult upgrades when a shared tool needs updating
- Inconsistent versions of infrastructure tools

## Repository Structure for Shared Components

```text
fleet-repo/
├── infrastructure/
│   ├── sources/
│   │   ├── kustomization.yaml
│   │   ├── helm-bitnami.yaml
│   │   ├── helm-jetstack.yaml
│   │   └── helm-prometheus.yaml
│   ├── shared/
│   │   ├── kustomization.yaml
│   │   ├── cert-manager/
│   │   │   ├── kustomization.yaml
│   │   │   ├── namespace.yaml
│   │   │   └── helmrelease.yaml
│   │   ├── ingress-nginx/
│   │   │   ├── kustomization.yaml
│   │   │   ├── namespace.yaml
│   │   │   └── helmrelease.yaml
│   │   └── monitoring/
│   │       ├── kustomization.yaml
│   │       ├── namespace.yaml
│   │       └── helmrelease.yaml
│   └── cluster-specific/
│       ├── cluster-a/
│       │   └── patches/
│       └── cluster-b/
│           └── patches/
├── apps/
│   └── ...
└── clusters/
    ├── cluster-a/
    │   ├── infrastructure.yaml
    │   └── apps.yaml
    └── cluster-b/
        ├── infrastructure.yaml
        └── apps.yaml
```

## Defining Helm Repository Sources

Start by defining shared Helm repository sources that all clusters will use.

```yaml
# infrastructure/sources/kustomization.yaml
# Lists all shared Helm repository sources
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - helm-bitnami.yaml
  - helm-jetstack.yaml
  - helm-prometheus.yaml
```

```yaml
# infrastructure/sources/helm-jetstack.yaml
# Jetstack Helm repository for cert-manager charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jetstack
  namespace: flux-system
spec:
  interval: 24h
  url: https://charts.jetstack.io
```

```yaml
# infrastructure/sources/helm-prometheus.yaml
# Prometheus community Helm repository for monitoring charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 24h
  url: https://prometheus-community.github.io/helm-charts
```

## Creating Shared Component Definitions

Each shared component gets its own directory with a namespace, HelmRelease, and any additional resources.

```yaml
# infrastructure/shared/cert-manager/kustomization.yaml
# Groups all cert-manager resources together
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrelease.yaml
```

```yaml
# infrastructure/shared/cert-manager/namespace.yaml
# Dedicated namespace for cert-manager
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager
  labels:
    app.kubernetes.io/managed-by: flux
```

```yaml
# infrastructure/shared/cert-manager/helmrelease.yaml
# cert-manager HelmRelease with default values for all clusters
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
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    remediation:
      retries: 3
  values:
    # Default values shared across all clusters
    installCRDs: true
    replicaCount: 2
    prometheus:
      enabled: true
```

```yaml
# infrastructure/shared/ingress-nginx/helmrelease.yaml
# Ingress NGINX controller shared across all clusters
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  interval: 30m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.9.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  values:
    controller:
      replicaCount: 2
      metrics:
        enabled: true
      admissionWebhooks:
        enabled: true
```

```yaml
# infrastructure/shared/monitoring/helmrelease.yaml
# Prometheus monitoring stack shared across clusters
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 30m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "56.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  values:
    prometheus:
      prometheusSpec:
        retention: 7d
        resources:
          requests:
            cpu: 200m
            memory: 512Mi
    grafana:
      enabled: true
      adminPassword:
        existingSecret: grafana-admin
```

## Aggregating Shared Components

Create a top-level kustomization that pulls all shared components together.

```yaml
# infrastructure/shared/kustomization.yaml
# Aggregates all shared infrastructure components
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - cert-manager/
  - ingress-nginx/
  - monitoring/
```

## Wiring Clusters to Shared Components

Each cluster references the shared infrastructure through Flux Kustomization resources.

```yaml
# clusters/cluster-a/infrastructure.yaml
# Cluster A's infrastructure - sources first, then shared components
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-sources
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./infrastructure/sources
  prune: true
---
# Shared components depend on sources being ready
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-shared
  namespace: flux-system
spec:
  dependsOn:
    - name: infra-sources
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./infrastructure/shared
  prune: true
  timeout: 5m
```

## Applying Cluster-Specific Overrides

Some clusters may need slight variations of shared components. Use Kustomize patches for this.

```yaml
# infrastructure/cluster-specific/cluster-a/kustomization.yaml
# Cluster A needs higher replicas for ingress due to traffic volume
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../shared
patches:
  - path: patches/ingress-replicas.yaml
```

```yaml
# infrastructure/cluster-specific/cluster-a/patches/ingress-replicas.yaml
# Cluster A handles more traffic, so it needs more ingress replicas
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  values:
    controller:
      replicaCount: 5
```

Then update the cluster's Flux Kustomization to point to the cluster-specific overlay instead:

```yaml
# clusters/cluster-a/infrastructure.yaml (updated to use cluster-specific overlay)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-components
  namespace: flux-system
spec:
  dependsOn:
    - name: infra-sources
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./infrastructure/cluster-specific/cluster-a
  prune: true
```

## Version Pinning for Shared Components

Always pin chart versions in shared components to avoid unexpected upgrades.

```yaml
# Use semver ranges for controlled updates
spec:
  chart:
    spec:
      chart: cert-manager
      # Allows patch updates but not minor/major
      version: ">=1.14.0 <1.15.0"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
```

## Monitoring Shared Component Health

Check that shared components are healthy across all clusters.

```bash
# Check all HelmReleases across namespaces
flux get helmreleases --all-namespaces

# Check specific shared component status
flux get helmrelease cert-manager -n cert-manager

# Verify kustomization reconciliation
flux get kustomizations

# Suspend a shared component for maintenance
flux suspend kustomization infra-shared

# Resume after maintenance
flux resume kustomization infra-shared
```

## Best Practices

### Use dependsOn Chains

Shared components often have dependencies. For example, monitoring may need cert-manager for TLS. Use `dependsOn` to establish ordering.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring
  namespace: flux-system
spec:
  dependsOn:
    - name: cert-manager
    - name: infra-sources
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./infrastructure/shared/monitoring
  prune: true
```

### Separate Sources from Components

Keep Helm repository definitions separate from HelmReleases. This ensures sources are available before any component tries to use them.

### Test Changes in One Cluster First

When updating shared components, use Flux's suspend/resume or path-based targeting to roll out changes to a single cluster before applying them everywhere.

## Conclusion

Managing shared components with Flux CD becomes straightforward when you establish a clear directory structure. By defining components once in a shared directory and using Kustomize overlays for cluster-specific variations, you maintain consistency while retaining flexibility. The key is to keep shared definitions generic and push cluster-specific customization into overlay directories.
