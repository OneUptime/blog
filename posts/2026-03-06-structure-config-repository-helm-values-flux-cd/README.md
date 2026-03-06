# How to Structure Config Repository for Helm Values in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Helm, Helm Values, GitOps, Repository Structure, Kubernetes

Description: Learn how to organize your Git repository to manage Helm chart values effectively with Flux CD across multiple environments and applications.

---

## Introduction

When managing Kubernetes applications with Helm charts through Flux CD, the structure of your configuration repository determines how maintainable and scalable your GitOps workflow will be. A well-organized repository makes it easy to manage Helm values for multiple applications across different environments. This guide presents proven patterns for structuring your config repository for Helm values in Flux CD.

## Why Repository Structure Matters

Poor repository structure leads to:

- **Duplicated values** across environments with only minor differences
- **Difficult reviews** when changes span multiple files with no clear organization
- **Error-prone promotions** when moving configurations between environments
- **Tangled dependencies** that make it hard to understand what deploys where

A good structure provides clear separation, easy diffing between environments, and simple promotion workflows.

## Prerequisites

- A running Kubernetes cluster with Flux CD installed
- Familiarity with Helm charts and Helm values files
- `flux` and `helm` CLI tools installed locally

## Recommended Repository Layout

Here is the recommended directory structure for managing Helm values with Flux CD:

```text
fleet-repo/
  helm/
    sources/
      bitnami.yaml
      grafana.yaml
      ingress-nginx.yaml
    releases/
      nginx/
        base.yaml
        staging-values.yaml
        production-values.yaml
      prometheus/
        base.yaml
        staging-values.yaml
        production-values.yaml
      postgresql/
        base.yaml
        staging-values.yaml
        production-values.yaml
  clusters/
    staging/
      helm-releases.yaml
    production/
      helm-releases.yaml
```

## Setting Up Helm Repository Sources

Start by defining HelmRepository sources that Flux CD will use to fetch charts.

```yaml
# helm/sources/bitnami.yaml
# HelmRepository for Bitnami charts used across the organization
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 30m
  url: https://charts.bitnami.com/bitnami
  type: oci
```

```yaml
# helm/sources/ingress-nginx.yaml
# HelmRepository for the ingress-nginx controller
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 30m
  url: https://kubernetes.github.io/ingress-nginx
```

```yaml
# helm/sources/grafana.yaml
# HelmRepository for Grafana ecosystem charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 30m
  url: https://grafana.github.io/helm-charts
```

## Creating Base HelmRelease Definitions

Define a base HelmRelease for each application that contains the chart reference and common values shared across all environments.

```yaml
# helm/releases/nginx/base.yaml
# Base HelmRelease for ingress-nginx with values common to all environments
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-system
spec:
  interval: 15m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.9.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
      interval: 10m
  # Common values shared by all environments
  values:
    controller:
      # Standard annotations for all environments
      podAnnotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "10254"
      # Default metrics configuration
      metrics:
        enabled: true
        serviceMonitor:
          enabled: true
      # Standard security context
      containerSecurityContext:
        runAsUser: 101
        runAsGroup: 82
        allowPrivilegeEscalation: false
```

## Creating Environment-Specific Values Files

Create separate values files for each environment that override or extend the base.

```yaml
# helm/releases/nginx/staging-values.yaml
# Staging-specific overrides for ingress-nginx
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-system
spec:
  values:
    controller:
      # Staging uses fewer replicas to save resources
      replicaCount: 1
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 250m
          memory: 256Mi
      # Staging-specific ingress class
      ingressClassResource:
        name: nginx-staging
      # Use smaller node instances in staging
      nodeSelector:
        node-role: staging-infra
      # Staging log level is more verbose for debugging
      config:
        log-level: debug
        use-forwarded-headers: "true"
```

```yaml
# helm/releases/nginx/production-values.yaml
# Production-specific overrides for ingress-nginx
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-system
spec:
  values:
    controller:
      # Production runs with high availability
      replicaCount: 3
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
        limits:
          cpu: "1"
          memory: 1Gi
      # Production ingress class
      ingressClassResource:
        name: nginx-production
      # Use dedicated infra nodes in production
      nodeSelector:
        node-role: production-infra
      # Production uses standard log level
      config:
        log-level: warn
        use-forwarded-headers: "true"
      # Pod disruption budget for production HA
      autoscaling:
        enabled: true
        minReplicas: 3
        maxReplicas: 10
        targetCPUUtilizationPercentage: 70
```

## Using ValuesFrom for External Configuration

Flux CD HelmRelease supports loading values from ConfigMaps and Secrets, which is useful for sensitive data or dynamically generated values.

