# How to Expand PersistentVolumeClaims on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, PersistentVolumeClaims, Storage, Volume Expansion

Description: Step-by-step guide to expanding PersistentVolumeClaims on Talos Linux without downtime or data loss.

---

You deployed your application with what seemed like plenty of storage, and now it is running out of space. This happens to everyone. The good news is that Kubernetes supports online volume expansion for most CSI drivers, and Talos Linux handles this gracefully. The bad news is that the process has a few gotchas that can trip you up if you are not careful.

This guide walks through expanding PersistentVolumeClaims on Talos Linux, covering the prerequisites, the actual expansion process, and troubleshooting common issues.

## Prerequisites for Volume Expansion

Before you can expand a PVC, three things need to be true.

First, your StorageClass must allow volume expansion. Check for the `allowVolumeExpansion` field.

```bash
# Check if your StorageClass supports expansion
kubectl get storageclass -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.allowVolumeExpansion}{"\n"}{end}'
```

If your StorageClass does not have `allowVolumeExpansion: true`, you need to update it.

```bash
# Patch the StorageClass to allow expansion
kubectl patch storageclass local-path -p '{"allowVolumeExpansion": true}'
```

Second, your CSI driver must support the `VolumeExpansion` capability. Most modern CSI drivers do, but you should verify.

```bash
# Check CSI driver capabilities
kubectl get csidriver -o yaml | grep -A5 "volumeLifecycleModes"
```

Third, the PVC must be in the `Bound` state. You cannot expand a pending or failed PVC.

```bash
# Verify PVC is bound
kubectl get pvc my-data-pvc -o jsonpath='{.status.phase}'
```

## Expanding a PVC

The actual expansion is straightforward. You edit the PVC and increase the storage request.

```bash
# Option 1: Use kubectl patch
kubectl patch pvc my-data-pvc -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'

# Option 2: Use kubectl edit
kubectl edit pvc my-data-pvc
# Change spec.resources.requests.storage to the new size
```

You can also do this declaratively with a YAML manifest.

```yaml
# Expanded PVC definition
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-data-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 100Gi  # Increased from 50Gi
```

After applying the change, check the PVC status.

```bash
# Watch the PVC expansion progress
kubectl get pvc my-data-pvc -w

# Check for conditions on the PVC
kubectl describe pvc my-data-pvc
```

## Online vs Offline Expansion

Volume expansion can happen in two ways, depending on your CSI driver and storage backend.

### Online Expansion

Online expansion happens while the volume is mounted and the pod is running. This is the preferred method because it requires no downtime. Most cloud storage providers and network storage solutions support this.

When you patch the PVC, the CSI driver resizes the underlying volume, and the kubelet handles expanding the filesystem. The pod continues running throughout.

```bash
# Monitor the expansion by watching events
kubectl get events --field-selector involvedObject.name=my-data-pvc --sort-by='.lastTimestamp'
```

### Offline Expansion

Some storage backends require the volume to be unmounted before it can be expanded. In this case, you need to stop the pod that is using the volume.

```bash
# Scale down the workload to unmount the volume
kubectl scale deployment my-app --replicas=0

# Patch the PVC
kubectl patch pvc my-data-pvc -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'

# Wait for the PVC to show the new size
kubectl get pvc my-data-pvc -w

# Scale back up
kubectl scale deployment my-app --replicas=1
```

For StatefulSets, you need to delete the pod rather than scale down.

```bash
# Delete the pod (it will be recreated by the StatefulSet controller)
kubectl delete pod my-app-0

# The StatefulSet controller recreates the pod
# The CSI driver resizes the volume during the mount phase
```

## Expanding StatefulSet PVCs

StatefulSets are a special case because each replica has its own PVC. If you need to expand storage for all replicas, you need to patch each PVC individually.

