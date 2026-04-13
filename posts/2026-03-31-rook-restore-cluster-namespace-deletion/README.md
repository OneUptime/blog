# How to Restore a Rook Cluster After Namespace Deletion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Namespace, Recovery, Kubernetes

Description: Step-by-step recovery guide for restoring a Rook-Ceph cluster after the rook-ceph namespace is accidentally deleted from Kubernetes.

---

Accidentally deleting the `rook-ceph` namespace is a serious incident - it removes all Rook deployments, services, and custom resources. However, if `dataDirHostPath` is on the host filesystem and OSDs are on dedicated disks, the underlying Ceph data often survives. This guide walks through recovery.

## Immediate Assessment

As soon as the namespace deletion is noticed, assess the damage:

```bash
# Check if namespace is terminating or gone
kubectl get namespace rook-ceph

# Check if Ceph processes are still running on nodes
# SSH to a storage node
ps aux | grep ceph
```

If Ceph OSD and mon processes are still running on the nodes (even without Kubernetes managing them), your data is likely intact.

## Understanding What Survives

When the namespace is deleted:
- All Kubernetes objects in `rook-ceph` are deleted (Deployments, Pods, Services, ConfigMaps, Secrets)
- CRDs (CustomResourceDefinitions) are cluster-scoped and will survive
- Data at `dataDirHostPath` (default `/var/lib/rook`) survives on each node
- OSD data on dedicated disk partitions survives
- StorageClasses are cluster-scoped and will survive

Check what survived:

```bash
kubectl get crd | grep ceph
kubectl get storageclass | grep rook
```

## Step 1: Handle Stuck Namespace Termination

If the namespace is stuck in `Terminating` state, resources with finalizers are blocking deletion. Force remove finalizers:

```bash
kubectl get namespace rook-ceph -o json | \
  python3 -c "import sys,json; d=json.load(sys.stdin); d['spec']['finalizers']=[]; print(json.dumps(d))" | \
  kubectl replace --raw /api/v1/namespaces/rook-ceph/finalize -f -
```

## Step 2: Recreate the Namespace and Reinstall Rook

Create the namespace fresh:

```bash
kubectl create namespace rook-ceph
```

Reinstall the Rook operator using the same version that was previously installed:

```bash
ROOK_VERSION="v1.14.0"
kubectl apply -f https://raw.githubusercontent.com/rook/rook/${ROOK_VERSION}/deploy/examples/crds.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/${ROOK_VERSION}/deploy/examples/common.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/${ROOK_VERSION}/deploy/examples/operator.yaml
```

Or with Helm:

```bash
helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --version v1.14.0
```

Wait for the operator to become ready:

```bash
kubectl -n rook-ceph rollout status deployment rook-ceph-operator
```

## Step 3: Restore ConfigMaps and Secrets

The Rook operator needs ConfigMaps for monitor endpoints and cluster FSIDs. If you have backups, restore them:

```bash
kubectl apply -f rook-ceph-secrets-backup.yaml
kubectl apply -f rook-ceph-configmaps-backup.yaml
```

The critical ConfigMap is `rook-ceph-mon-endpoints` which maps monitor IDs to IPs. You can reconstruct this by examining the existing mon data:

```bash
# On a node that had a monitor
cat /var/lib/rook/rook-ceph/rook-ceph.config | grep mon_host
```

## Step 4: Recreate Custom Resources

Apply your backed-up CephCluster and related resources:

```bash
kubectl apply -f cephcluster.yaml
kubectl apply -f cephblockpool.yaml
kubectl apply -f cephfilesystem.yaml
kubectl apply -f storageclasses.yaml
```

The Rook operator will attempt to connect to the existing Ceph cluster. Since the mon data and OSD data still exist on the nodes, the operator should successfully reconcile and reconnect.

## Step 5: Verify Recovery

Monitor the operator logs:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-operator -f
```

Then verify cluster health:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
```

PVCs that existed before the namespace deletion may need to be rebound. Check PV status:

```bash
kubectl get pv | grep rook
kubectl get pvc -A | grep -v Bound
```

## Prevention

Prevent accidental namespace deletion by restricting RBAC - ensure only specific administrators have the `delete` verb on `namespaces` resources. Avoid granting broad `cluster-admin` access to users or service accounts that do not need it.

For stronger protection, use admission webhooks or OPA/Gatekeeper policies to block deletion of critical namespaces like `rook-ceph`.

## Summary

Recovering from a deleted `rook-ceph` namespace requires reinstalling the Rook operator with the same version, restoring critical ConfigMaps and Secrets, and reapplying CephCluster and related CRs. The underlying Ceph data on host paths and OSD disks survives, so recovery is possible when backups of Kubernetes configuration objects are maintained.
