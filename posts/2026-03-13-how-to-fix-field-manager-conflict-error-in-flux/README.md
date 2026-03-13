# How to Fix field manager conflict Error in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, Field Manager, Server-Side Apply, Ownership

Description: Learn how to diagnose and fix field manager conflict errors in Flux when multiple controllers claim ownership of the same resource fields.

---

When working with Flux and server-side apply, you may encounter field manager conflicts:

```text
kustomize controller: failed to reconcile: Apply failed with 2 conflicts: conflicts with "before-first-apply" using apps/v1: .spec.template.spec.containers[name="nginx"].ports[index=0].containerPort, .spec.template.spec.containers[name="nginx"].resources.limits.memory
```

or:

```text
Apply failed with 1 conflict: conflict with "manager" using v1: .data.config.yaml
```

Field manager conflicts occur when Flux (via server-side apply) attempts to change a field that another field manager already claims ownership of. Unlike the broader SSA conflict error, field manager conflicts often arise from stale or unexpected ownership entries in a resource's `managedFields` metadata.

## Root Causes

### 1. Resources Created Before Flux Adoption

Resources that were created manually with `kubectl apply` or by other tools before Flux adoption have field ownership assigned to those original managers.

### 2. Operators That Modify Resources

Controllers or operators that modify resources (such as Istio sidecar injection or cert-manager annotations) claim ownership of the fields they set.

### 3. Multiple Flux Kustomizations Overlapping

When two Flux Kustomizations manage manifests that touch the same resource, each Kustomization's field manager will conflict with the other.

### 4. Stale managedFields Entries

Previous field managers that no longer actively manage the resource may still have ownership entries in `managedFields`.

## Diagnostic Steps

### Step 1: Examine managedFields

```bash
kubectl get deployment my-app -n default -o json | jq '.metadata.managedFields[] | {manager, operation, fieldsV1}'
```

This shows every field manager, the operation type, and which fields each manager owns.

### Step 2: Identify the Conflicting Manager

From the error message, note the manager name (e.g., `before-first-apply`, `kubectl-client-side-apply`, or a controller name).

### Step 3: Check How the Resource Was Originally Created

```bash
kubectl get deployment my-app -n default -o json | jq '.metadata.managedFields[] | {manager, time}'
```

The timestamps show when each manager first took ownership.

### Step 4: List All Field Managers for a Resource

```bash
kubectl get deployment my-app -n default -o json | jq '[.metadata.managedFields[].manager] | unique'
```

## How to Fix

### Fix 1: Force Flux to Take Ownership

Set `force: true` on the Kustomization to override field manager conflicts:

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

With `force: true`, Flux will take ownership of all fields it manages, regardless of the current owner. This is safe for initial migration but should be reconsidered once ownership is established.

### Fix 2: Adopt Resources with Server-Side Apply

Use kubectl with the `--force-conflicts` flag and the Flux field manager name to transfer ownership:

```bash
kubectl apply --server-side --field-manager=kustomize-controller --force-conflicts -f deployment.yaml
```

After this one-time operation, Flux will own the fields and subsequent reconciliations will succeed without conflict.

### Fix 3: Remove Stale Field Manager Entries

If a field manager is no longer active, remove its entries from managedFields:

```bash
kubectl get deployment my-app -n default -o json | \
  jq 'del(.metadata.managedFields[] | select(.manager == "before-first-apply"))' | \
  kubectl replace -f -
```

### Fix 4: Consolidate Kustomizations

If two Kustomizations overlap on the same resource, restructure them so each resource is managed by exactly one Kustomization:

```text
clusters/my-cluster/
  infrastructure/
    kustomization.yaml  # manages infrastructure resources
  apps/
    kustomization.yaml  # manages application resources, no overlap
```

### Fix 5: Exclude Fields Managed by Other Controllers

If another controller legitimately manages certain fields (such as Istio injecting sidecar annotations), remove those fields from your Flux manifests to avoid the conflict.

### Fix 6: Reconcile

```bash
flux reconcile kustomization my-app --with-source
```

## Prevention

When adopting Flux for an existing cluster, plan a migration phase where you transfer field ownership to Flux controllers. Use `force: true` temporarily during migration, then remove it once all field ownership is established. Maintain strict boundaries between Kustomizations so that no two Kustomizations manage the same resource. Document which controllers are expected to modify which resources.
