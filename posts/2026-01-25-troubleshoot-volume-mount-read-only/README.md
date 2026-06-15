# How to Troubleshoot Volume Mount Read-Only Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Volumes, Storage, Troubleshooting, PersistentVolume, DevOps

Description: Learn how to diagnose and fix read-only volume mount issues in Kubernetes.

---

Your application logs "Read-only file system" errors, but you configured the volume as read-write. This frustrating issue has multiple possible causes: filesystem corruption, incorrect security contexts, or misconfigured volume claims. Here is how to diagnose and fix it.

## Common Symptoms

```text
Error: EROFS: read-only file system, open '/data/file.txt'
mkdir: cannot create directory '/data/app': Read-only file system
touch: cannot touch '/data/test': Read-only file system
```

## Quick Diagnosis

```bash
# Check if volume is mounted read-only

kubectl exec -n production myapp-pod -- mount | grep /data

# Output showing read-only:
# /dev/sda1 on /data type ext4 (ro,relatime)
#                              ^^ ro = read-only

# Output showing read-write:
# /dev/sda1 on /data type ext4 (rw,relatime)
#                              ^^ rw = read-write
```

## Cause 1: Filesystem Errors

When a filesystem has errors, Linux mounts it read-only to prevent data corruption.

### Diagnosis

```bash
# Check pod events
kubectl describe pod myapp-pod -n production

# Look for:
# Warning  FailedMount  kubelet  MountVolume.SetUp failed: mount failed: exit status 32

# Check kernel logs on the node
kubectl debug node/<node-name> -it --image=busybox --profile=sysadmin -- chroot /host dmesg | grep -Ei "read-only|ext4|xfs"
```

### Solution

Fix the filesystem on the underlying volume:

```bash
# For cloud providers, detach the volume and attach to a repair instance
# Then run fsck

# For EXT4:
sudo fsck.ext4 -y /dev/sda1

# For XFS:
sudo xfs_repair /dev/sda1
```

For PersistentVolumes, you may need to:

1. Scale down the deployment
2. Delete the pod
3. Fix the volume at the node level
4. Recreate the pod

```bash
# Scale down
kubectl scale deployment myapp -n production --replicas=0

# Find which node had the volume
kubectl get pv <pv-name> -o yaml

# SSH to node and fix filesystem
# Then scale back up
kubectl scale deployment myapp -n production --replicas=1
```

## Cause 2: Security Context

The pod's security context may prevent write access.

### Diagnosis

```bash
# Check security context
kubectl get pod myapp-pod -n production -o yaml | grep -A 10 securityContext

# Check container user
kubectl exec myapp-pod -n production -- id
```

### Solution: Set FSGroup

The fsGroup setting can make supported volumes writable by the pod's group:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000  # Volume will be writable by this group
  containers:
    - name: myapp
      image: myapp:1.0.0
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: myapp-data
```

### Solution: Init Container to Fix Permissions

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  initContainers:
    - name: fix-permissions
      image: busybox
      command: ['sh', '-c', 'chown -R 1000:1000 /data && chmod -R 755 /data']
      securityContext:
        runAsUser: 0  # Run as root to change ownership
      volumeMounts:
        - name: data
          mountPath: /data
  containers:
    - name: myapp
      image: myapp:1.0.0
      securityContext:
        runAsUser: 1000
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: myapp-data
```

## Cause 3: ReadOnly Volume Mount

The volume mount might be explicitly set to read-only.

### Diagnosis

```bash
kubectl get pod myapp-pod -n production -o yaml | grep -A 5 volumeMounts
```

### Solution

Remove the readOnly flag:

```yaml
# Wrong
volumeMounts:
  - name: data
    mountPath: /data
    readOnly: true  # This causes read-only mount

# Correct
volumeMounts:
  - name: data
    mountPath: /data
    readOnly: false  # Or omit this line entirely
```

## Cause 4: PVC Access Mode Mismatch

The PersistentVolumeClaim might request an access mode that does not match how the workload needs to use the volume. Access modes are used to match PVCs with PVs and, for `ReadWriteOncePod`, to constrain where a volume can be mounted. They do not enforce write protection after the storage is mounted, so `ReadOnlyMany` alone is not a reliable explanation for an in-pod read-only filesystem.

### Diagnosis

```bash
kubectl get pvc myapp-data -n production -o yaml | grep accessModes
```

### Solution

Use an access mode that matches the workload:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: myapp-data
spec:
  accessModes:
    - ReadWriteOnce  # Single node read-write
    # Use ReadWriteMany instead for multi-node read-write storage.
    # Use ReadWriteOncePod instead for CSI volumes that must be mounted by only one pod.
  resources:
    requests:
      storage: 10Gi
```

Note: Changing a PVC access mode usually requires recreating the PVC, and you must plan data migration or retention carefully.

## Cause 5: Volume Already Mounted

Some storage types only allow single-node attachment. If another pod on a different node has the volume attached, the new pod usually fails to attach or mount the volume instead of receiving a read-only mount.

### Diagnosis

```bash
# Find all pods using the same PVC
kubectl get pods -A -o json | jq -r '.items[] | select(.spec.volumes[]?.persistentVolumeClaim.claimName=="myapp-data") | "\(.metadata.namespace)/\(.metadata.name)"'

