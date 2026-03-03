# How to Configure Custom Partition Layouts in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Partitions, Disk Configuration, Storage, Machine Configuration, Kubernetes

Description: Learn how to configure custom partition layouts in Talos Linux for additional disks, including partitioning, mount points, and storage optimization strategies.

---

Talos Linux automatically creates its own partition layout on the system disk during installation. You cannot change the system disk's partition scheme - that is by design for immutability and reliability. However, you have full control over how additional disks are partitioned and mounted. This guide shows you how to configure custom partition layouts on secondary disks to meet your storage requirements.

## Understanding Talos Partition Constraints

The system disk in Talos Linux always follows a fixed layout:

```text
System Disk (managed by Talos):
  EFI/BIOS boot partition
  BOOT partition
  META partition
  STATE partition
  EPHEMERAL partition (fills remaining space)
```

You cannot add extra partitions to the system disk, remove existing ones, or change their sizes (with the exception that the EPHEMERAL partition automatically fills all remaining space). This fixed layout is part of what makes Talos predictable and reliable.

For additional disks, however, you have flexibility. You can create partitions, specify sizes, set mount points, and even configure encryption.

## Adding a Single Partition on an Extra Disk

The simplest case is taking an additional disk and creating a single partition that fills the entire disk:

```yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/storage
```

When no size is specified, the partition takes up the entire disk. Talos will format the partition and mount it at the specified path. Kubernetes pods can then access this mount point through hostPath volumes or local PVs.

Apply this configuration and reboot the node:

```bash
# Apply configuration with additional disk
talosctl apply-config --nodes 192.168.1.10 --file worker-with-storage.yaml

# Reboot to apply disk changes
talosctl reboot --nodes 192.168.1.10

# After reboot, verify the mount
talosctl get mounts --nodes 192.168.1.10
```

## Creating Multiple Partitions on a Single Disk

You can split a disk into multiple partitions, each with its own size and mount point:

```yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        # First partition: 100GB for database storage
        - mountpoint: /var/mnt/database
          size: 107374182400  # 100GB in bytes

        # Second partition: 200GB for object storage
        - mountpoint: /var/mnt/objects
          size: 214748364800  # 200GB in bytes

        # Third partition: remaining space for general storage
        - mountpoint: /var/mnt/general
          # No size specified - takes remaining space
```

The partitions are created in order on the disk. The last partition without a specified size will consume whatever space remains after the sized partitions are allocated.

## Configuring Multiple Disks

Servers with multiple disks can have each disk configured independently:

```yaml
machine:
  install:
    disk: /dev/nvme0n1  # System disk - NVMe for speed
  disks:
    # Fast NVMe disk for database workloads
    - device: /dev/nvme1n1
      partitions:
        - mountpoint: /var/mnt/fast

    # Large HDD for bulk storage
    - device: /dev/sda
      partitions:
        - mountpoint: /var/mnt/bulk-1
          size: 2000000000000  # 2TB
        - mountpoint: /var/mnt/bulk-2
          # Remaining space

    # Second HDD for backup
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/backup
```

This layout dedicates fast NVMe storage for performance-sensitive workloads while using larger HDDs for bulk data.

## Using Disk Selectors for Additional Disks

Just like the system disk, additional disks can be specified using stable identifiers instead of device paths:

```yaml
machine:
  disks:
    - device: /dev/disk/by-id/scsi-SATA_HGST_HUS726T4_V0HK1234
      partitions:
        - mountpoint: /var/mnt/data
```

Using stable identifiers prevents issues where device names change between reboots. This is especially important on systems with multiple disk controllers where the enumeration order might vary.

## Partition Encryption

Additional disk partitions can be encrypted for security:

```yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/secure-storage
          encryption:
            provider: luks2
            keys:
              - nodeID: {}
                slot: 0
```

With encryption enabled, the partition data is encrypted at rest using LUKS2. The encryption key is derived from the node's identity, so the partition can only be decrypted on the same node. This protects data if the disk is physically removed.

## Exposing Partitions to Kubernetes

