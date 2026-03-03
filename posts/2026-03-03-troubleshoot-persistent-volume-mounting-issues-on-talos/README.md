# How to Troubleshoot Persistent Volume Mounting Issues on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Persistent Volume, Storage, Kubernetes, Troubleshooting

Description: Fix persistent volume mounting failures on Talos Linux including CSI driver issues, permission errors, and storage class misconfigurations.

---

Persistent Volume (PV) mounting issues are common on Talos Linux clusters, especially because Talos is an immutable operating system that does not include many storage drivers by default. When a pod cannot mount its PersistentVolumeClaim (PVC), it gets stuck in a Pending or ContainerCreating state. This guide covers the typical persistent volume problems you will encounter on Talos Linux and how to resolve them.

## Understanding Persistent Storage on Talos

Talos Linux handles storage differently from traditional Linux distributions:

- The root filesystem is read-only and immutable
- Only the ephemeral partition (`/var`) is writable
- No traditional package manager to install storage drivers
- CSI (Container Storage Interface) drivers must be deployed as Kubernetes workloads
- hostPath volumes are limited to specific paths

This means you need to plan your storage carefully and deploy the right CSI drivers for your needs.

## Checking PVC and PV Status

Start by checking the status of your PVC and PV:

```bash
# Check PVC status
kubectl get pvc -n <namespace>

# If PVC is Pending, describe it for details
kubectl describe pvc <pvc-name> -n <namespace>

# Check all PVs
kubectl get pv

# Check the pod using the PVC
kubectl describe pod <pod-name> -n <namespace>
```

A PVC can be in several states:

- **Pending** - Waiting for a PV to be provisioned or bound
- **Bound** - Successfully attached to a PV
- **Lost** - The bound PV no longer exists

## Issue: PVC Stuck in Pending

A Pending PVC means no PV is available to satisfy the claim.

**No StorageClass provisioner:**

```bash
# Check available StorageClasses
kubectl get storageclass

# Check if the requested StorageClass exists
kubectl get pvc <pvc-name> -n <namespace> -o jsonpath='{.spec.storageClassName}'
```

If the StorageClass does not exist or has no provisioner running, the PVC will never be fulfilled. Install the appropriate CSI driver:

```bash
# Example: Install local-path-provisioner for local storage
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml
```

**No available PV matching the claim:**

For static provisioning, you need to create a PV that matches the PVC's requirements:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: my-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /var/local-storage/my-data
  storageClassName: manual
```

## Issue: Pod Stuck in ContainerCreating

If the PVC is Bound but the pod is stuck in ContainerCreating, the volume cannot be mounted:

```bash
# Check pod events for mounting errors
kubectl describe pod <pod-name> -n <namespace> | grep -A 10 Events
```

Common error messages:

```text
Warning  FailedMount  Unable to attach or mount volumes: unmounted volumes=[data]
```

## Issue: CSI Driver Not Running

On Talos Linux, CSI drivers run as pods. If the driver is not running, volumes cannot be provisioned or attached:

```bash
# Check for CSI driver pods
kubectl get pods -A | grep csi

# Check CSI driver components
kubectl get csidrivers
kubectl get csinodes
```

If your CSI driver pods are not running, check why:

```bash
# Describe a failing CSI pod
kubectl describe pod <csi-pod-name> -n <namespace>

# Check CSI driver logs
kubectl logs <csi-pod-name> -n <namespace>
```

Common CSI driver issues on Talos:

- Missing kernel modules that the CSI driver needs
- Insufficient permissions (CSI drivers often need privileged access)
- Volume plugin directory not configured correctly

## Issue: hostPath Volumes on Talos

hostPath volumes have restrictions on Talos because most of the filesystem is read-only:

```yaml
volumes:
  - name: data
    hostPath:
      path: /var/my-data    # Must be under /var (the writable partition)
      type: DirectoryOrCreate
```

Paths outside `/var` are read-only and cannot be used for writable hostPath volumes. If you try to use a path like `/opt/data`, the mount will fail.

Create the directory on each node:

```bash
# Create the directory on the node
talosctl -n <node-ip> mkdir /var/my-data
```

Or configure it in the machine config:

```yaml
machine:
  files:
    - content: ""
      permissions: 0o755
      path: /var/my-data
      op: create
```

## Issue: Permission Denied on Mounted Volume

If the volume mounts but the application cannot write to it:

```text
Error: EACCES: permission denied, open '/data/file.txt'
```

This is usually because the container runs as a non-root user but the volume was created with root ownership. Fix with a security context:

```yaml
spec:
  securityContext:
    fsGroup: 1000      # Set the group ownership of mounted volumes
    runAsUser: 1000     # Run the container as this user
  containers:
    - name: myapp
      image: myapp:latest
      volumeMounts:
        - name: data
          mountPath: /data
```

Or use an init container to set permissions:

```yaml
initContainers:
  - name: fix-permissions
    image: busybox
    command: ["sh", "-c", "chown -R 1000:1000 /data"]
    volumeMounts:
      - name: data
        mountPath: /data
```

## Issue: Multi-Attach Errors

If you are using a volume that only supports ReadWriteOnce (RWO) and try to mount it on multiple nodes:

```text
Multi-Attach error for volume "pvc-xxx": Volume is already attached to node "worker-1"
```

Solutions:

1. Change the access mode to ReadWriteMany (RWX) if your storage supports it
2. Ensure the pod is only scheduled on the node where the volume is attached
3. Use a storage solution that supports RWX (NFS, CephFS, etc.)

```yaml
spec:
  accessModes:
    - ReadWriteMany  # Requires a storage backend that supports this
```

## Issue: Local Storage and Node Affinity

Local persistent volumes are tied to specific nodes. If the pod gets scheduled on a different node, the volume cannot be mounted:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-pv
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteOnce
  local:
    path: /var/local-storage
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - worker-1  # Volume is only on this node
```

Make sure the pod's scheduling constraints allow it to land on the correct node.

## Issue: NFS Volumes on Talos

NFS is a common choice for shared storage, but Talos does not include NFS client utilities by default. You need to use an NFS CSI driver:

```bash
# Install NFS CSI driver
helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs -n kube-system
```

Then create a StorageClass for NFS:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-csi
provisioner: nfs.csi.k8s.io
parameters:
  server: nfs-server.example.com
  share: /exported/path
```

## Issue: Volume Expansion Failures

If you try to resize a PVC but it fails:

```bash
# Check if the StorageClass supports expansion
kubectl get storageclass <sc-name> -o yaml | grep allowVolumeExpansion
```

If `allowVolumeExpansion` is not set to true, you cannot resize volumes with that StorageClass. Update the StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: my-sc
provisioner: example.com/csi
allowVolumeExpansion: true
```

After enabling expansion, resize the PVC:

```bash
# Edit the PVC to increase storage
kubectl edit pvc <pvc-name> -n <namespace>
# Change spec.resources.requests.storage to the desired size
```

## Summary

Persistent volume issues on Talos Linux often stem from the immutable nature of the operating system and the need for CSI drivers. Always check that your CSI driver is running, your StorageClass is configured correctly, and your volumes are accessible from the nodes where pods are scheduled. For hostPath volumes, remember that only paths under `/var` are writable. Set up proper file permissions with security contexts, and choose the right access mode for your workload pattern.
