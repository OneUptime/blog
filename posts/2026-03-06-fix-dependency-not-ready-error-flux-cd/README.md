# How to Fix "dependency not ready" Error in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, dependency not ready, kustomization, helmrelease, troubleshooting, kubernetes, gitops

Description: A practical guide to resolving "dependency not ready" errors in Flux CD by fixing dependency ordering, circular dependencies, and failed upstream resources.

---

## Introduction

Flux CD supports dependency ordering between Kustomizations and HelmReleases using the `dependsOn` field. When an upstream dependency is not in a ready state, Flux reports a "dependency not ready" error on the downstream resource. This guide shows you how to diagnose the failing dependency and fix the ordering to get your deployments flowing again.

## Understanding the Error

The error appears in the dependent Kustomization or HelmRelease status:

```bash
# Check for dependency errors
flux get kustomizations -A
flux get helmreleases -A

# Get detailed status
kubectl describe kustomization <name> -n flux-system
```

The error message looks like:

```
dependency 'flux-system/infrastructure' is not ready
```

Or:

```
dependency 'flux-system/cert-manager' is not ready: HelmRelease 'flux-system/cert-manager' is not ready
```

## How Dependencies Work in Flux

```yaml
# Example dependency chain
# infrastructure -> middleware -> applications
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure
  sourceRef:
    kind: GitRepository
    name: my-repo
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: middleware
  namespace: flux-system
spec:
  interval: 10m
  path: ./middleware
  sourceRef:
    kind: GitRepository
    name: my-repo
  # Middleware waits for infrastructure
  dependsOn:
    - name: infrastructure
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: applications
  namespace: flux-system
spec:
  interval: 10m
  path: ./applications
  sourceRef:
    kind: GitRepository
    name: my-repo
  # Applications wait for middleware (which implicitly waits for infrastructure)
  dependsOn:
    - name: middleware
```

When `infrastructure` fails, both `middleware` and `applications` will show "dependency not ready".

## Diagnosing the Root Cause

The key is to find the root dependency that is failing, not the downstream resources reporting the error.

### Step 1: Map the Dependency Chain

```bash
# List all Kustomizations with their dependencies
kubectl get kustomizations -n flux-system -o custom-columns=\
NAME:.metadata.name,\
READY:.status.conditions[0].status,\
DEPENDS:.spec.dependsOn[*].name,\
MESSAGE:.status.conditions[0].message

# List all HelmReleases with their dependencies
kubectl get helmreleases -A -o custom-columns=\
NAME:.metadata.name,\
NAMESPACE:.metadata.namespace,\
READY:.status.conditions[0].status,\
DEPENDS:.spec.dependsOn[*].name,\
MESSAGE:.status.conditions[0].message
```

### Step 2: Find the Failing Root Dependency

```bash
# Find all non-ready Kustomizations
flux get kustomizations -A --status-selector ready=false

# Find all non-ready HelmReleases
flux get helmreleases -A --status-selector ready=false

# Walk up the dependency chain to find the root cause
# Start with the dependency named in the error message
kubectl describe kustomization <dependency-name> -n flux-system
```

### Step 3: Check the Root Dependency Error

```bash
# Get the actual error from the root dependency
kubectl get kustomization <root-dependency> -n flux-system \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}'

# Or for HelmRelease
kubectl get helmrelease <root-dependency> -n <namespace> \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}'
```

## Fix 1: Resolve the Upstream Dependency Failure

The most common fix is to fix whatever is wrong with the upstream dependency. The downstream "dependency not ready" error will resolve automatically once the upstream is healthy.

### Example: Infrastructure Kustomization Failing

```bash
# Check why infrastructure is failing
kubectl describe kustomization infrastructure -n flux-system

# If it is a kustomize build error, fix the manifests
# If it is a health check error, check the deployed resources
kubectl get pods -A | grep -v Running | grep -v Completed
```

### Example: HelmRelease Dependency Failing

```bash
# Check why the HelmRelease is failing
flux get helmrelease cert-manager -n flux-system
kubectl describe helmrelease cert-manager -n flux-system

# Fix the HelmRelease (values, chart version, etc.)
# Once it is ready, downstream resources will proceed
```

## Fix 2: Circular Dependencies

Circular dependencies will cause all resources in the cycle to be stuck as "not ready".

### Diagnosing

```bash
# Look for cycles in your dependency graph
# A depends on B, B depends on A = circular
kubectl get kustomizations -n flux-system -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
deps = {}
for item in data['items']:
    name = item['metadata']['name']
    depends = [d['name'] for d in item['spec'].get('dependsOn', [])]
    deps[name] = depends

# Simple cycle detection
for name, dependencies in deps.items():
    for dep in dependencies:
        if name in deps.get(dep, []):
            print(f'CIRCULAR: {name} <-> {dep}')
"
```

