# How to Fix object has been modified Error in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, Optimistic Locking, Resource Version, Concurrency

Description: Learn how to diagnose and fix the "object has been modified" optimistic concurrency error in Flux when concurrent updates cause resource version conflicts.

---

During Flux reconciliation, you may see:

```
kustomize controller: failed to reconcile kustomization 'flux-system/my-app': Operation cannot be fulfilled on deployments.apps "my-app": the object has been modified; please apply your changes to the latest version of the object
```

or:

```
helm-controller: upgrade failed: Operation cannot be fulfilled on configmaps "my-config": the object has been modified; please apply your changes to the latest version of the object
```

This error is caused by Kubernetes optimistic concurrency control. When two or more writers try to update the same resource simultaneously, the second writer gets this error because the `resourceVersion` it read has been superseded by the first writer's update.

## Root Causes

### 1. Concurrent Controllers Modifying the Same Resource

Multiple controllers (Flux, HPA, VPA, Istio, operators) updating the same resource at the same time triggers resource version conflicts.

### 2. High Reconciliation Frequency

Very short reconciliation intervals increase the likelihood of concurrent update attempts.

### 3. Webhooks or Admission Controllers Modifying Resources

Mutating admission webhooks that modify resources during apply can cause the resource version to change between Flux's read and write operations.

### 4. Manual Edits During Reconciliation

If someone runs `kubectl edit` or `kubectl apply` on a resource while Flux is reconciling, the optimistic lock will fail.

### 5. Resource-Intensive Clusters

Clusters under heavy API server load may experience increased latency, widening the window for concurrent modification conflicts.

## Diagnostic Steps

### Step 1: Check Kustomization Status

```bash
flux get kustomizations -A
```

The error is usually transient. If it persists across multiple reconciliation attempts, there is a systematic conflict.

### Step 2: Identify What Else Modifies the Resource

```bash
kubectl get deployment my-app -n default -o json | jq '.metadata.managedFields[].manager'
```

This lists all field managers that have modified the resource.

### Step 3: Check Controller Logs for Retry Behavior

```bash
kubectl logs -n flux-system deploy/kustomize-controller --since=10m | grep "object has been modified"
```

Count how frequently the error occurs. Occasional occurrences are normal; constant occurrences indicate a problem.

### Step 4: Check for HPA or VPA

```bash
kubectl get hpa,vpa -A
```

These controllers frequently update Deployment resources and can conflict with Flux.

### Step 5: Check API Server Load

```bash
kubectl get --raw /metrics | grep apiserver_request_duration
```

## How to Fix

### Fix 1: Let Flux Retry Automatically

In most cases, this error is transient and Flux will succeed on the next reconciliation. No action is needed if the error resolves on its own. Check after a few minutes:

```bash
flux get kustomizations my-app
```

### Fix 2: Reduce Reconciliation Overlap

If the error is frequent, increase the reconciliation interval to reduce the chance of overlap:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 30m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

### Fix 3: Remove Conflicting Field Ownership

If HPA manages replicas, do not set `spec.replicas` in your Flux manifests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  # replicas intentionally omitted - managed by HPA
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:latest
```

### Fix 4: Stagger Reconciliation Schedules

If multiple Kustomizations manage resources in the same namespace, stagger their intervals:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra
spec:
  interval: 10m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
spec:
  interval: 15m
  dependsOn:
    - name: infra
```

### Fix 5: Switch to Server-Side Apply

Server-side apply handles concurrent updates more gracefully through field-level ownership:

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
```

Flux v2 Kustomizations use SSA by default.

### Fix 6: Force Reconciliation

```bash
flux reconcile kustomization my-app --with-source
```

## Prevention

This error is usually transient and resolves on the next reconciliation cycle. To minimize its frequency, ensure clear field ownership between Flux and other controllers, use server-side apply, and avoid very short reconciliation intervals. Monitor reconciliation success rates to detect systematic conflicts early.
