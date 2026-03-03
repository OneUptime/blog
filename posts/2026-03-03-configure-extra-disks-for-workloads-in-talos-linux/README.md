# How to Configure Extra Disks for Workloads in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Extra Disks, Storage, Kubernetes, Workload Configuration

Description: Learn how to configure additional disks on Talos Linux nodes for dedicated workload storage, separating application data from system partitions.

---

Most production Kubernetes nodes come with more than just a system disk. There might be NVMe drives for fast database storage, large SATA SSDs for general workloads, or spinning disks for cold data archival. Talos Linux lets you configure these extra disks through the machine configuration, creating partitions and mount points that your Kubernetes workloads can use. This guide covers everything from basic extra disk setup to advanced multi-disk configurations with different storage tiers.

## Why Use Extra Disks?

Separating workload storage from the system disk has several benefits:

- **Performance isolation** - workload I/O does not compete with system operations (container image pulls, kubelet operations, etcd)
- **Capacity management** - filling a data disk does not affect the EPHEMERAL partition
- **Different storage tiers** - fast NVMe for databases, large SATA for bulk storage
- **Simplified backup** - data disks can be snapshotted or backed up independently
- **Hardware matching** - assign the right storage type to the right workload

## Basic Extra Disk Configuration

The simplest configuration adds a single extra disk with one partition:

```yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/data
          size: 0  # Use entire disk
```

This tells Talos to:
1. Create a GPT partition table on `/dev/sdb`
2. Create a single partition using all available space
3. Format it with XFS (the default filesystem)
4. Mount it at `/var/mnt/data`

Apply the configuration:

```bash
talosctl apply-config --nodes 192.168.1.10 --file worker-extra-disk.yaml
```

## Using Disk Selectors

Instead of hard-coding device paths, use disk selectors for portability:

```yaml
machine:
  disks:
    - deviceSelector:
        match: '!disk.systemDisk && disk.type == "ssd" && disk.size >= 100u * GB'
      partitions:
        - mountpoint: /var/mnt/data
          size: 0
```

This matches any non-system SSD that is at least 100GB, regardless of its device name.

## Multiple Partitions on One Disk

Split a disk into multiple partitions for different purposes:

```yaml
machine:
  disks:
    - device: /dev/sdb  # 500GB disk
      partitions:
        # Database storage - fast random I/O
        - mountpoint: /var/mnt/database
          size: 200GB
        # Application data
        - mountpoint: /var/mnt/app-data
          size: 200GB
        # Logs
        - mountpoint: /var/mnt/logs
          size: 0  # Remaining ~100GB
```

Partitions are created in order, and the last partition can use `size: 0` to consume all remaining space.

## Multiple Disks for Different Tiers

For nodes with multiple physical disks, create a tiered storage layout:

```yaml
machine:
  disks:
    # NVMe disk for high-performance workloads
    - deviceSelector:
        match: 'disk.transport == "nvme" && !disk.systemDisk'
      partitions:
        - mountpoint: /var/mnt/fast
          size: 0
    # SATA SSD for general workloads
    - deviceSelector:
        match: 'disk.type == "ssd" && disk.transport != "nvme" && !disk.systemDisk'
      partitions:
        - mountpoint: /var/mnt/standard
          size: 0
    # HDD for bulk storage
    - deviceSelector:
        match: 'disk.type == "hdd" && !disk.systemDisk'
      partitions:
        - mountpoint: /var/mnt/bulk
          size: 0
```

Each tier gets its own mount point, and you can direct workloads to the appropriate tier through storage classes.

## Making Extra Disks Available to Kubernetes

Once extra disks are mounted, Kubernetes workloads access them through several mechanisms:

### HostPath Volumes

The simplest approach - directly reference the host mount point in pod specs:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: data-processor
spec:
  containers:
  - name: processor
    image: my-app:latest
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    hostPath:
      path: /var/mnt/data
      type: DirectoryOrCreate
```

This works but lacks dynamic provisioning and access control.

### Local Path Provisioner

Install the Local Path Provisioner pointed at your extra disk mount:

```yaml
# Storage class backed by extra disk
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-local
provisioner: rancher.io/local-path
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
parameters:
  nodePath: /var/mnt/fast
```

Now workloads can request storage dynamically:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-local
  resources:
    requests:
      storage: 50Gi
```

