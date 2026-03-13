# How to Fix Flux CD Reconciliation Stuck in Progress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Reconciliation, Kubernetes, Troubleshooting, GitOps, Health Checks, Stuck, Debugging

Description: A step-by-step guide to diagnosing and resolving stuck reconciliations in Flux CD, covering health check failures, dependency issues, and resource problems that prevent reconciliation from completing.

---

## Introduction

A reconciliation stuck in "Progressing" or "Not Ready" state is one of the most frustrating issues in Flux CD. The controller appears to be working but never reaches a "Ready" state. This can block dependent Kustomizations, delay deployments, and stall your entire GitOps pipeline.

This guide covers the most common reasons reconciliation gets stuck and how to unblock it.

## Identifying a Stuck Reconciliation

```bash
# List all Kustomizations and check their status
kubectl get kustomization -A

# Example output showing a stuck reconciliation
# NAMESPACE     NAME          AGE   READY   STATUS
# flux-system   my-app        1h    False   Reconciliation in progress
# flux-system   infra         1h    True    Applied revision: main@sha1:abc123

# Get detailed status
kubectl describe kustomization -n flux-system my-app
```

```bash
# Check the last reconciliation attempt time
kubectl get kustomization -n flux-system my-app -o jsonpath='{.status.lastAttemptedRevision}'

# Check if the reconciliation has been running for too long
kubectl get kustomization -n flux-system my-app -o jsonpath='{.status.conditions[0].lastTransitionTime}'
```

## Common Cause 1: Health Check Failures

Flux Kustomizations can include health checks that must pass before reconciliation is considered complete. If a health check target is not healthy, the reconciliation stays in progress.

### Diagnosing the Issue

```bash
# Check which health checks are configured
kubectl get kustomization -n flux-system my-app -o yaml | grep -A 20 "healthChecks:"

# Check the health of the target resources
kubectl get deployment -n my-namespace my-deployment
kubectl describe deployment -n my-namespace my-deployment
```

### Example of a Failing Health Check

```yaml
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
  # These health checks must all pass for reconciliation to succeed
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-deployment
      namespace: my-namespace
  # If health checks do not pass within this timeout,
  # reconciliation fails
  timeout: 5m
```

The reconciliation will stay in progress if `my-deployment` does not become Ready within the timeout period.

### Common Reasons for Health Check Failures

```bash
# Check if pods are stuck in CrashLoopBackOff
kubectl get pods -n my-namespace -l app=my-app

# Check pod events for issues
kubectl describe pod -n my-namespace <pod-name>

# Check for image pull errors
kubectl get events -n my-namespace --field-selector reason=Failed | grep -i pull

# Check for resource quota issues
kubectl describe resourcequota -n my-namespace
```

### Fix: Resolve the Underlying Deployment Issue

```bash
# Check container logs for application errors
kubectl logs -n my-namespace deploy/my-deployment --tail=50

# Check if the image exists and is pullable
kubectl run test-pull --image=my-registry/my-app:v1.0.0 --restart=Never --dry-run=client -o yaml

# Check node resources
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### Fix: Adjust Health Check Timeout

If the deployment takes longer than expected to become ready:

```yaml
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
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-deployment
      namespace: my-namespace
  # Increase timeout for slow-starting applications
  timeout: 10m
```

### Fix: Remove Unnecessary Health Checks

```yaml
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
  # Use wait instead of explicit healthChecks
  # wait makes Flux wait for all applied resources to be ready
  wait: true
  timeout: 10m
```

## Common Cause 2: Dependency Stuck or Failed

If a Kustomization depends on another via `dependsOn` and the dependency is not ready, the dependent Kustomization will not start reconciling.

### Diagnosing the Issue

```bash
# Check the dependency chain
flux tree kustomization my-app -n flux-system

# Check the status of all dependencies
kubectl get kustomization -n flux-system
```

### Example of a Dependency Chain Issue

```yaml
---
# This Kustomization is stuck or failed
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/database
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
# This Kustomization is waiting for database but it will never proceed
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
    - name: database
```

### Fix: Resolve the Root Dependency

```bash
# Find the root cause by checking the first failed dependency
kubectl get kustomization -n flux-system database -o yaml

# Fix the underlying issue in the database Kustomization
# Then reconcile from the root
flux reconcile kustomization database -n flux-system

