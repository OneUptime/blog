# How to Use Apps and Infrastructure Separation in Flux Repository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Repository Structure, Best Practices, Infrastructure

Description: Learn why and how to separate application and infrastructure manifests in your Flux GitOps repository for better dependency management.

---

Separating applications from infrastructure in your Flux repository is one of the most impactful organizational decisions you can make. Infrastructure components like ingress controllers, certificate managers, and monitoring stacks need to be deployed before applications that depend on them. Flux provides built-in dependency management through the `dependsOn` field to enforce this ordering.

This guide explains how to implement and maintain a clean separation between apps and infrastructure.

## Why Separate Apps and Infrastructure

Infrastructure components are shared services that multiple applications depend on. Deploying an application before its required infrastructure is ready leads to failures. For example, an application with an Ingress resource will fail if the ingress controller is not yet installed.

Separating them provides:

- Clear dependency ordering through Flux Kustomization dependencies
- Different reconciliation intervals (infrastructure changes less frequently)
- Separate access controls (platform team manages infrastructure, development teams manage apps)
- Easier troubleshooting by isolating concerns

## Directory Structure

```
fleet-repo/
  clusters/
    production/
      flux-system/
      infrastructure.yaml
      apps.yaml
  infrastructure/
    sources/
      helm-repositories.yaml
      git-repositories.yaml
      oci-repositories.yaml
      kustomization.yaml
    configs/
      namespaces.yaml
      cluster-issuers.yaml
      kustomization.yaml
    controllers/
      cert-manager/
        helmrelease.yaml
        namespace.yaml
        kustomization.yaml
      ingress-nginx/
        helmrelease.yaml
        namespace.yaml
        kustomization.yaml
      external-secrets/
        helmrelease.yaml
        namespace.yaml
        kustomization.yaml
      monitoring/
        kube-prometheus-stack/
          helmrelease.yaml
          kustomization.yaml
        kustomization.yaml
      kustomization.yaml
    kustomization.yaml
  apps/
    app-one/
      deployment.yaml
      service.yaml
      ingress.yaml
      kustomization.yaml
    app-two/
      deployment.yaml
      service.yaml
      kustomization.yaml
    kustomization.yaml
```

## Infrastructure Kustomization

The infrastructure Kustomization is defined in the cluster entry point:

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 30m
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
```

The `wait: true` setting is critical. It ensures Flux waits for all infrastructure resources to become ready before signaling completion. Without it, the apps Kustomization might start reconciling before infrastructure is actually available.

## Apps Kustomization

The apps Kustomization depends on infrastructure:

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure
```

The `dependsOn` field creates a hard dependency. Apps will not reconcile until infrastructure reports as ready.

## Organizing Infrastructure Layers

Within infrastructure, organize by function:

### Sources

All HelmRepository, GitRepository, and OCIRepository resources belong here:

```yaml
# infrastructure/sources/helm-repositories.yaml
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

### Controllers

Each controller gets its own directory with all required resources:

```yaml
# infrastructure/controllers/cert-manager/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager
```

```yaml
# infrastructure/controllers/cert-manager/helmrelease.yaml
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
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    installCRDs: true
```

### Configs

Cluster-wide configurations that depend on controllers:

```yaml
# infrastructure/configs/cluster-issuers.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-production
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@example.com
    privateKeySecretRef:
      name: letsencrypt-production
    solvers:
      - http01:
          ingress:
            class: nginx
```

## Multi-Layer Dependencies

For more granular control, split infrastructure into multiple Kustomizations:

```yaml
# clusters/production/infra-sources.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-sources
  namespace: flux-system
spec:
  interval: 30m
  path: ./infrastructure/sources
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system

---
# clusters/production/infra-controllers.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-controllers
  namespace: flux-system
spec:
  interval: 30m
  path: ./infrastructure/controllers
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infra-sources
  wait: true

---
# clusters/production/infra-configs.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-configs
  namespace: flux-system
spec:
  interval: 30m
  path: ./infrastructure/configs
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infra-controllers

---
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infra-configs
```

This creates a chain: sources then controllers then configs then apps. Each layer waits for the previous one to be ready.

## Conclusion

Separating apps and infrastructure in your Flux repository is a foundational best practice. It provides clear dependency ordering, allows different reconciliation strategies for different concerns, and makes your GitOps repository easier to navigate and maintain. As your cluster grows, this separation scales naturally by adding new controllers to the infrastructure layer and new applications to the apps layer without reorganizing the entire repository.
