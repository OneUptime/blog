# How to Force Delete Rook-Ceph Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Kubernetes, Namespace, Cleanup, Terminating

Description: Step-by-step guide to force deleting the rook-ceph namespace when it is stuck in Terminating state due to finalizers or failed resource cleanup.

---

The `rook-ceph` namespace frequently gets stuck in `Terminating` state when removing a Rook-Ceph cluster. This happens because resources within the namespace have finalizers that prevent deletion, or because the Kubernetes API server is waiting for all resources to be fully removed before deleting the namespace. This guide covers safe and forceful methods to complete namespace deletion.

## Diagnosing a Stuck Namespace

First, understand why the namespace is stuck:

```bash
kubectl get namespace rook-ceph -o yaml
```

Look for the `status.conditions` field and the list of `status.phase`:

```text
status:
  conditions:
  - lastTransitionTime: "2024-01-15T10:30:00Z"
    message: 'Some content in the namespace has finalizers remaining: cephcluster.ceph.rook.io
      in 1 resource instances'
    reason: SomeFinalizersRemain
    status: "True"
    type: NamespaceFinalizersRemaining
  phase: Terminating
```

The message tells you exactly which resources have remaining finalizers.

## Step 1: Find and Remove Resource Finalizers

List all resources with finalizers in the namespace:

```bash
kubectl api-resources --verbs=list --namespaced -o name | \
  xargs -I {} kubectl get {} -n rook-ceph \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.finalizers}{"\n"}{end}' 2>/dev/null | \
  grep -v "^$\|\[\]"
```

Remove finalizers from each resource:

```bash
# CephCluster
kubectl -n rook-ceph patch cephcluster rook-ceph \
  -p '{"metadata":{"finalizers":[]}}' --type=merge

# Any other CRDs
kubectl -n rook-ceph get cephblockpool -o name | \
  xargs -I {} kubectl -n rook-ceph patch {} \
  -p '{"metadata":{"finalizers":[]}}' --type=merge
```

After removing all resource finalizers, the namespace should delete automatically within a minute. If not, proceed to the next step.

## Step 2: Remove Namespace Spec Finalizers

Namespaces themselves have a `spec.finalizers` field that must be empty for deletion to complete:

```bash
kubectl get namespace rook-ceph -o json
```

Look for:

```json
"spec": {
  "finalizers": [
    "kubernetes"
  ]
}
```

Replace the namespace spec with an empty finalizers list:

```bash
kubectl get namespace rook-ceph -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
data['spec']['finalizers'] = []
print(json.dumps(data))
" > /tmp/rook-ceph-ns.json

kubectl replace --raw /api/v1/namespaces/rook-ceph/finalize \
  -f /tmp/rook-ceph-ns.json
```

This directly calls the namespace finalize subresource, which removes the namespace without requiring the finalizer to be processed normally.

## Alternative: Using kubectl proxy

Another approach uses `kubectl proxy` to make the API call:

```bash
# Start proxy in background
kubectl proxy &
PROXY_PID=$!

# Get namespace JSON and patch it
kubectl get namespace rook-ceph -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
data['spec']['finalizers'] = []
print(json.dumps(data))
" | curl -s -X PUT \
  http://127.0.0.1:8001/api/v1/namespaces/rook-ceph/finalize \
  -H "Content-Type: application/json" \
  -d @-

# Stop proxy
kill $PROXY_PID
```

## Handling Remaining Orphaned Resources

After the namespace is deleted, some cluster-scoped resources may remain orphaned:

```bash
# Check for remaining CRDs
kubectl get crd | grep rook

# Check for remaining ClusterRoles
kubectl get clusterrole | grep rook
kubectl get clusterrolebinding | grep rook

# Check for remaining PersistentVolumes
kubectl get pv | grep rook
```

Clean up orphaned cluster-scoped resources:

```bash
kubectl delete clusterrole rook-ceph-operator
kubectl delete clusterrolebinding rook-ceph-operator
```

Delete orphaned PersistentVolumes (data is already gone after namespace deletion):

```bash
kubectl get pv | grep Released | grep rook | awk '{print $1}' | \
  xargs kubectl delete pv
```

## Automating Namespace Force Deletion

Create a script for clean namespace removal:

```bash
#!/bin/bash

NAMESPACE="${1:-rook-ceph}"

echo "Force deleting namespace: $NAMESPACE"

# Remove all CRD finalizers
for crd in cephcluster cephblockpool cephfilesystem cephobjectstore; do
  kubectl -n "$NAMESPACE" get "$crd" -o name 2>/dev/null | \
    xargs -I {} kubectl -n "$NAMESPACE" patch {} \
    -p '{"metadata":{"finalizers":[]}}' --type=merge 2>/dev/null || true
done

# Wait briefly for auto-deletion
sleep 5

# Force remove namespace finalizers if still terminating
PHASE=$(kubectl get namespace "$NAMESPACE" \
  -o jsonpath='{.status.phase}' 2>/dev/null)

if [ "$PHASE" = "Terminating" ]; then
  echo "Namespace still terminating, forcing..."
  kubectl get namespace "$NAMESPACE" -o json | \
    python3 -c "
import sys, json
d = json.load(sys.stdin)
d['spec']['finalizers'] = []
print(json.dumps(d))
" | kubectl replace --raw "/api/v1/namespaces/$NAMESPACE/finalize" -f -
fi

echo "Done. Verifying..."
kubectl get namespace "$NAMESPACE" 2>&1 || echo "Namespace successfully deleted."
```

## Verification

After deletion:

```bash
kubectl get namespace rook-ceph
```

Should return:

```text
Error from server (NotFound): namespaces "rook-ceph" not found
```

## Summary

Force deleting a stuck `rook-ceph` namespace requires removing finalizers from all custom resources within the namespace first, then clearing the namespace's own `spec.finalizers` using the finalize API endpoint. Use `kubectl replace --raw /api/v1/namespaces/rook-ceph/finalize` with an empty finalizers list as the most reliable method. After namespace deletion, clean up orphaned cluster-scoped resources (CRDs, ClusterRoles) and released PersistentVolumes.