### Kubernetes Local Persistent Volumes

For static provisioning with scheduling awareness:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: fast-storage-node01
spec:
  capacity:
    storage: 450Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: fast-local
  local:
    path: /var/mnt/fast
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - worker-01
```

## Configuring Extra Disks for Storage Solutions

Many distributed storage solutions benefit from dedicated disks.

### For Rook-Ceph

Leave disks raw (do not partition them in Talos config) and let Ceph manage them:

```yaml
# Do NOT add this disk to machine.disks
# Ceph will use /dev/sdb directly
machine:
  disks: []  # Only system disk is managed by Talos
```

### For Longhorn

Configure the disk and point Longhorn to the mount:

```yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/lib/longhorn
          size: 0
```

### For OpenEBS Local PV

```yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/openebs/local
          size: 0
```

## Node-Role-Based Disk Configuration

Different node roles typically need different disk setups:

### Control Plane Nodes

```yaml
# Control plane - etcd-focused storage
machine:
  type: controlplane
  disks:
    - deviceSelector:
        match: 'disk.transport == "nvme" && !disk.systemDisk'
      partitions:
        - mountpoint: /var/mnt/etcd-backup
          size: 50GB
```

### Worker Nodes - General Purpose

```yaml
machine:
  type: worker
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/data
          size: 0
```

### Worker Nodes - Storage Focused

```yaml
machine:
  type: worker
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/fast-data
          size: 0
    - device: /dev/sdc
      partitions:
        - mountpoint: /var/mnt/bulk-data
          size: 0
    - device: /dev/sdd
      partitions:
        - mountpoint: /var/mnt/archive
          size: 0
```

## Verifying Extra Disk Configuration

After applying the configuration, verify everything is set up correctly:

```bash
# Check all disks on the node
talosctl disks --nodes 192.168.1.10

# Check volumes including extra disk partitions
talosctl get volumes --nodes 192.168.1.10

# Get detailed volume status
talosctl get volumestatus --nodes 192.168.1.10 -o yaml

# Check mount points
talosctl get mounts --nodes 192.168.1.10
```

## Handling Disk Failures

If an extra disk fails:

1. The volume enters a Failed state
2. Workloads using the mount point will experience I/O errors
3. Pods with volumes on the failed disk may crash

Monitor for disk health:

```bash
# Check volume health across all nodes
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  echo "=== $node ==="
  talosctl get volumes --nodes "$node"
done
```

Set up Prometheus alerts:

```yaml
- alert: ExtraDiskUnhealthy
  expr: node_filesystem_device_error{mountpoint=~"/var/mnt/.*"} == 1
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Extra disk failure on {{ $labels.instance }} at {{ $labels.mountpoint }}"
```

## Resizing Extra Disk Partitions

If you need more space, update the partition size in the machine config:

```yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/data
          size: 300GB  # Increased from 200GB
```

```bash
talosctl apply-config --nodes 192.168.1.10 --file updated-config.yaml
```

Talos will grow the partition and filesystem to accommodate the new size. Note that shrinking a partition that contains data is not supported.

## Best Practices

1. **Use disk selectors** instead of device paths for portability across hardware.

2. **Leave headroom** on each disk. Do not allocate 100% of space to partitions - leave 5-10% as a buffer.

3. **Match storage to workloads.** Put databases on fast NVMe, logs on standard SSD, archives on HDD.

4. **Monitor disk health.** Extra disks can fail independently of the system disk. Set up alerts for both capacity and hardware health.

5. **Document your disk layout.** As clusters grow, knowing which disks serve which purpose becomes critical.

6. **Test failover scenarios.** Know what happens when an extra disk fails and how to recover.

7. **Keep configurations in version control.** Machine configs with disk definitions should be tracked alongside your other infrastructure code.

## Summary

Extra disks in Talos Linux provide dedicated storage for workloads, separating application data from system operations. Configure them through the machine config using device paths or disk selectors, create appropriate partitions and mount points, and expose them to Kubernetes through hostPath volumes, Local Path Provisioner, or local persistent volumes. For distributed storage solutions, either let them manage disks directly (Ceph) or point them to dedicated mount points (Longhorn, OpenEBS). Plan your disk layout based on workload requirements, use appropriate storage tiers, and monitor disk health to maintain reliable storage across your cluster.
