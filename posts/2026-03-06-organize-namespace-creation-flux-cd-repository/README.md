# How to Organize Namespace Creation in a Flux CD Repository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, gitops, kubernetes, namespaces, resource organization, multi-tenancy

Description: Learn how to organize and manage Kubernetes namespace creation in your Flux CD repository with proper labeling, resource quotas, and dependency ordering.

---

## Introduction

Namespaces are the foundation of resource isolation in Kubernetes. In a GitOps workflow with Flux CD, namespaces need to exist before any resources can be deployed into them. Getting namespace management right is critical for avoiding deployment failures and maintaining a well-organized cluster.

This guide covers several strategies for organizing namespace creation in your Flux CD repository, from simple approaches to advanced multi-tenant setups.

## The Namespace Ordering Problem

Flux CD applies resources from a Kustomization in a specific order, but if a namespace does not exist when Flux tries to create a resource in it, the deployment fails:

```
Error: namespaces "monitoring" not found
```

There are several ways to handle this, and this guide covers them all.

## Repository Structure

```
fleet-repo/
├── namespaces/
│   ├── kustomization.yaml
│   ├── development.yaml
│   ├── staging.yaml
│   ├── production.yaml
│   ├── monitoring.yaml
│   ├── ingress-nginx.yaml
│   └── cert-manager.yaml
├── resource-quotas/
│   ├── kustomization.yaml
│   ├── development-quota.yaml
│   ├── staging-quota.yaml
│   └── production-quota.yaml
├── network-policies/
│   ├── kustomization.yaml
│   ├── default-deny.yaml
│   └── allow-dns.yaml
├── infrastructure/
│   └── ...
├── apps/
│   └── ...
└── clusters/
    └── production/
        └── flux-config.yaml
```

## Strategy 1: Dedicated Namespace Kustomization

The cleanest approach is to create all namespaces in a dedicated Flux Kustomization that runs before everything else.

```yaml
# namespaces/kustomization.yaml
# All namespaces managed by this cluster
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - development.yaml
  - staging.yaml
  - production.yaml
  - monitoring.yaml
  - ingress-nginx.yaml
  - cert-manager.yaml
```

```yaml
# namespaces/monitoring.yaml
# Monitoring namespace with standard labels
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    app.kubernetes.io/managed-by: flux
    purpose: observability
    team: platform
```

```yaml
# namespaces/production.yaml
# Production namespace with pod security standards
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    app.kubernetes.io/managed-by: flux
    purpose: workloads
    environment: production
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

```yaml
# namespaces/cert-manager.yaml
# cert-manager namespace
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager
  labels:
    app.kubernetes.io/managed-by: flux
    purpose: infrastructure
```

Wire it into your Flux configuration with dependency ordering:

```yaml
# clusters/production/flux-config.yaml
# Layer 1: Create all namespaces first
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: namespaces
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./namespaces
  prune: false
  # Never prune namespaces to avoid accidental data loss
  timeout: 2m
---
# Layer 2: Infrastructure depends on namespaces
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  dependsOn:
    - name: namespaces
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./infrastructure
  prune: true
---
# Layer 3: Apps depend on infrastructure
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
    name: fleet-repo
  path: ./apps
  prune: true
```

## Strategy 2: Colocated Namespaces

An alternative is to colocate namespace manifests with the resources that use them.

```
fleet-repo/
├── infrastructure/
│   ├── cert-manager/
│   │   ├── kustomization.yaml
│   │   ├── namespace.yaml      # Namespace defined alongside its resources
│   │   └── helmrelease.yaml
│   └── monitoring/
│       ├── kustomization.yaml
│       ├── namespace.yaml      # Namespace defined alongside its resources
│       └── helmrelease.yaml
└── apps/
    └── api-server/
        ├── kustomization.yaml
        ├── namespace.yaml
        └── deployment.yaml
```

```yaml
# infrastructure/cert-manager/kustomization.yaml
# Namespace is listed first so it is created before other resources
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrelease.yaml
```

```yaml
# infrastructure/cert-manager/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager
  labels:
    app.kubernetes.io/managed-by: flux
