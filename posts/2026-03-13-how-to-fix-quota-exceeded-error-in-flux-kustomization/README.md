# How to Fix quota exceeded Error in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, Kustomization, Resource Quotas, Capacity Planning

Description: Learn how to diagnose and fix the "quota exceeded" error in Flux Kustomization when resource creation is blocked by Kubernetes ResourceQuota limits.

---

When Flux attempts to create or update resources in a namespace with resource quotas, you may encounter:

```
kustomize controller: failed to reconcile kustomization 'flux-system/my-app': failed to create resource: forbidden: exceeded quota: default-quota, requested: requests.cpu=500m, used: requests.cpu=1800m, limited: requests.cpu=2
```

or:

```
forbidden: exceeded quota: resource-quota, requested: pods=1, used: pods=10, limited: pods=10
```

or:

```
forbidden: exceeded quota: storage-quota, requested: requests.storage=50Gi, used: requests.storage=90Gi, limited: requests.storage=100Gi
```

This error occurs when creating a new resource or scaling an existing one would exceed the limits set by a Kubernetes ResourceQuota in the target namespace.

## Root Causes

### 1. Namespace Resource Quotas Are Too Low

The ResourceQuota for the namespace does not accommodate the resources being deployed by Flux.

### 2. Resource Requests Not Specified

Pods without explicit resource requests may inherit default requests from a LimitRange, consuming more quota than expected.

### 3. Stale Resources Consuming Quota

Failed or completed pods, orphaned PVCs, or unused resources are consuming quota that should be available for new deployments.

### 4. Scaling Beyond Quota

Increasing replica counts or deploying new applications pushes total resource usage beyond the quota.

### 5. LimitRange Defaults Inflating Resource Usage

A LimitRange with high default resource requests can cause resources to exceed quota even when manifests specify modest resource requirements.

## Diagnostic Steps

### Step 1: Check ResourceQuota Status

```bash
kubectl get resourcequota -n my-namespace
kubectl describe resourcequota default-quota -n my-namespace
```

This shows the current usage versus the limits for each resource type.

### Step 2: Identify Resource Usage Breakdown

```bash
kubectl get pods -n my-namespace -o json | \
  jq '[.items[].spec.containers[].resources.requests] | map(to_entries) | flatten | group_by(.key) | map({resource: .[0].key, total: (map(.value | rtrimstr("m") | rtrimstr("Mi") | tonumber) | add)})'
```

### Step 3: Check for Stale Pods

```bash
kubectl get pods -n my-namespace --field-selector=status.phase!=Running
```

### Step 4: Check LimitRange Defaults

```bash
kubectl get limitrange -n my-namespace -o yaml
```

### Step 5: Check Flux Kustomization Status

```bash
flux get kustomizations -A | grep -i "quota"
```

## How to Fix

### Fix 1: Increase the ResourceQuota

If the quota is legitimately too low for the workload, increase it:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: default-quota
  namespace: my-namespace
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
    persistentvolumeclaims: "10"
    requests.storage: 200Gi
```

Apply the updated quota:

```bash
kubectl apply -f resourcequota.yaml
```

### Fix 2: Reduce Resource Requests in Deployments

Optimize the resource requests in your manifests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-namespace
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: app
          image: my-app:1.0.0
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

### Fix 3: Clean Up Stale Resources

Remove completed or failed pods:

```bash
kubectl delete pods -n my-namespace --field-selector=status.phase=Failed
kubectl delete pods -n my-namespace --field-selector=status.phase=Succeeded
```

Remove orphaned PVCs:

```bash
kubectl get pvc -n my-namespace --no-headers | while read name rest; do
  echo "Checking PVC $name"
done
```

### Fix 4: Adjust LimitRange Defaults

If the LimitRange is setting high default requests, lower them:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: my-namespace
spec:
  limits:
    - default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 50m
        memory: 64Mi
      type: Container
```

### Fix 5: Split Workloads Across Namespaces

If a single namespace is overloaded, distribute workloads:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-frontend
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/frontend
  targetNamespace: frontend
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-backend
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/backend
  targetNamespace: backend
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

### Fix 6: Force Reconciliation

After adjusting quotas or cleaning up resources:

```bash
flux reconcile kustomization my-app --with-source
```

## Prevention

Include ResourceQuota management in your Flux repository so that quotas are version-controlled and adjusted alongside workload changes. Set up monitoring and alerts for quota utilization approaching limits. Use LimitRange resources with reasonable defaults. Implement automated cleanup of completed Jobs and failed pods using TTL controllers or CronJobs. Plan namespace capacity based on expected workload growth.