# Check PV status
kubectl get pv <pv-name> -o yaml | grep -A 5 status
```

### Solution

Ensure only one node uses single-attach storage at a time, use `ReadWriteOncePod` when you need single-pod enforcement, or use ReadWriteMany storage:

```yaml
# Use ReadWriteMany with NFS, CephFS, or similar
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-storage
  resources:
    requests:
      storage: 10Gi
```

## Cause 6: CSI Driver Issues

The Container Storage Interface driver might have issues.

### Diagnosis

```bash
# Check CSI driver pods
kubectl get pods -n kube-system | grep csi

# Check CSI driver logs
kubectl logs -n kube-system <csi-driver-pod>

# Check VolumeAttachment
kubectl get volumeattachment
kubectl describe volumeattachment <attachment-name>
```

### Solution

```bash
# Restart CSI driver
kubectl rollout restart daemonset <csi-driver> -n kube-system

# If an attachment is stale after a node or driver failure, investigate first,
# then delete it only when you are sure the volume is no longer attached
kubectl delete volumeattachment <attachment-name>
```

## Cause 7: Node Disk Pressure

The node might be under disk pressure. Kubernetes responds to disk pressure by reclaiming node resources and evicting pods; disk pressure does not normally remount persistent volumes read-only, but it can cause write failures that are easy to confuse with volume problems.

### Diagnosis

```bash
# Check node conditions
kubectl describe node <node-name> | grep -A 5 Conditions

# Look for:
# DiskPressure   True
```

### Solution

```bash
# Clean up disk space on the node
# Remove unused images if your runtime and crictl version support safe pruning
crictl rmi --prune

# Check for large files
du -sh /var/lib/kubelet/*
du -sh /var/lib/containerd/*
```

## Debugging Script

```bash
#!/bin/bash
# volume-debug.sh

POD=$1
NAMESPACE=${2:-default}
MOUNT_PATH=${3:-/data}

echo "=== Pod Volume Mounts ==="
kubectl get pod $POD -n $NAMESPACE -o jsonpath='{range .spec.containers[*].volumeMounts[*]}{.name}: {.mountPath} (readOnly: {.readOnly}){"\n"}{end}'

echo -e "\n=== Mount Status Inside Pod ==="
kubectl exec $POD -n $NAMESPACE -- mount | grep "$MOUNT_PATH" || echo "Mount point not found"

echo -e "\n=== Write Test ==="
kubectl exec $POD -n $NAMESPACE -- touch "$MOUNT_PATH/.write-test" 2>&1 && \
  kubectl exec $POD -n $NAMESPACE -- rm "$MOUNT_PATH/.write-test" && \
  echo "Write successful" || \
  echo "Write failed"

echo -e "\n=== Security Context ==="
kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.spec.securityContext}' | jq .

echo -e "\n=== PVC Details ==="
VOLUME_NAME=$(kubectl get pod $POD -n $NAMESPACE -o json | jq -r --arg path "$MOUNT_PATH" '.spec.containers[].volumeMounts[]? | select(.mountPath == $path) | .name' | head -1)
PVC=$(kubectl get pod $POD -n $NAMESPACE -o json | jq -r --arg volume "$VOLUME_NAME" '.spec.volumes[]? | select(.name == $volume) | .persistentVolumeClaim.claimName // empty')
if [ -n "$PVC" ]; then
    kubectl get pvc $PVC -n $NAMESPACE
    echo ""
    kubectl get pv $(kubectl get pvc $PVC -n $NAMESPACE -o jsonpath='{.spec.volumeName}')
fi

echo -e "\n=== Recent Events ==="
kubectl get events -n $NAMESPACE --field-selector involvedObject.name=$POD --sort-by='.lastTimestamp' | tail -10
```

## Testing Volume Writability

### Quick Test Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: volume-test
spec:
  containers:
    - name: test
      image: busybox
      command: ['sh', '-c', 'echo "test" > /data/test.txt && cat /data/test.txt && rm /data/test.txt && echo "Volume is writable"']
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: myapp-data
  restartPolicy: Never
```

```bash
kubectl apply -f volume-test.yaml
kubectl logs volume-test
kubectl delete pod volume-test
```

## Best Practices

1. **Set fsGroup for supported writable volumes** when running as non-root
2. **Check accessModes** match your use case
3. **Monitor node disk pressure** to prevent evictions and storage-related write failures
4. **Use init containers** to fix permissions at startup
5. **Test write access** before deploying stateful applications

```yaml
# Recommended security context for writable volumes
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000
  fsGroupChangePolicy: OnRootMismatch  # Faster than Always
```

---

Read-only volume issues are usually caused by filesystem errors, security contexts, explicit read-only settings, or storage driver problems. Start by checking the mount options inside the pod, then work through the possible causes systematically. Many issues are fixed by setting the correct fsGroup for supported volumes or fixing the underlying filesystem.