```yaml
# helm/releases/postgresql/base.yaml
# PostgreSQL HelmRelease with values loaded from multiple sources
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: postgresql
  namespace: database
spec:
  interval: 15m
  chart:
    spec:
      chart: postgresql
      version: "14.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  # Load values from external sources in order of precedence
  valuesFrom:
    # Base configuration from a ConfigMap
    - kind: ConfigMap
      name: postgresql-base-values
      valuesKey: values.yaml
    # Environment-specific overrides from another ConfigMap
    - kind: ConfigMap
      name: postgresql-env-values
      valuesKey: values.yaml
    # Sensitive values like passwords from a Secret
    - kind: Secret
      name: postgresql-credentials
      valuesKey: values.yaml
  # Inline values have the lowest precedence
  values:
    architecture: replication
    audit:
      logHostname: true
      logConnections: true
```

```yaml
# helm/releases/postgresql/credentials-configmap.yaml
# ConfigMap containing non-sensitive PostgreSQL configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgresql-base-values
  namespace: database
data:
  values.yaml: |
    primary:
      persistence:
        enabled: true
        size: 50Gi
        storageClass: gp3
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: "2"
          memory: 4Gi
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
```

## Wiring It All Together with Kustomize

Use Kustomize to compose the base and environment-specific values into a single deployment per cluster.

```yaml
# clusters/staging/kustomization.yaml
# Kustomize overlay for the staging cluster
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  # Include all Helm repository sources
  - ../../helm/sources/bitnami.yaml
  - ../../helm/sources/ingress-nginx.yaml
  - ../../helm/sources/grafana.yaml
  # Include base HelmRelease definitions
  - ../../helm/releases/nginx/base.yaml
  - ../../helm/releases/postgresql/base.yaml
patches:
  # Apply staging-specific values on top of base
  - path: ../../helm/releases/nginx/staging-values.yaml
  - path: ../../helm/releases/postgresql/staging-values.yaml
```

```yaml
# clusters/production/kustomization.yaml
# Kustomize overlay for the production cluster
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../helm/sources/bitnami.yaml
  - ../../helm/sources/ingress-nginx.yaml
  - ../../helm/sources/grafana.yaml
  - ../../helm/releases/nginx/base.yaml
  - ../../helm/releases/postgresql/base.yaml
patches:
  # Apply production-specific values on top of base
  - path: ../../helm/releases/nginx/production-values.yaml
  - path: ../../helm/releases/postgresql/production-values.yaml
```

## Flux Kustomization for Each Cluster

Create Flux Kustomization resources that point to each cluster directory.

```yaml
# clusters/staging/flux-kustomization.yaml
# Flux Kustomization that applies the staging cluster overlay
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: staging-helm-releases
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: ingress-nginx
      namespace: ingress-system
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: postgresql
      namespace: database
```

## Managing Chart Versions Across Environments

Pin chart versions explicitly and promote them through environments.

```yaml
# helm/releases/prometheus/base.yaml
# Prometheus HelmRelease with pinned chart version
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: kube-prometheus-stack
      # Pin to a specific version for reproducibility
      version: "56.6.2"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
  # Upgrade and rollback strategy
  upgrade:
    remediation:
      retries: 3
  rollback:
    cleanupOnFail: true
  values:
    prometheus:
      prometheusSpec:
        retention: 15d
        storageSpec:
          volumeClaimTemplate:
            spec:
              accessModes: ["ReadWriteOnce"]
              resources:
                requests:
                  storage: 50Gi
    alertmanager:
      enabled: true
    grafana:
      enabled: true
      adminPassword: ""
```

## Verifying the Setup

Check that all HelmReleases are reconciled correctly.

```bash
# List all HelmReleases and their status
flux get helmreleases --all-namespaces

# Check a specific HelmRelease for errors
flux get helmrelease ingress-nginx -n ingress-system

# View the rendered values that Flux applied
helm get values ingress-nginx -n ingress-system

# Check the Helm chart version installed
helm list -n ingress-system
```

## Best Practices

1. **Separate chart sources from releases**: Keep HelmRepository resources in their own directory for easy reuse.
2. **Use base plus overlay pattern**: Define common values in a base file and override per environment.
3. **Pin chart versions explicitly**: Avoid using latest or broad semver ranges in production.
4. **Store secrets externally**: Use Sealed Secrets or SOPS for sensitive Helm values rather than plain text.
5. **Use valuesFrom for dynamic values**: Load values from ConfigMaps and Secrets when they change independently of the Git repo.
6. **Keep values files small**: Only include overrides in environment-specific files, not the full values.
7. **Document value precedence**: Make it clear which values file takes priority when multiple are merged.

## Conclusion

Structuring your config repository properly is the foundation of a scalable Helm-based GitOps workflow with Flux CD. By separating Helm sources, base releases, and environment-specific overrides into a clear directory structure, you make it easy to manage, review, and promote changes across environments. Combine this structure with Kustomize overlays and Flux's valuesFrom capability to handle complex multi-environment Helm deployments cleanly.
