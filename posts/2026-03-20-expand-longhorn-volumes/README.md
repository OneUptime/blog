# How to Expand Longhorn Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Volumes, Expansion

Description: Learn how to expand Longhorn volumes online and offline to increase storage capacity for your Kubernetes workloads without downtime.

## Introduction

As applications grow, their storage needs often increase. Longhorn supports volume expansion, allowing you to increase the size of existing volumes without recreating them or losing data. Longhorn supports both online expansion (while the volume is in use) and offline expansion. This guide walks through both methods.

## Prerequisites

- Longhorn installed and volumes running
- The Longhorn StorageClass must have `allowVolumeExpansion: true` (this is the default)
- For online expansion: Longhorn version 1.4.0 or later
- The volume must be in **Attached** state for online expansion

## Verify Volume Expansion is Allowed

Check that your Longhorn StorageClass allows expansion:

```bash
# Check the StorageClass for allowVolumeExpansion

kubectl get storageclass longhorn -o yaml | grep allowVolumeExpansion
# Should show: allowVolumeExpansion: true
```

If not set, patch the StorageClass:

```bash
kubectl patch storageclass longhorn \
  -p '{"allowVolumeExpansion": true}'
```

## Method 1: Expand via PVC (Online Expansion)

This is the recommended approach for volumes attached to running pods.

### Step 1: Check Current Volume Size

```bash
# Check the current size of the PVC
kubectl get pvc my-app-data

# Output example:
# NAME          STATUS   VOLUME                     CAPACITY   ACCESS MODES   STORAGECLASS
# my-app-data   Bound    pvc-abc123                 10Gi       RWO            longhorn
```

### Step 2: Edit the PVC to Increase Capacity

```bash
# Edit the PVC to request more storage
kubectl patch pvc my-app-data \
  -p '{"spec": {"resources": {"requests": {"storage": "20Gi"}}}}'
```

Or edit the PVC YAML directly:

```yaml
# After expansion - updated PVC spec
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-app-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      # Increased from 10Gi to 20Gi
      storage: 20Gi
```

```bash
kubectl apply -f my-pvc.yaml
```

### Step 3: Monitor the Expansion

```bash
# Watch the PVC status during expansion
kubectl get pvc my-app-data -w

# Check PVC events for progress
kubectl describe pvc my-app-data | grep -A 10 Events
```

### Step 4: Verify the Filesystem was Resized

```bash
# Exec into the pod using the volume
kubectl exec -it <pod-name> -- df -h /data

# The filesystem should reflect the new size
```

## Method 2: Expand via Longhorn UI

1. Open the Longhorn UI
2. Navigate to **Volume**
3. Find the target volume
4. Click **Expand**
5. Enter the new size (must be larger than current)
6. Click **OK**

Because this expansion does not go through the CSI PVC flow, Kubernetes will not automatically update the PV/PVC capacity. You need to update the PV/PVC to reflect the new size.

## Method 3: Expand via Longhorn Volume Custom Resource

```bash
# Patch the Longhorn volume directly to increase size
# Size is specified in bytes (20 GiB = 21474836480 bytes)
kubectl patch volume.longhorn.io my-volume -n longhorn-system \
  --type merge \
  -p '{"spec": {"size": "21474836480"}}'

# Monitor the expansion
kubectl get volume.longhorn.io my-volume -n longhorn-system -w
```

Like UI-based expansion, patching the Longhorn Volume CR directly does not automatically update the Kubernetes PV/PVC capacity.

## Offline Volume Expansion

For volumes not attached to any pod:

```bash
# Step 1: Scale down any pods using the volume
kubectl scale deployment my-app --replicas=0

# Step 2: Wait for the Longhorn volume to detach
kubectl get volume.longhorn.io <volume-name> -n longhorn-system -w

# Step 3: Patch the PVC to the new size
kubectl patch pvc my-app-data \
  -p '{"spec": {"resources": {"requests": {"storage": "30Gi"}}}}'

# Step 4: Monitor expansion completion
kubectl get pvc my-app-data -w

# Step 5: Scale the deployment back up
kubectl scale deployment my-app --replicas=1
```

## Checking Expansion Progress in Longhorn

```bash
# Check the Longhorn volume for expansion status
kubectl describe volume.longhorn.io <volume-name> -n longhorn-system | grep -i expand

# Check Longhorn manager logs for expansion operations
kubectl logs -n longhorn-system -l app=longhorn-manager | grep -i expand
```

## Troubleshooting Expansion Issues

### PVC Stuck in FileSystemResizePending

If the PVC shows `FileSystemResizePending` status:

```bash
# Check the PVC status
kubectl describe pvc my-app-data

# The filesystem resize happens when the pod is restarted
# Restart the pod to trigger filesystem expansion
kubectl rollout restart deployment my-app
```

### Expansion Fails Due to Insufficient Space

```bash
# Check Longhorn node disk space in the UI: Node > Node Disk

# Or check the Longhorn data path on the node (default path shown)
df -h /var/lib/longhorn
```

## Important Notes

- Longhorn only supports **expanding** volumes - you cannot shrink a volume
- Expansion requires that the new size is strictly larger than the current size
- Online expansion requires the volume to be attached to a node
- For supported Linux filesystems (`ext4` and `xfs`) on volumes using the block device frontend, Longhorn automatically resizes the filesystem during expansion

## Conclusion

Longhorn makes volume expansion straightforward with support for both online and offline expansion. For production workloads, online expansion is preferred as it requires no downtime. Always monitor the expansion process through the PVC status and Longhorn UI, and verify that the filesystem inside the pod reflects the new size after expansion completes.