```bash
# List PVCs belonging to a StatefulSet
kubectl get pvc -l app=my-database

# Expand all PVCs for the StatefulSet
for i in 0 1 2; do
  kubectl patch pvc data-my-database-$i \
    -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
done
```

Unfortunately, Kubernetes does not support changing the `volumeClaimTemplates` in an existing StatefulSet. If you want future replicas to get the larger size, you need to update the StatefulSet spec. This requires deleting and recreating the StatefulSet without deleting the pods.

```bash
# Export the current StatefulSet
kubectl get statefulset my-database -o yaml > statefulset.yaml

# Edit statefulset.yaml to update volumeClaimTemplates storage size
# Then delete and recreate without cascading
kubectl delete statefulset my-database --cascade=orphan
kubectl apply -f statefulset.yaml
```

## Expanding Storage for Specific Backends on Talos Linux

### Longhorn Volume Expansion

Longhorn supports online volume expansion. When you patch the PVC, Longhorn automatically expands the volume and the filesystem.

```bash
# Verify Longhorn volume expansion
kubectl -n longhorn-system get volumes.longhorn.io my-data-pvc -o jsonpath='{.spec.size}'

# Check the engine for resize status
kubectl -n longhorn-system get engines.longhorn.io -l longhornvolume=my-data-pvc
```

### Rook-Ceph Volume Expansion

Rook-Ceph supports expansion for both RBD (block) and CephFS (filesystem) volumes.

```bash
# Verify the Ceph pool has enough space
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph df

# After patching the PVC, verify from the Ceph side
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- rbd info replicapool/csi-vol-abc123
```

### Local Storage Expansion

Local storage is trickier. If you are using raw block devices, expansion depends on the underlying hardware. You might need to add more disk space to the node first.

On Talos Linux, adding a new disk or expanding an existing partition requires updating the machine configuration.

```yaml
# Talos machine config with expanded disk
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/storage
          size: 0  # Use entire disk
```

```bash
# Apply the new config
talosctl -n 10.0.0.11 apply-config --file worker-config.yaml
```

## Troubleshooting Expansion Issues

### PVC Stuck in "Resizing" State

If your PVC shows a `FileSystemResizePending` condition, the volume has been resized but the filesystem has not been expanded yet.

```bash
# Check PVC conditions
kubectl get pvc my-data-pvc -o jsonpath='{.status.conditions[*].type}'

# If stuck, try restarting the pod to trigger filesystem resize
kubectl delete pod my-app-0
```

### Expansion Fails with "Cannot Reduce Size"

You can only increase PVC size, never decrease it. If you accidentally request a smaller size, the operation will be rejected.

### CSI Driver Reports Insufficient Space

Check that the underlying storage has enough capacity for the expansion.

```bash
# For Longhorn, check node disk space
kubectl -n longhorn-system get nodes.longhorn.io -o json | \
  jq '.items[].status.diskStatus | to_entries[] | {disk: .key, available: .value.storageAvailable}'

# For the node level, use talosctl
talosctl -n 10.0.0.11 usage /var
```

## Automating Volume Expansion

You can set up automated expansion using tools like Volume Autoscaler or custom scripts that monitor volume usage and trigger expansion.

```yaml
# Example: Prometheus alert that triggers when volumes need expansion
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: volume-expansion-alert
  namespace: monitoring
spec:
  groups:
  - name: volume-expansion
    rules:
    - alert: VolumeNeedsExpansion
      expr: |
        kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes > 0.80
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "PVC {{ $labels.persistentvolumeclaim }} is over 80% full and may need expansion"
```

## Conclusion

Expanding PersistentVolumeClaims on Talos Linux follows the standard Kubernetes process with a few platform-specific considerations. Make sure your StorageClass allows expansion, verify your CSI driver supports it, and understand whether your storage backend handles online or offline resizing. For StatefulSets, remember that you need to patch each PVC individually. With proper monitoring in place, you can catch volumes approaching capacity before they fill up and expand them proactively rather than scrambling during an outage.
