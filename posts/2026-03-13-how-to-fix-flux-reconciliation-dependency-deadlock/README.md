# How to Fix Flux Reconciliation Dependency Deadlock

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Reconciliation, Deadlock, Dependencies

Description: Resolve dependency deadlocks where Flux Kustomizations form circular dependencies or get stuck waiting on each other, preventing any reconciliation from completing.

---

A dependency deadlock occurs when two or more Flux Kustomizations depend on each other in a way that creates a cycle, or when a dependency chain gets stuck because one resource will never become ready. Unlike race conditions that resolve on retry, deadlocks persist indefinitely. This post covers how to identify and break these deadlocks.

## Symptoms

Multiple Kustomizations are stuck in `Not Ready` or `Progressing` state, all waiting on each other:

```bash
flux get kustomizations
```

```text
NAME            REVISION    SUSPENDED   READY     MESSAGE
kustomization-a             False       False     dependency 'flux-system/kustomization-b' is not ready
kustomization-b             False       False     dependency 'flux-system/kustomization-c' is not ready
kustomization-c             False       False     dependency 'flux-system/kustomization-a' is not ready
```

No Kustomization can proceed because each is waiting for another in the chain.

## Diagnostic Commands

### Map the full dependency graph

```bash
kubectl get kustomizations -n flux-system -o json | jq -r '.items[] | "\(.metadata.name) depends on: \(.spec.dependsOn // [] | map(.name) | join(", "))"'
```

### Check for circular dependencies visually

```bash
kubectl get kustomizations -n flux-system -o json | jq -r '.items[] | select(.spec.dependsOn != null) | .spec.dependsOn[] as $dep | "\(.metadata.name) -> \($dep.name)"'
```

Use this output to draw or check for cycles.

### Check the status of all Kustomizations

```bash
flux get kustomizations -A
```

### Identify the root blocker

```bash
kubectl get kustomizations -n flux-system -o json | jq -r '.items[] | select(.status.conditions[0].status == "False") | "\(.metadata.name): \(.status.conditions[0].message)"'
```

## Common Root Causes

### 1. Circular dependsOn declarations

Kustomization A depends on B, B depends on C, and C depends on A. Flux cannot determine which to reconcile first.

### 2. Dependency on a permanently failed Kustomization

A Kustomization depends on another that has a permanent error (bad manifests, missing source). The dependent can never proceed.

### 3. Cross-namespace dependency misconfiguration

A Kustomization depends on a resource in another namespace but uses the wrong namespace reference.

### 4. Health check on a resource that requires the dependent

Kustomization A creates a resource and waits for it to be healthy, but that resource needs something from Kustomization B, which depends on A.

### 5. Operator chicken-and-egg problem

An operator CRD is installed by one Kustomization, the operator itself by another, and the custom resources by a third, but the operator needs its own custom resource to start.

## Step-by-Step Fixes

### Fix 1: Break circular dependencies

Identify the cycle and remove one of the dependency links. Restructure resources so the cycle is broken:

Before (deadlocked):

```yaml
# Kustomization A
spec:
  dependsOn:
    - name: kustomization-b
---
# Kustomization B
spec:
  dependsOn:
    - name: kustomization-a
```

After (fixed):

```yaml
# Kustomization A (no dependencies - runs first)
spec: {}
---
# Kustomization B
spec:
  dependsOn:
    - name: kustomization-a
```

If both truly need resources from each other, merge them into a single Kustomization or extract the shared resources into a third Kustomization that both depend on.

### Fix 2: Fix the root failure in the chain

If the deadlock is caused by a failed dependency rather than a cycle, find and fix the root failure:

```bash
# Find the Kustomization with no unsatisfied dependencies
kubectl get kustomizations -n flux-system -o json | jq -r '
  .items[] |
  select(.status.conditions[0].status == "False") |
  select(.spec.dependsOn == null or (.spec.dependsOn | length == 0)) |
  "\(.metadata.name): \(.status.conditions[0].message)"'
```

Fix the error in that Kustomization first, and the rest of the chain will follow.

### Fix 3: Temporarily remove dependencies to unblock

If you need to get things running quickly, temporarily remove the `dependsOn` declarations:

```bash
kubectl patch kustomization kustomization-a -n flux-system --type=merge -p '{"spec":{"dependsOn":null}}'
```

Then reconcile:

```bash
flux reconcile kustomization kustomization-a --with-source
```

Restore the dependencies after everything is healthy.

### Fix 4: Restructure into a linear dependency chain

Convert circular or complex dependency graphs into a simple linear chain:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: layer-1-crds
spec:
  path: ./layer-1
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: layer-2-controllers
spec:
  path: ./layer-2
  dependsOn:
    - name: layer-1-crds
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: layer-3-configs
spec:
  path: ./layer-3
  dependsOn:
    - name: layer-2-controllers
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: layer-4-apps
spec:
  path: ./layer-4
  dependsOn:
    - name: layer-3-configs
```

### Fix 5: Merge tightly coupled Kustomizations

If two Kustomizations are so tightly coupled that they need each other's resources, merge them into one:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: coupled-resources
  namespace: flux-system
spec:
  path: ./coupled-resources  # Contains all resources from both
  interval: 5m
```

## Prevention Strategies

1. **Validate the dependency graph** in CI before applying changes. Write a script that parses `dependsOn` and checks for cycles.
2. **Follow a layered architecture** with clear one-directional dependencies: CRDs, then controllers, then configs, then apps.
3. **Keep the dependency graph shallow**. Deep chains increase the chance of deadlocks and slow down reconciliation.
4. **Document dependencies** in your repository so contributors understand the ordering constraints.
5. **Use a dependency visualization tool** to periodically review the graph:

```bash
# Generate a simple dependency graph
kubectl get kustomizations -n flux-system -o json | jq -r '
  .items[] |
  select(.spec.dependsOn != null) |
  .spec.dependsOn[] as $dep |
  "\(.metadata.name) -> \($dep.name)"' | sort
```

Dependency deadlocks are entirely preventable with a disciplined layered architecture. Treating your Kustomization dependency graph as a directed acyclic graph and validating it automatically is the most reliable approach.
