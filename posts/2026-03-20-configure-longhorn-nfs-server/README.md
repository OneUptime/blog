# How to Configure Longhorn Network File System Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, NFS, Share Manager, RWX

Description: Configure Longhorn's built-in NFS server (share manager) settings for ReadWriteMany volumes, including performance tuning and network configuration.

## Introduction

Longhorn implements ReadWriteMany (RWX) volumes using an internal NFSv4.1 server called the Share Manager. Each RWX volume gets its own Share Manager pod that acts as an NFS server, allowing multiple pods across different nodes to mount the same volume. This guide covers configuring the Share Manager settings and tuning the NFS server behavior.

## How Longhorn's Share Manager Works

```text
Pod A (Node 1) ──NFSv4.1──┐
                           ├──→ Share Manager Pod ──→ Longhorn Volume (Block)
Pod B (Node 2) ──NFSv4.1──┘
```

The Share Manager pod:
- Is scheduled by Kubernetes onto an eligible Longhorn node (configurable via `shareManagerNodeSelector`, `allowedTopologies`, and `shareManagerTolerations` StorageClass parameters)
- Runs an NFS-Ganesha userspace NFS server
- Creates a Kubernetes Service for the NFS endpoint
- Provides NFSv4.1 access (by default) to all pods in the cluster

## Prerequisites

- Longhorn v1.1.0 or later installed
- `nfs-common` on Ubuntu/Debian or `nfs-utils` on RHEL/CentOS on all nodes

```bash
# Ubuntu/Debian

apt-get install -y nfs-common

# RHEL/CentOS
yum install -y nfs-utils

# Verify NFS client modules
lsmod | grep nfs
```

## Configuring Share Manager Image

The Share Manager image is bundled with the Longhorn release and is not exposed as a Longhorn setting. If you need to override it (for example, to pin a specific build), set the `image.longhorn.shareManager.repository` and `image.longhorn.shareManager.tag` values when installing or upgrading the Longhorn Helm chart:

```bash
helm upgrade longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --reuse-values \
  --set image.longhorn.shareManager.repository=longhornio/longhorn-share-manager \
  --set image.longhorn.shareManager.tag=v1.7.0
```

## Configuring Tolerations for Longhorn Components

The `taint-toleration` setting is a global Longhorn setting that applies tolerations to all system-managed components, including Share Manager pods. If you need to schedule Share Manager pods specifically (and not the rest of the Longhorn system), use the `shareManagerTolerations` parameter on the StorageClass instead.

```bash
# Set tolerations for ALL Longhorn system-managed components
kubectl patch settings.longhorn.io taint-toleration \
  -n longhorn-system \
  --type merge \
  -p '{"value": "dedicated=storage:NoSchedule"}'
```

## Creating an RWX Volume

```yaml
# rwx-pvc-nfs.yaml - ReadWriteMany PVC using Longhorn's NFS share manager
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-web-content
  namespace: default
spec:
  accessModes:
    - ReadWriteMany    # Triggers Share Manager creation
  storageClassName: longhorn
  resources:
    requests:
      storage: 20Gi
```

```bash
kubectl apply -f rwx-pvc-nfs.yaml

# Watch the Share Manager pod being created
kubectl get pods -n longhorn-system -l longhorn.io/component=share-manager -w
```

## Checking Share Manager Status

```bash
# List all Share Manager pods
kubectl get pods -n longhorn-system \
  -l longhorn.io/component=share-manager \
  -o wide

# Check Share Manager logs
kubectl logs -n longhorn-system \
  -l longhorn.io/component=share-manager \
  --tail=50

# Check the NFS services
kubectl get services -n longhorn-system | grep share
```

## Configuring NFS Mount Options

Customize how clients mount the NFS share by specifying mount options in the StorageClass:

```yaml
# storageclass-rwx-tuned.yaml - RWX StorageClass with optimized NFS options
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-rwx-optimized
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  fsType: "ext4"
# NFS mount options for better performance
mountOptions:
  - vers=4.1      # Use NFSv4.1 for better performance
  - noresvport    # Don't require reserved ports
  - hard          # Retry on failure (important for reliability)
  - noacl         # Disable ACL (performance improvement)
  - noatime       # Don't update access times (performance)
```

```bash
kubectl apply -f storageclass-rwx-tuned.yaml
```

## Testing RWX Functionality

```yaml
# rwx-test.yaml - Test that RWX volumes work across multiple pods
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rwx-test-app
  namespace: default
spec:
  replicas: 3   # All 3 pods share the same volume
  selector:
    matchLabels:
      app: rwx-test
  template:
    metadata:
      labels:
        app: rwx-test
    spec:
      containers:
        - name: writer
          image: busybox
          command:
            - sh
            - -c
            - |
              while true; do
                echo "$(hostname): $(date)" >> /shared/log.txt
                sleep 5
              done
          volumeMounts:
            - name: shared
              mountPath: /shared
      volumes:
        - name: shared
          persistentVolumeClaim:
            claimName: shared-web-content
```

```bash
kubectl apply -f rwx-test.yaml

# Wait for pods to start
kubectl get pods -l app=rwx-test

# Check that all pods are writing to the same file
kubectl exec -it \
  $(kubectl get pod -l app=rwx-test -o name | head -1) \
  -- tail -20 /shared/log.txt
# Should show log lines from all 3 pods
```

## Share Manager High Availability

The Share Manager pod runs on a specific node. If that node fails, Longhorn reschedules it:

```bash
# Simulate Share Manager pod failure
kubectl delete pod -n longhorn-system \
  $(kubectl get pods -n longhorn-system -l longhorn.io/component=share-manager -o name | head -1)

# Observe recovery - Longhorn creates a new Share Manager pod
kubectl get pods -n longhorn-system -l longhorn.io/component=share-manager -w
```

During the pod restart, pods accessing the volume via NFS may experience a brief interruption. NFSv4.1's state recovery mechanism typically handles this transparently.

## Setting Share Manager Priority Class

The `priority-class` setting is global and applies to all Longhorn system-managed components, including Share Manager pods. The default value is `longhorn-critical`, which Longhorn installs as part of the chart. To use a different PriorityClass, make sure it already exists in the cluster before patching the setting:

```bash
# Apply a custom PriorityClass to all Longhorn system-managed components
kubectl patch settings.longhorn.io priority-class \
  -n longhorn-system \
  --type merge \
  -p '{"value": "longhorn-critical"}'
```

## Monitoring Share Manager Performance

```bash
# Check NFS statistics inside the Share Manager
kubectl exec -it -n longhorn-system \
  $(kubectl get pods -n longhorn-system -l longhorn.io/component=share-manager -o name | head -1) \
  -- nfsstat -s 2>/dev/null || cat /proc/net/rpc/nfsd

# Monitor Share Manager CPU/memory usage
kubectl top pods -n longhorn-system | grep share-manager
```

## Conclusion

Longhorn's built-in NFS Share Manager provides a convenient way to implement ReadWriteMany storage without external NFS infrastructure. By understanding how to configure mount options, tolerations, and monitoring the Share Manager, you can provide reliable shared storage for web serving, content distribution, and other multi-pod read/write scenarios. For workloads requiring the highest NFS performance, tune the mount options and use `shareManagerNodeSelector` and `shareManagerTolerations` on the StorageClass to place Share Manager pods on nodes with sufficient CPU and network capacity.