Once partitions are configured and mounted, you can expose them to Kubernetes workloads in several ways:

### Using Local Persistent Volumes

```yaml
# Create a PV backed by the custom partition
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-pv-database
spec:
  capacity:
    storage: 100Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-fast
  local:
    path: /var/mnt/database
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - worker-01
---
# StorageClass for local volumes
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-fast
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
```

### Using hostPath Volumes

```yaml
# Pod with hostPath volume pointing to custom partition
apiVersion: v1
kind: Pod
metadata:
  name: data-processor
spec:
  nodeName: worker-01
  containers:
    - name: processor
      image: my-app:latest
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      hostPath:
        path: /var/mnt/storage
        type: Directory
```

### Using a Local Path Provisioner

For dynamic provisioning of local storage, you can deploy a local path provisioner:

```yaml
# Rancher Local Path Provisioner configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-path-config
  namespace: local-path-storage
data:
  config.json: |-
    {
      "nodePathMap": [
        {
          "node": "worker-01",
          "paths": ["/var/mnt/general"]
        },
        {
          "node": "worker-02",
          "paths": ["/var/mnt/general"]
        }
      ]
    }
```

## Planning Your Partition Layout

When designing a custom partition layout, consider these factors:

**Workload requirements** - Different applications have different storage needs. Databases need fast, reliable storage. Log aggregation needs large capacity. Caching layers benefit from NVMe speeds.

**Isolation** - Separating workloads onto different partitions or disks prevents one workload's IO from affecting another. A noisy neighbor on a shared disk can degrade performance for all tenants.

**Growth planning** - Leave room for growth. If you partition a disk into fixed-size segments, make sure the sizes accommodate future data growth. Alternatively, leave the last partition unsized to absorb remaining space.

**Backup considerations** - Having separate partitions for critical data makes it easier to set up targeted backup policies. You can snapshot or backup specific partitions without affecting others.

## Handling Existing Data on Disks

When Talos configures an additional disk, it will format the partition by default. If the disk already contains data, that data will be lost. To prevent accidental data loss:

```bash
# Before configuring a new disk, check if it has existing partitions
talosctl get blockdevices --nodes 192.168.1.10

# Look for partitions on the target disk
# If partitions exist, the disk has been used before
```

If you need to preserve data on an existing disk, do not include it in the Talos machine configuration until you have backed up the data.

## Changing Partition Layouts

Changing the partition layout of an already-configured disk requires careful planning. Talos does not support online partition resizing or rearranging. To change the layout:

1. Back up any data on the affected partitions
2. Update the machine configuration with the new layout
3. The disk may need to be wiped for the new layout to take effect
4. Restore data after the new layout is applied

```bash
# Back up data before changing partition layout
kubectl cp pod-name:/data /tmp/data-backup

# Apply new configuration
talosctl apply-config --nodes 192.168.1.10 --file new-layout.yaml

# Reboot to apply changes
talosctl reboot --nodes 192.168.1.10

# Verify new layout
talosctl get mounts --nodes 192.168.1.10
```

## Common Partition Layout Patterns

Here are some proven layouts for different use cases:

### Database Node

```yaml
machine:
  disks:
    - device: /dev/nvme1n1  # Fast NVMe for database
      partitions:
        - mountpoint: /var/mnt/db-data
          size: 500000000000
        - mountpoint: /var/mnt/db-wal   # Write-ahead log on same fast disk
```

### Storage Node (Ceph)

```yaml
machine:
  disks:
    # Leave disks unpartitioned for Ceph to manage directly
    # Do not include them in machine.disks
    # Rook-Ceph will handle these disks
```

### General Purpose Worker

```yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/local-storage
```

## Conclusion

While Talos Linux locks down the system disk's partition layout for good reasons, it gives you the tools to configure additional disks however you need. Through the machine configuration, you can create multiple partitions, set specific sizes, configure encryption, and mount partitions at custom paths. The key is planning your layout based on workload requirements, using stable disk identifiers, and understanding that partition changes typically require a reboot and may involve data loss on the affected disk.
