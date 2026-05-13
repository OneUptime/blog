# How to Fix object has been modified Error in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, Optimistic Locking, Resource Version, Concurrency

Description: Learn how to diagnose and fix the 'object has been modified' optimistic concurrency error in Flux when concurrent updates cause resource version conflicts.

---

During Flux reconciliation, you may see:

```text
kustomize controller: failed to reconcile kustomization 'flux-system/my-app': Operation cannot be fulfilled on deployments.apps "my-app": the object has been modified; please apply your changes to the latest version of the object
```

or:

```text
helm-controller: upgrade failed: Operation cannot be fulfilled on configmaps "my-config": the object has been modified; please apply your changes to the latest version of the object
```

This error is caused by Kubernetes optimistic concurrency control. When two or more writers try to update the same resource simultaneously, the second writer gets this error because the `resourceVersion` it read has been superseded by the first writer's update.

## Root Causes

### 1. Concurrent Controllers Modifying the Same Resource

Multiple controllers (Flux, HPA, Istio, operators) updating the same resource or subresource at the same time can trigger resource version conflicts.

### 2. High Reconciliation Frequency

Very short reconciliation intervals increase the likelihood of concurrent update attempts.

### 3. Webhooks or Admission Controllers Modifying Resources

Mutating admission webhooks can change fields during create or apply, and webhooks or controllers that perform follow-up updates can contribute to field ownership or resource version conflicts.

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

### Step 4: Check for Autoscalers

```bash
kubectl get hpa -A
kubectl get vpa -A
```

HPA updates workload scale targets such as Deployments. VPA usually affects pod resource settings through recommendations, admission, or eviction rather than directly updating Deployment manifests, but it is still worth checking for autoscalers when debugging ownership conflicts.

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

### Fix 5: Tune Server-Side Apply Behavior

Flux v2 Kustomizations already use server-side apply. If another controller adds non-overlapping fields that Flux should preserve, annotate the affected resource with the `Merge` apply policy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    kustomize.toolkit.fluxcd.io/ssa: Merge
spec:
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

The `Merge` policy preserves fields added by other tools only when they do not overlap with fields defined in the Flux manifest.

### Fix 6: Force Reconciliation

```bash
flux reconcile kustomization my-app --with-source
```

## Prevention

This error is usually transient and resolves on the next reconciliation cycle. To minimize its frequency, ensure clear field ownership between Flux and other controllers, tune server-side apply behavior where needed, and avoid very short reconciliation intervals. Monitor reconciliation success rates to detect systematic conflicts early.
