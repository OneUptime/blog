# How to Structure a Flux Repository for Multiple Clusters Same Region

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Repository Structure, Multi-Cluster, Kustomize

Description: Learn how to organize a Flux GitOps repository for managing multiple Kubernetes clusters within the same region.

---

When you run multiple Kubernetes clusters in the same region, you need a repository structure that shares common configuration across clusters while allowing cluster-specific customizations. This is common when you separate staging and production into different clusters or run dedicated clusters for different teams.

This guide explains how to structure your Flux repository for this scenario.

## When to Use This Pattern

This pattern is appropriate when you have:

- Two or more Kubernetes clusters in the same cloud region
- Separate clusters for different environments (staging, production) or different purposes (platform, workloads)
- Shared infrastructure components across clusters
- Cluster-specific configurations like resource limits or scaling policies

## Recommended Directory Structure

```
fleet-repo/
  clusters/
    staging/
      flux-system/
      infrastructure.yaml
      apps.yaml
    production/
      flux-system/
      infrastructure.yaml
      apps.yaml
  infrastructure/
    base/
      sources/
        kustomization.yaml
      controllers/
        cert-manager/
        ingress-nginx/
        kustomization.yaml
      kustomization.yaml
    staging/
      kustomization.yaml
    production/
      kustomization.yaml
      patches/
  apps/
    base/
      app-one/
      app-two/
      kustomization.yaml
    staging/
      kustomization.yaml
    production/
      kustomization.yaml
      patches/
```

## Cluster Entry Points

Each cluster has its own entry point directory:

```yaml
# clusters/staging/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
```

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
```

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure
```

## Shared Infrastructure Base

The infrastructure base contains configuration common to all clusters:

```yaml
# infrastructure/base/sources/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - helmrepositories.yaml
```

```yaml
# infrastructure/base/controllers/cert-manager/helmrelease.yaml
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
  values:
    installCRDs: true
    replicaCount: 1
```

## Cluster-Specific Overlays

The production overlay increases replicas and resource limits:

```yaml
# infrastructure/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - path: patches/cert-manager-ha.yaml
```

```yaml
# infrastructure/production/patches/cert-manager-ha.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  values:
    replicaCount: 3
    podDisruptionBudget:
      enabled: true
      minAvailable: 1
```

The staging overlay uses the base as-is:

```yaml
# infrastructure/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
```

## Application Overlays

The same pattern applies to applications:

```yaml
# apps/base/app-one/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-one
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app-one
  template:
    metadata:
      labels:
        app: app-one
    spec:
      containers:
        - name: app-one
          image: app-one:latest
```

```yaml
# apps/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - path: patches/replicas.yaml
    target:
      kind: Deployment
images:
  - name: app-one
    newTag: "1.5.0"
```

## Bootstrapping Multiple Clusters

Bootstrap each cluster pointing to its own path:

```bash
# Bootstrap staging cluster
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-repo \
  --branch=main \
  --path=./clusters/staging \
  --context=staging-cluster

# Bootstrap production cluster
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-repo \
  --branch=main \
  --path=./clusters/production \
  --context=production-cluster
```

Each cluster watches the same repository but only reconciles the resources defined under its own path.

## Using Variable Substitution for Cluster Identity

Inject cluster-specific values using postBuild substitution:

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      CLUSTER_NAME: production
      REGION: us-east-1
      ENVIRONMENT: prod
```

## Shared Secrets Management

For secrets that differ between clusters, use SOPS encryption with per-cluster keys:

```yaml
# clusters/production/sops-config.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

Each cluster has its own SOPS key, so secrets are decrypted only on the intended cluster.

## Conclusion

Managing multiple clusters in the same region with a single Flux repository requires a clean separation between shared base configurations and cluster-specific overlays. The structure presented here uses Kustomize overlays to minimize duplication while giving each cluster the flexibility to customize infrastructure and application settings. By bootstrapping each cluster with its own path, you maintain clear boundaries while benefiting from a single source of truth.