```

## Strategy 3: Using targetNamespace with createNamespace

Flux can automatically create namespaces when using `targetNamespace`.

```yaml
# clusters/production/apps.yaml
# Flux will create the target namespace if it does not exist
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-server
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./apps/api-server
  prune: true
  targetNamespace: production
  # This annotation tells Flux to create the namespace if missing
  # Note: the namespace will not have custom labels or annotations
```

For HelmReleases, use `createNamespace`:

```yaml
# HelmRelease with automatic namespace creation
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
    # Automatically create the namespace on install
    createNamespace: true
    remediation:
      retries: 3
```

## Adding Resource Quotas to Namespaces

Resource quotas should be applied alongside namespaces to enforce resource limits from the start.

```yaml
# resource-quotas/kustomization.yaml
# Resource quotas for all managed namespaces
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - development-quota.yaml
  - staging-quota.yaml
  - production-quota.yaml
```

```yaml
# resource-quotas/development-quota.yaml
# Development namespace gets limited resources
apiVersion: v1
kind: ResourceQuota
metadata:
  name: resource-quota
  namespace: development
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "50"
    services: "20"
    persistentvolumeclaims: "10"
```

```yaml
# resource-quotas/production-quota.yaml
# Production namespace gets generous resources
apiVersion: v1
kind: ResourceQuota
metadata:
  name: resource-quota
  namespace: production
spec:
  hard:
    requests.cpu: "32"
    requests.memory: 64Gi
    limits.cpu: "64"
    limits.memory: 128Gi
    pods: "200"
    services: "50"
    persistentvolumeclaims: "50"
```

## Adding LimitRanges

LimitRanges set default resource requests and limits for pods in a namespace.

```yaml
# namespaces/limit-ranges/production-limits.yaml
# Default resource limits for pods in the production namespace
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - default:
        cpu: 200m
        memory: 256Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      type: Container
```

## Adding Default Network Policies

Apply default network policies to namespaces for security.

```yaml
# network-policies/default-deny.yaml
# Default deny all ingress traffic in managed namespaces
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

```yaml
# network-policies/allow-dns.yaml
# Allow DNS resolution for all pods in the namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to: []
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

## Bundling Namespaces with Policies

For a complete namespace setup, bundle the namespace, quota, limit range, and network policies together.

```yaml
# namespaces/production/kustomization.yaml
# Complete namespace setup with all policies
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - resource-quota.yaml
  - limit-range.yaml
  - network-policy-default-deny.yaml
  - network-policy-allow-dns.yaml
```

## Handling Namespace Deletion

Be very careful with namespace deletion in GitOps workflows.

```yaml
# CRITICAL: Set prune to false for namespaces
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: namespaces
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./namespaces
  # NEVER prune namespaces - removing a namespace deletes ALL resources in it
  prune: false
```

If you truly need to delete a namespace, do it manually after verifying all resources have been migrated:

```bash
# First, check what resources exist in the namespace
kubectl get all -n old-namespace

# Remove it from the Git repo and let Flux stop managing it
# Then manually delete it after verification
kubectl delete namespace old-namespace
```

## Verification Commands

```bash
# List all namespaces managed by Flux
kubectl get namespaces -l app.kubernetes.io/managed-by=flux

# Check resource quotas across namespaces
kubectl get resourcequotas --all-namespaces

# Check limit ranges
kubectl get limitranges --all-namespaces

# Verify namespace labels
kubectl get namespace production --show-labels

# Check Flux reconciliation status
flux get kustomization namespaces
```

## Best Practices

### Never Prune Namespaces

Always set `prune: false` on your namespace Kustomization. Accidentally pruning a namespace deletes everything inside it.

### Label Namespaces Consistently

Use standard labels for ownership, purpose, and environment. This makes filtering and reporting straightforward.

### Apply Pod Security Standards

Use Kubernetes Pod Security Standards labels on namespaces to enforce security policies at the namespace level.

### Create Namespaces Before Resources

Always ensure namespaces are created before any resources that target them by using `dependsOn` in your Flux Kustomizations.

## Conclusion

Namespace management in Flux CD requires deliberate organization to avoid ordering issues and ensure security policies are applied consistently. Whether you choose a dedicated namespace directory, colocated namespaces, or automatic namespace creation, the key is to establish the pattern early and apply it consistently across your repository. Always protect namespaces from accidental deletion by setting `prune: false` on namespace Kustomizations.