### Fix

Break the circular dependency by restructuring your resources:

```yaml
# WRONG: Circular dependency
# app-a depends on app-b, app-b depends on app-a
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-a
  namespace: flux-system
spec:
  dependsOn:
    - name: app-b  # Creates a cycle
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-b
  namespace: flux-system
spec:
  dependsOn:
    - name: app-a  # Creates a cycle
```

```yaml
# CORRECT: Extract shared dependencies into a common layer
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: shared-infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./shared
  sourceRef:
    kind: GitRepository
    name: my-repo
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-a
  namespace: flux-system
spec:
  interval: 10m
  path: ./app-a
  sourceRef:
    kind: GitRepository
    name: my-repo
  # Both depend on the shared layer instead of each other
  dependsOn:
    - name: shared-infrastructure
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-b
  namespace: flux-system
spec:
  interval: 10m
  path: ./app-b
  sourceRef:
    kind: GitRepository
    name: my-repo
  dependsOn:
    - name: shared-infrastructure
```

## Fix 3: Cross-Namespace Dependencies

Dependencies can reference resources in different namespaces, but the syntax must be correct.

### Diagnosing

```bash
# Check if the dependency namespace is specified
kubectl get kustomization <name> -n flux-system -o jsonpath='{.spec.dependsOn}'
```

### Fix

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./deploy
  sourceRef:
    kind: GitRepository
    name: my-repo
  dependsOn:
    # Same namespace dependency (namespace can be omitted)
    - name: infrastructure
    # Cross-namespace dependency (must specify namespace)
    - name: database
      namespace: database-system
```

For HelmRelease cross-namespace dependencies:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: my-namespace
spec:
  interval: 10m
  chart:
    spec:
      chart: my-chart
      version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  dependsOn:
    # Must specify namespace for cross-namespace HelmRelease dependencies
    - name: database
      namespace: database-namespace
```

## Fix 4: Missing Dependency Resource

The dependency might reference a resource that does not exist.

### Diagnosing

```bash
# Check if the dependency resource exists
kubectl get kustomization <dependency-name> -n flux-system
kubectl get helmrelease <dependency-name> -n <namespace>
```

### Fix

Either create the missing dependency or remove it from the `dependsOn` list:

```yaml
# Option 1: Remove the dependency if it is not needed
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./deploy
  sourceRef:
    kind: GitRepository
    name: my-repo
  # Remove non-existent dependencies
  # dependsOn:
  #   - name: non-existent-resource
```

```yaml
# Option 2: Create the missing dependency
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure  # The missing dependency
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure
  sourceRef:
    kind: GitRepository
    name: my-repo
  prune: true
```

## Fix 5: Dependency Timeout Issues

A dependency might be healthy but taking too long to reconcile, causing downstream resources to see it as not ready.

### Fix: Increase Timeout on the Dependency

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure
  sourceRef:
    kind: GitRepository
    name: my-repo
  prune: true
  # Increase timeout for slow deployments
  timeout: 15m
  wait: true
```

## Recommended Dependency Patterns

### Layered Architecture

```yaml
# Layer 1: Cluster-wide infrastructure (namespaces, CRDs, policies)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/controllers
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  prune: true
  wait: true
---
# Layer 2: Infrastructure configs (cert-manager certs, ingress configs)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure-configs
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/configs
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  prune: true
  dependsOn:
    - name: infrastructure
---
# Layer 3: Applications
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: applications
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  prune: true
  dependsOn:
    - name: infrastructure-configs
```

## Forcing Reconciliation of the Dependency Chain

```bash
# Reconcile from the root dependency down
flux reconcile kustomization infrastructure -n flux-system
flux reconcile kustomization middleware -n flux-system
flux reconcile kustomization applications -n flux-system

# Or reconcile all at once (Flux will respect ordering)
flux reconcile kustomization --all -n flux-system
```

## Monitoring Dependency Status

```bash
# Watch the full dependency chain
watch "flux get kustomizations -n flux-system"

# Check events for dependency-related issues
kubectl events -n flux-system --types=Warning | grep -i "depend"
```

## Summary

The "dependency not ready" error in Flux CD means an upstream resource in the `dependsOn` chain has not reached a ready state. The fix is almost always to resolve the issue with the upstream dependency rather than modifying the downstream resource. Trace the dependency chain to find the root failing resource, fix its specific error, and all downstream resources will automatically proceed. Avoid circular dependencies by using a layered architecture pattern, and always specify namespaces for cross-namespace dependencies.
