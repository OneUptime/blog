# How to Fix server-side apply conflict Error in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, Server-Side Apply, Field Management, Conflict Resolution

Description: Learn how to diagnose and fix server-side apply conflict errors in Flux when multiple controllers or tools manage the same Kubernetes resource fields.

---

When Flux uses server-side apply (SSA) to reconcile resources, you may encounter:

```
kustomize controller: failed to reconcile kustomization 'flux-system/my-app': Apply failed with 1 conflict: conflict with "helm-controller" using apps/v1: .spec.replicas
```

or:

```
Apply failed with 1 conflict: conflict with "kubectl-client-side-apply" using apps/v1: .spec.template.spec.containers[name="app"].image
```

This error occurs when Flux tries to set a field that is already managed by another field manager. Server-side apply tracks field ownership and prevents unintended overwrites.

## Root Causes

### 1. Multiple Tools Managing the Same Resource

When both Flux and another tool (such as kubectl, Helm, or an HPA) try to manage the same field on a resource, SSA detects a conflict.

### 2. HPA and Flux Both Managing Replicas

The Horizontal Pod Autoscaler (HPA) sets `spec.replicas` on a Deployment, and Flux also specifies `spec.replicas` in the manifest. SSA identifies this as a conflict.

### 3. Migration from Client-Side to Server-Side Apply

When migrating from client-side apply to SSA, existing resources have field ownership assigned to `kubectl-client-side-apply`, which conflicts with the new SSA field manager.

### 4. Multiple Kustomizations Managing Overlapping Resources

If two or more Kustomizations attempt to manage the same resource, their field managers will conflict.

## Diagnostic Steps

### Step 1: Identify the Conflicting Field Manager

The error message specifies which field manager owns the conflicting field. Note the manager name and the field path.

### Step 2: Inspect Field Ownership

```bash
kubectl get deployment my-app -n default -o json | jq '.metadata.managedFields'
```

This shows all field managers and which fields they own.

### Step 3: Check Kustomization Status

```bash
flux get kustomizations -A
```

### Step 4: Check for HPA Conflicts

```bash
kubectl get hpa -A
```

If an HPA targets the same Deployment, it will manage `spec.replicas`.

## How to Fix

### Fix 1: Force Apply to Take Ownership

Configure the Kustomization to force-apply and take ownership of conflicting fields:

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
  force: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

### Fix 2: Remove the Conflicting Field from Flux Manifests

If another controller should own the field, remove it from the Flux-managed manifest. For example, if HPA manages replicas, remove `spec.replicas` from the Deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  # Do not set replicas here - managed by HPA
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
          image: my-app:1.0.0
```

### Fix 3: Transfer Field Ownership

Use kubectl to apply with the `--field-manager` flag matching Flux's manager, which transfers ownership:

```bash
kubectl apply --field-manager=kustomize-controller --server-side -f deployment.yaml
```

### Fix 4: Clear Existing Field Managers

Remove the old field manager entries:

```bash
kubectl get deployment my-app -n default -o json | \
  jq 'del(.metadata.managedFields[] | select(.manager == "kubectl-client-side-apply"))' | \
  kubectl apply -f -
```

### Fix 5: Use fieldManagerPolicy in Kustomization

Configure the field manager policy to force ownership:

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

### Fix 6: Force Reconciliation

```bash
flux reconcile kustomization my-app --with-source
```

## Prevention

Establish clear ownership of resource fields from the start. If HPA manages replicas, never include `spec.replicas` in Flux-managed manifests. When migrating to SSA, plan a one-time field ownership transfer for all existing resources. Document which tools manage which fields to avoid future conflicts.
