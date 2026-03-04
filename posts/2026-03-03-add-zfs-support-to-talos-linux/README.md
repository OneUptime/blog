# How to Add ZFS Support to Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, ZFS, Storage, Kubernetes, Filesystems

Description: Complete guide to adding ZFS filesystem support to Talos Linux, including installing the ZFS extension, creating pools, and using ZFS for persistent storage in Kubernetes.

---

ZFS is one of the most capable filesystems available on Linux, offering features like built-in RAID, snapshots, compression, deduplication, and data integrity checking. Adding ZFS support to Talos Linux opens up powerful storage options for your Kubernetes cluster. Whether you want to use ZFS for local persistent volumes, back a storage solution like OpenEBS, or take advantage of ZFS snapshots for data protection, the Talos ZFS extension makes it possible.

This guide covers installing the ZFS extension, configuring ZFS pools, and integrating ZFS storage with Kubernetes workloads.

## Why Use ZFS on Talos Linux

ZFS brings several advantages to a Kubernetes cluster running on Talos:

- **Data integrity** - ZFS checksums every block of data, detecting and correcting silent data corruption
- **Snapshots** - Create instant, space-efficient snapshots of datasets for backup and recovery
- **Compression** - Transparent compression reduces disk usage without application changes
- **RAID-Z** - Built-in RAID support without needing hardware RAID controllers or mdadm
- **Datasets** - ZFS datasets can be used as individual persistent volumes for pods

These features make ZFS particularly attractive for stateful workloads like databases, message queues, and persistent caches.

## Installing the ZFS Extension

ZFS support is delivered as a system extension in Talos Linux. Add it to your machine configuration.

### Method 1: Machine Configuration

```yaml
# worker.yaml - Add ZFS extension
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/zfs:2.2.2-v1.7.0
  kernel:
    modules:
      - name: zfs
```

The extension version includes both the ZFS version and the Talos version it is compatible with. Make sure these match your Talos installation.

### Method 2: Image Factory

```bash
# Create a schematic with ZFS
cat > zfs-schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/zfs
EOF

# Submit to Image Factory
SCHEMATIC_ID=$(curl -sX POST \
  --data-binary @zfs-schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" | jq -r '.id')

# Use the installer
echo "factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0"
```

## Applying and Upgrading

Apply the configuration and trigger an upgrade to install the extension.

```bash
# Apply the config
talosctl -n <node-ip> apply-config --file worker.yaml

# Upgrade to apply extensions
talosctl -n <node-ip> upgrade \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Wait for the node to come back
talosctl -n <node-ip> health
```

## Verifying ZFS Installation

After the node reboots, verify that ZFS is loaded and working.

```bash
# Check that the ZFS module is loaded
talosctl -n <node-ip> read /proc/modules | grep zfs

# Verify ZFS tools are available
talosctl -n <node-ip> read /proc/spl/kstat/zfs/arcstats | head -5

# Check dmesg for ZFS messages
talosctl -n <node-ip> dmesg | grep -i zfs
```

## Creating a ZFS Pool

With ZFS loaded, you can create storage pools on your disks. Talos restricts direct command execution, so you need to use a privileged pod or the machine config for pool creation.

### Using a Privileged Pod

Deploy a privileged pod with ZFS tools to manage pools.

```yaml
# zfs-admin.yaml
apiVersion: v1
kind: Pod
metadata:
  name: zfs-admin
spec:
  nodeName: <gpu-node-name>  # Target specific node
  hostNetwork: true
  hostPID: true
  containers:
    - name: zfs
      image: ubuntu:22.04
      command: ["sleep", "infinity"]
      securityContext:
        privileged: true
      volumeMounts:
        - name: dev
          mountPath: /dev
        - name: host-root
          mountPath: /host
  volumes:
    - name: dev
      hostPath:
        path: /dev
    - name: host-root
      hostPath:
        path: /
```

```bash
# Deploy the admin pod
kubectl apply -f zfs-admin.yaml

# Exec into it
kubectl exec -it zfs-admin -- bash

# Install ZFS tools inside the pod
apt-get update && apt-get install -y zfsutils-linux

# List available disks
lsblk

# Create a ZFS pool on available disks
# Single disk pool
zpool create tank /dev/sdb

# Mirror pool (RAID 1)
zpool create tank mirror /dev/sdb /dev/sdc

# RAID-Z pool (RAID 5 equivalent)
zpool create tank raidz /dev/sdb /dev/sdc /dev/sdd

# Verify the pool
zpool status tank
zpool list
```

