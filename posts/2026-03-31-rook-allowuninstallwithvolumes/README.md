# How to Handle allowUninstallWithVolumes in Rook Cleanup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Uninstall, Volume, Cleanup

Description: Learn how the allowUninstallWithVolumes setting in Rook controls cluster deletion safety and when to use it during Rook-Ceph cluster removal.

---

By default, Rook protects you from accidentally deleting a Ceph cluster that still has active volumes (PVCs) attached. The `allowUninstallWithVolumes` setting in the CephCluster CR controls this safety behavior. Understanding this setting prevents data loss during planned cluster removal and helps troubleshoot cases where cluster deletion is blocked.

## The Default Safety Behavior

When you delete the CephCluster CR, Rook checks whether any volumes provisioned by the cluster are still in use. If volumes exist, Rook refuses to destroy the cluster and keeps it running. This is the correct behavior for accident prevention.

Check if volumes are blocking deletion:

```bash
kubectl -n rook-ceph describe cephcluster rook-ceph | grep -A 10 "Conditions"
```

```text
Conditions:
  Last Heartbeat Time:   2024-01-15T10:30:00Z
  Message:               CephCluster "rook-ceph" will not be deleted if there are
                         still storage consumers. Delete all PVCs using rook-ceph
                         storage first, or set allowUninstallWithVolumes: true
  Reason:                ClusterDeletionBlocked
  Status:                True
  Type:                  Deleting
```

## Identifying Remaining Volumes

Before using `allowUninstallWithVolumes`, identify what volumes still exist:

```bash
# Check all PVCs using Rook storage classes
kubectl get pvc -A | grep -E "rook|ceph"

# Check PVs bound to Rook provisioners
kubectl get pv | grep -E "rook|ceph"

# List PVs by storage class
kubectl get pv -o custom-columns='NAME:.metadata.name,STORAGECLASS:.spec.storageClassName,STATUS:.status.phase' | \
  grep -E "rook|ceph"
```

## Safe Approach: Delete Volumes First

The recommended approach is to delete all volumes before removing the cluster:

```bash
# Get all PVCs using Rook storage classes
ROOK_PVC_LIST=$(kubectl get pvc -A \
  -o jsonpath='{range .items[?(@.spec.storageClassName=="rook-ceph-block")]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}')

echo "PVCs to delete:"
echo "$ROOK_PVC_LIST"

# Delete each PVC (after backing up data)
for pvc in $ROOK_PVC_LIST; do
  NAMESPACE=$(echo $pvc | cut -d'/' -f1)
  NAME=$(echo $pvc | cut -d'/' -f2)
  kubectl -n $NAMESPACE delete pvc $NAME
done
```

After all PVCs are deleted, verify no PVs remain in `Released` state:

```bash
kubectl get pv | grep rook
```

Then the cluster deletion will proceed:

```bash
kubectl -n rook-ceph delete cephcluster rook-ceph
```

## Using allowUninstallWithVolumes

When you are intentionally removing the cluster and accepting that volumes will be orphaned (e.g., because you are migrating to a different storage backend or decommissioning an environment), set `allowUninstallWithVolumes: true`:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cleanupPolicy:
    allowUninstallWithVolumes: true
```

Apply the change:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph \
  --type merge \
  -p '{"spec":{"cleanupPolicy":{"allowUninstallWithVolumes": true}}}'
```

Then delete the cluster:

```bash
kubectl -n rook-ceph delete cephcluster rook-ceph
```

With `allowUninstallWithVolumes: true`, Rook will proceed with cluster destruction even if PVCs still exist. The PVCs will become orphaned and their data will be lost.

## What Happens to Orphaned Volumes

When the cluster is deleted with `allowUninstallWithVolumes: true`:
- PVCs remain in the namespace but their backing storage is destroyed
- PVs enter `Released` state and cannot be rebound
- Applications using those PVCs will see I/O errors

Clean up the orphaned PVCs and PVs after cluster deletion:

```bash
# Delete all PVCs in application namespaces
kubectl get pvc -A -o json | \
  python3 -c "
import json, sys
d = json.load(sys.stdin)
for item in d['items']:
  print(item['metadata']['namespace'], item['metadata']['name'])
" | while read ns name; do
  kubectl -n "$ns" delete pvc "$name" --ignore-not-found
done

# Force delete Released PVs
kubectl get pv | grep Released | awk '{print $1}' | \
  xargs kubectl delete pv --ignore-not-found
```

## Configuring via Helm

If using Helm, set this value in your cluster values file:

```yaml
# rook-ceph-cluster-values.yaml
cephClusterSpec:
  cleanupPolicy:
    allowUninstallWithVolumes: false  # default: safe behavior
```

Override for decommissioning:

```bash
helm upgrade rook-ceph-cluster rook-release/rook-ceph-cluster \
  --namespace rook-ceph \
  --reuse-values \
  --set cephClusterSpec.cleanupPolicy.allowUninstallWithVolumes=true
```

## Summary

`allowUninstallWithVolumes` in Rook's CephCluster CR is a safety gate that prevents accidental cluster destruction when volumes are still in use. The default behavior (false) is correct for normal operations. To safely remove a cluster, delete all PVCs first, then delete the CephCluster. Use `allowUninstallWithVolumes: true` only for intentional decommissioning where volume data loss is acceptable and explicitly planned for. Always document this setting change in change management records for auditing purposes.
