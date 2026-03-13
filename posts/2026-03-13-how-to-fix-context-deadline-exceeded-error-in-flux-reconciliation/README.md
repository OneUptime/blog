# How to Fix context deadline exceeded Error in Flux Reconciliation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, Reconciliation, Timeout, Performance

Description: Learn how to diagnose and fix the "context deadline exceeded" timeout error during Flux CD reconciliation of Kustomizations and HelmReleases.

---

A common error encountered when running Flux CD is:

```
Reconciliation failed after 5m0s, next try in 10m0s: context deadline exceeded
```

or in more detail from the controller logs:

```
kustomize controller: failed to reconcile kustomization 'flux-system/my-app': context deadline exceeded
```

This error means the Flux controller did not complete its reconciliation work within the configured timeout period. The operation was cancelled because it took too long.

## Root Causes

### 1. Large Manifests or Many Resources

When a Kustomization or HelmRelease manages a large number of Kubernetes resources, applying all of them within the default timeout may not be possible.

### 2. Slow API Server Response

If the Kubernetes API server is under heavy load or resource-constrained, it may respond slowly to apply requests, causing the controller to time out.

### 3. Webhook Timeouts

Validating or mutating admission webhooks that are slow or unresponsive can delay every resource apply, eventually exceeding the deadline.

### 4. Resource Dependency Deadlocks

Health checks waiting for resources that depend on other resources not yet applied can create circular waits that never resolve.

### 5. Network Latency to Source

Fetching large repositories or artifacts over slow connections can consume most of the timeout budget before reconciliation even begins.

## Diagnostic Steps

### Step 1: Check Kustomization Status

```bash
flux get kustomizations -A
```

Look for entries with `context deadline exceeded` in the status message.

### Step 2: Measure Reconciliation Duration

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.status.conditions[0]}'
```

### Step 3: Check API Server Health

```bash
kubectl get --raw /healthz
kubectl get --raw /readyz
```

### Step 4: Identify Slow Webhooks

```bash
kubectl get validatingwebhookconfigurations
kubectl get mutatingwebhookconfigurations
```

Check if any webhooks have high failure rates or slow response times:

```bash
kubectl logs -n webhook-namespace deploy/webhook-server --since=10m | grep -i timeout
```

### Step 5: Count Managed Resources

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.status.inventory.entries}' | jq length
```

## How to Fix

### Fix 1: Increase the Reconciliation Timeout

Increase the timeout on the Kustomization resource:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  timeout: 15m
  path: ./clusters/my-cluster/apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

For HelmReleases:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  timeout: 15m
  chart:
    spec:
      chart: my-chart
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
```

### Fix 2: Split Large Kustomizations

Break a single large Kustomization into smaller, focused ones:

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
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps
  dependsOn:
    - name: infrastructure
  sourceRef:
    kind: GitRepository
    name: flux-system
```

### Fix 3: Fix or Remove Slow Webhooks

If a webhook is causing delays, either fix it or add a failure policy:

```bash
kubectl get validatingwebhookconfiguration my-webhook -o yaml
```

Check that webhook deployments are healthy and have sufficient resources.

### Fix 4: Increase Controller Resources

Give the kustomize-controller more CPU and memory:

```bash
kubectl patch deployment kustomize-controller -n flux-system --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/resources/limits/cpu","value":"2"},{"op":"replace","path":"/spec/template/spec/containers/0/resources/limits/memory","value":"2Gi"}]'
```

### Fix 5: Force Reconciliation

```bash
flux reconcile kustomization my-app --with-source
```

## Prevention

Monitor reconciliation durations with Flux metrics and set up alerts when durations approach timeout thresholds. Break large Kustomizations into smaller ones from the start. Ensure admission webhooks are highly available and have reasonable timeout values. Size API server resources appropriately for the number of objects being managed.