### Configuring Pool Properties

Set useful properties on your ZFS pool.

```bash
# Enable compression (LZ4 is fast and effective)
zfs set compression=lz4 tank

# Set a mount point
zfs set mountpoint=/var/lib/zfs/tank tank

# Enable automatic snapshots metadata
zfs set com.sun:auto-snapshot=true tank

# Check properties
zfs get all tank | head -20
```

## Creating ZFS Datasets for Kubernetes

Create individual datasets that can be used as persistent volumes.

```bash
# Create a dataset for database storage
zfs create tank/databases
zfs set quota=100G tank/databases
zfs set recordsize=8K tank/databases

# Create a dataset for general storage
zfs create tank/general
zfs set quota=500G tank/general
zfs set compression=lz4 tank/general

# List datasets
zfs list -r tank
```

## Using ZFS with OpenEBS

OpenEBS is a popular Kubernetes storage solution that has native ZFS support through its ZFS LocalPV provisioner.

### Installing OpenEBS ZFS LocalPV

```bash
# Add the OpenEBS Helm repository
helm repo add openebs https://openebs.github.io/charts
helm repo update

# Install the ZFS LocalPV provisioner
helm install openebs-zfs openebs/zfs-localpv \
  --namespace openebs \
  --create-namespace
```

### Creating a StorageClass

```yaml
# zfs-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-zfs
provisioner: zfs.csi.openebs.io
parameters:
  recordsize: "128k"
  compression: "lz4"
  poolname: "tank"
  fstype: "zfs"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

```bash
kubectl apply -f zfs-storage-class.yaml
```

### Creating a PVC

```yaml
# zfs-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: zfs-pvc
spec:
  storageClassName: openebs-zfs
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

```bash
kubectl apply -f zfs-pvc.yaml
kubectl get pvc zfs-pvc
```

## Taking ZFS Snapshots

One of the most powerful ZFS features is instant snapshots.

```bash
# Take a snapshot
zfs snapshot tank/databases@backup-2024-01-15

# List snapshots
zfs list -t snapshot

# Roll back to a snapshot (destructive - destroys later data)
zfs rollback tank/databases@backup-2024-01-15

# Clone a snapshot (non-destructive copy)
zfs clone tank/databases@backup-2024-01-15 tank/databases-restore
```

## Monitoring ZFS Health

Keep an eye on your ZFS pools to catch problems early.

```bash
# Check pool status
zpool status tank

# Check for errors
zpool status -x

# View I/O statistics
zpool iostat tank 5

# Check ARC (cache) statistics
cat /proc/spl/kstat/zfs/arcstats
```

You can also set up monitoring through Kubernetes.

```yaml
# zfs-exporter deployment for Prometheus metrics
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: zfs-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: zfs-exporter
  template:
    metadata:
      labels:
        app: zfs-exporter
    spec:
      containers:
        - name: exporter
          image: pdf/zfs_exporter:latest
          ports:
            - containerPort: 9134
          securityContext:
            privileged: true
          volumeMounts:
            - name: dev
              mountPath: /dev
      volumes:
        - name: dev
          hostPath:
            path: /dev
```

## Performance Tuning

ZFS performance can be optimized based on your workload.

```bash
# For database workloads - use smaller record sizes
zfs set recordsize=8K tank/databases

# For general file storage - default 128K is good
zfs set recordsize=128K tank/general

# Adjust ARC size (through kernel parameters in Talos config)
```

In your Talos machine config, you can set ZFS kernel parameters.

```yaml
machine:
  sysctls:
    # Set ARC max size to 4GB
    module.zfs.zfs_arc_max: "4294967296"
    # Set ARC min size to 1GB
    module.zfs.zfs_arc_min: "1073741824"
```

## Conclusion

Adding ZFS to Talos Linux combines the security and simplicity of an immutable OS with one of the most feature-rich filesystems available. The ZFS extension integrates smoothly through the standard Talos extension mechanism, and once the pool is created, you get access to snapshots, compression, data integrity, and flexible volume management. When paired with a CSI provisioner like OpenEBS ZFS LocalPV, your Kubernetes workloads can dynamically provision ZFS-backed persistent volumes with all the reliability guarantees that ZFS provides. It is a solid storage foundation for any stateful workload running on Talos.
