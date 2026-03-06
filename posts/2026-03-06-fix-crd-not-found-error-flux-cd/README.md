# How to Fix 'CRD not found' Error in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, CRD, CustomResourceDefinition, Kubernetes, Troubleshooting, GitOps, Kustomization

Description: A practical guide to resolving 'CRD not found' errors in Flux CD by configuring proper installation ordering and dependencies between Kustomizations.

---

## Introduction

The "CRD not found" error is a common ordering problem in Flux CD deployments. It occurs when Flux tries to apply a custom resource before the Custom Resource Definition (CRD) that defines it has been installed. This is a classic chicken-and-egg problem in Kubernetes: you cannot create an instance of a custom resource if its definition does not yet exist.

This guide covers how to diagnose this error and configure Flux CD to install CRDs before the resources that depend on them.

## Understanding the Error

When Flux encounters this error, the Kustomization status will show something like:

```bash
# Check the Kustomization status
kubectl get kustomization -n flux-system my-app -o yaml
```

```yaml
status:
  conditions:
    - type: Ready
      status: "False"
      reason: ReconciliationFailed
      message: |
        no matches for kind "Certificate" in version "cert-manager.io/v1"
```

This means Flux tried to apply a `Certificate` resource, but the cert-manager CRDs were not installed yet.

## Common Cause 1: Missing dependsOn Configuration

The most frequent cause is that the Kustomization applying custom resources does not declare a dependency on the Kustomization that installs the CRDs.

### Example of Incorrect Configuration

```yaml
---
# This Kustomization installs cert-manager (which includes CRDs)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
# Wrong: this Kustomization uses cert-manager CRDs but has no dependency
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: certificates
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/certificates
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Missing dependsOn - Flux may try to apply certificates
  # before cert-manager CRDs are installed
```

### Fix: Add dependsOn

```yaml
---
# Kustomization that installs cert-manager and its CRDs
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
# Fixed: declares dependency on cert-manager
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: certificates
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/certificates
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # This ensures cert-manager is fully reconciled before
  # Flux attempts to apply certificate resources
  dependsOn:
    - name: cert-manager
```

## Common Cause 2: CRDs Bundled in a HelmRelease

When CRDs are installed via a HelmRelease (e.g., cert-manager, Prometheus Operator), you need to ensure the HelmRelease is fully reconciled before applying resources that use those CRDs.

### Diagnosing the Issue

```bash
# Check if the HelmRelease that installs CRDs is ready
kubectl get helmrelease -n cert-manager cert-manager

# Check if the CRDs actually exist
kubectl get crd | grep cert-manager

# List all CRDs to see what is available
kubectl get crd
```

### Fix: Chain Dependencies Through HelmRelease

```yaml
---
# Step 1: Install cert-manager via HelmRelease
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Wait for the HelmRelease to be healthy
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: cert-manager
      namespace: cert-manager
---
# Step 2: Apply certificates only after cert-manager is healthy
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: certificates
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/certificates
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: cert-manager
```

## Common Cause 3: CRDs Installed Separately from the Operator

Some projects recommend installing CRDs separately from the operator. This requires a two-step Kustomization setup.

### Example: Separating CRD Installation

```yaml
---
# Step 1: Install CRDs first
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: prometheus-crds
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/prometheus/crds
  prune: false
  # Important: do not prune CRDs as this would delete all
  # custom resources that depend on them
  sourceRef:
    kind: GitRepository
    name: flux-system
---
# Step 2: Install the operator after CRDs are ready
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: prometheus-operator
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/prometheus/operator
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: prometheus-crds
---
# Step 3: Create custom resources after the operator is running
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: prometheus-config
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/prometheus/config
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: prometheus-operator
```

## Common Cause 4: Race Condition During Initial Bootstrap

During the initial Flux bootstrap, all Kustomizations are created at the same time. Even with `dependsOn`, there can be timing issues if the CRD installation takes longer than expected.

### Fix: Add Health Checks and Retry

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Add a timeout to allow CRDs to fully register
  timeout: 5m
  # Health checks ensure the Kustomization is not considered
  # ready until these resources are healthy
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager
      namespace: cert-manager
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager-webhook
      namespace: cert-manager
  # Retry configuration for transient failures
  retryInterval: 1m
```

## Building a Dependency Chain

For complex deployments, you can build a multi-level dependency chain:

```yaml
---
# Level 1: Infrastructure CRDs
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crds
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/crds
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
---
# Level 2: Infrastructure controllers (depend on CRDs)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: controllers
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/controllers
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: crds
---
# Level 3: Infrastructure configuration (depends on controllers)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: config
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/config
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: controllers
---
# Level 4: Applications (depend on all infrastructure)
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
    - name: config
```

## Debugging Workflow

```bash
# Step 1: Identify which CRD is missing
kubectl get kustomization -n flux-system -o yaml | grep "no matches"

# Step 2: Check if the CRD exists in the cluster
kubectl get crd | grep <expected-crd-group>

# Step 3: Check the status of the Kustomization that should install the CRD
kubectl get kustomization -n flux-system <crd-kustomization> -o yaml

# Step 4: Check the dependency chain
flux tree kustomization my-app -n flux-system

# Step 5: Force reconciliation of the CRD Kustomization first
flux reconcile kustomization crds -n flux-system

# Step 6: Then reconcile the dependent Kustomization
flux reconcile kustomization my-app -n flux-system

# Step 7: Check kustomize-controller logs
kubectl logs -n flux-system deploy/kustomize-controller --tail=100 | grep "my-app"
```

## Important Notes on CRD Pruning

Never enable pruning for CRDs unless you are intentionally removing them:

```yaml
spec:
  # Setting prune to false for CRDs prevents Flux from
  # deleting CRDs when they are removed from the source.
  # Deleting a CRD also deletes all custom resources of that type.
  prune: false
```

If you must prune CRDs, use the `kustomize.toolkit.fluxcd.io/prune: disabled` annotation on individual CRDs:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: certificates.cert-manager.io
  annotations:
    # Prevent Flux from pruning this CRD even if prune is enabled
    kustomize.toolkit.fluxcd.io/prune: disabled
```

## Conclusion

The "CRD not found" error in Flux CD is fundamentally an ordering problem. The fix is always to ensure CRDs are installed and fully registered before any custom resources that depend on them are applied. Use `dependsOn` to establish clear dependency chains, add health checks to verify controllers are running, and never enable pruning on CRDs unless you have a specific reason. For complex deployments, structure your Kustomizations in layers: CRDs first, then controllers, then configuration, and finally applications.