# The dependent will automatically reconcile after
```

## Common Cause 3: HelmRelease Stuck in Pending State

HelmReleases can get stuck when a Helm install or upgrade fails midway.

### Diagnosing the Issue

```bash
# Check HelmRelease status
kubectl get helmrelease -n my-namespace my-release -o yaml

# Check the Helm history for failed releases
kubectl get secret -n my-namespace -l owner=helm,name=my-release
```

### Fix: Reset the HelmRelease

```bash
# Option 1: Suspend and resume the HelmRelease
flux suspend helmrelease my-release -n my-namespace
flux resume helmrelease my-release -n my-namespace

# Option 2: Force a remediation by deleting the failed Helm secret
# Find the latest failed release secret
kubectl get secret -n my-namespace -l owner=helm,name=my-release --sort-by=.metadata.creationTimestamp

# Delete the last failed release secret to allow Flux to retry
kubectl delete secret -n my-namespace sh.helm.release.v1.my-release.v3
```

### Fix: Configure Automatic Remediation

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-release
  namespace: my-namespace
spec:
  interval: 5m
  chart:
    spec:
      chart: my-chart
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  # Configure install remediation
  install:
    remediation:
      retries: 3
  # Configure upgrade remediation
  upgrade:
    remediation:
      retries: 3
      # Rollback to last successful release on failure
      remediateLastFailure: true
    # Clean up failed release on upgrade failure
    cleanupOnFail: true
  # Uninstall on failure to allow fresh install
  uninstall:
    keepHistory: false
```

## Common Cause 4: Source Not Available

If the GitRepository or HelmRepository source is not ready, all dependent Kustomizations and HelmReleases will be stuck.

### Diagnosing the Issue

```bash
# Check all source statuses
kubectl get gitrepository -A
kubectl get helmrepository -A
kubectl get ocirepository -A

# Check for authentication issues
kubectl get gitrepository -n flux-system flux-system -o yaml | grep -A 10 "conditions:"
```

### Fix: Resolve the Source Issue

```bash
# Check if the source secret is correct
kubectl get secret -n flux-system flux-system -o yaml

# Force reconciliation of the source
flux reconcile source git flux-system -n flux-system

# Check source-controller logs
kubectl logs -n flux-system deploy/source-controller --tail=50 | grep "error"
```

## Common Cause 5: Resource Apply Timeout

When applying a large number of resources, the apply operation itself can time out.

### Fix: Increase the Timeout

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: large-deployment
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/large-deployment
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Increase timeout for large resource sets
  timeout: 15m
  # Optionally disable wait to prevent waiting for all resources
  wait: false
```

## Nuclear Option: Force Reconciliation

When all else fails, you can force a complete re-reconciliation:

```bash
# Step 1: Suspend the stuck Kustomization
flux suspend kustomization my-app -n flux-system

# Step 2: Resume it to trigger a fresh reconciliation
flux resume kustomization my-app -n flux-system

# Step 3: If still stuck, annotate to force reconciliation
kubectl annotate --overwrite kustomization/my-app \
  -n flux-system \
  reconcile.fluxcd.io/requestedAt="$(date +%s)"
```

## Debugging Workflow

```bash
# Step 1: Get a high-level view of all Flux resources
flux get all -A

# Step 2: Identify which resource is stuck
kubectl get kustomization -A -o custom-columns=\
"NAMESPACE:.metadata.namespace,NAME:.metadata.name,READY:.status.conditions[0].status,MESSAGE:.status.conditions[0].message"

# Step 3: Check the dependency tree
flux tree kustomization <name> -n flux-system

# Step 4: Check controller logs for errors
kubectl logs -n flux-system deploy/kustomize-controller --tail=100 | grep "<name>"
kubectl logs -n flux-system deploy/helm-controller --tail=100 | grep "<name>"

# Step 5: Check target namespace for pod issues
kubectl get pods -n <target-namespace> | grep -v Running

# Step 6: Check events in the target namespace
kubectl get events -n <target-namespace> --sort-by=.lastTimestamp | tail -20

# Step 7: Force reconciliation
flux reconcile kustomization <name> -n flux-system --with-source
```

## Conclusion

Stuck reconciliations in Flux CD are usually caused by health check failures, dependency chain issues, Helm release state corruption, or source unavailability. Start by checking the Kustomization or HelmRelease status conditions for specific error messages, then trace the dependency chain to find the root cause. Use health check timeouts and automatic remediation to make your pipeline more resilient. When stuck, suspend and resume the resource or force reconciliation with annotations as a last resort.
