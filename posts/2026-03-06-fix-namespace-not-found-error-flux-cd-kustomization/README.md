# How to Fix "namespace not found" Error in Flux CD Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kustomization, Namespaces, Dependencies, GitOps, Troubleshooting, Kubernetes

Description: A practical guide to resolving "namespace not found" errors in Flux CD Kustomizations by setting up proper dependency ordering and namespace creation strategies.

---

## Introduction

When Flux CD tries to apply resources to a namespace that does not yet exist, you get a "namespace not found" error. This is a common ordering problem in GitOps workflows where resources and their namespaces are managed declaratively. Flux may try to create a Deployment or Service before the target namespace has been created. This guide covers how to properly handle namespace creation ordering in Flux CD.

## Identifying the Error

Check the Kustomization status:

```bash
# List Kustomizations and look for failures
kubectl get kustomizations -A

# Get the detailed error message
kubectl describe kustomization <name> -n flux-system
```

The error typically looks like:

```
Status:
  Conditions:
    - Type: Ready
      Status: "False"
      Reason: ReconciliationFailed
      Message: 'namespace "my-app" not found'
```

Or in the kustomize-controller logs:

```bash
kubectl logs -n flux-system deploy/kustomize-controller --tail=50
```

```
failed to apply resources: namespaces "my-app" not found
```

## Cause 1: Namespace Not Included in Kustomization

The simplest cause is that the namespace manifest is not included in the Kustomization path.

### Fix: Include the Namespace in Your Kustomization

Add the namespace YAML to your kustomization directory:

```yaml
# apps/my-app/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
  labels:
    # Useful labels for identification
    app.kubernetes.io/managed-by: flux
    app.kubernetes.io/part-of: my-app
```

Make sure it is referenced in your kustomization.yaml:

```yaml
# apps/my-app/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  # Namespace must be listed first
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - configmap.yaml
```

## Cause 2: Namespace Managed by a Different Kustomization

When namespaces are managed separately from the applications that use them, ordering becomes critical. If the app Kustomization reconciles before the namespace Kustomization, you get the error.

### Fix: Use Flux Kustomization Dependencies

Set up explicit dependencies between your Flux Kustomizations so that namespaces are created first.

#### Step 1: Create a Namespace Kustomization

```yaml
# clusters/my-cluster/namespaces.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: namespaces
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/namespaces
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Short interval ensures namespaces are created quickly
  timeout: 2m
```

#### Step 2: Create the Namespace Manifests

```yaml
# infrastructure/namespaces/my-app-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app

---
# infrastructure/namespaces/monitoring-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring

---
# infrastructure/namespaces/database-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: database
```

```yaml
# infrastructure/namespaces/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - my-app-namespace.yaml
  - monitoring-namespace.yaml
  - database-namespace.yaml
```

#### Step 3: Add Dependencies to Application Kustomizations

```yaml
# clusters/my-cluster/my-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Wait for namespaces to be created first
  dependsOn:
    - name: namespaces
  # Target namespace for resources that do not specify one
  targetNamespace: my-app
```

## Cause 3: Dependency Chain Not Properly Configured

Even with dependencies, if the chain is not correctly wired, namespace creation may not complete before dependent resources are applied.

### Fix: Set Up a Multi-Layer Dependency Chain

A common pattern is infrastructure, then namespaces, then applications:

```yaml
# clusters/my-cluster/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/controllers
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # No dependencies - this runs first
```

```yaml
# clusters/my-cluster/infrastructure-config.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure-config
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/config
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Depends on infrastructure controllers being ready
  dependsOn:
    - name: infrastructure
```

```yaml
# clusters/my-cluster/apps.yaml
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
  # Depends on both infrastructure layers being ready
  dependsOn:
    - name: infrastructure
    - name: infrastructure-config
```

## Cause 4: Using targetNamespace Without Creating It

The `targetNamespace` field in a Flux Kustomization overrides the namespace for all resources, but does not create the namespace itself.

### Fix: Create the Namespace Before Using targetNamespace

```yaml
# Option A: Include namespace creation in a dependency
# clusters/my-cluster/namespaces.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-namespaces
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/namespaces
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

```yaml
# clusters/my-cluster/my-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: my-app
  dependsOn:
    # Ensure the namespace exists before applying resources
    - name: app-namespaces
```

## Cause 5: Race Condition During Initial Bootstrap

During the first bootstrap of a cluster, all Kustomizations may start reconciling at the same time, causing race conditions even with dependencies.

### Fix: Use Health Checks to Gate Dependencies

```yaml
# clusters/my-cluster/namespaces.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: namespaces
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/namespaces
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Health checks ensure the namespace is truly ready
  healthChecks:
    - apiVersion: v1
      kind: Namespace
      name: my-app
    - apiVersion: v1
      kind: Namespace
      name: monitoring
  # Wait up to 3 minutes for namespaces to be ready
  timeout: 3m
```

```yaml
# clusters/my-cluster/my-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    # This dependency now waits for health checks to pass
    - name: namespaces
```

## Recommended Repository Structure

Here is a recommended directory structure that avoids namespace ordering issues:

```
repository/
  clusters/
    my-cluster/
      flux-system/          # Flux bootstrap components
      namespaces.yaml       # Kustomization for namespaces (no dependencies)
      infrastructure.yaml   # Kustomization for infra (depends on namespaces)
      apps.yaml             # Kustomization for apps (depends on infrastructure)
  infrastructure/
    namespaces/
      kustomization.yaml
      production.yaml       # All production namespaces
    controllers/
      kustomization.yaml
      cert-manager/
      ingress-nginx/
  apps/
    my-app/
      kustomization.yaml
      deployment.yaml
      service.yaml
```

## Quick Troubleshooting Commands

```bash
# 1. Check if the namespace exists
kubectl get namespace my-app

# 2. Check Kustomization dependencies
kubectl get kustomization -n flux-system -o custom-columns=NAME:.metadata.name,DEPENDS:.spec.dependsOn

# 3. Check which Kustomization manages namespaces
flux get kustomizations

# 4. Manually create the namespace as a temporary fix
kubectl create namespace my-app

# 5. Force reconciliation in dependency order
flux reconcile kustomization namespaces
flux reconcile kustomization my-app

# 6. Check for dependency status
kubectl get kustomization namespaces -n flux-system -o jsonpath='{.status.conditions[0]}'
```

## Summary

The "namespace not found" error in Flux CD is fundamentally an ordering problem. The solution is to ensure namespaces are created before the resources that depend on them. The best approach is to manage namespaces in a dedicated Kustomization with no dependencies, then use `dependsOn` in your application Kustomizations to wait for namespace creation. Adding health checks to the namespace Kustomization provides an extra layer of safety against race conditions during initial bootstrap or cluster recovery.
