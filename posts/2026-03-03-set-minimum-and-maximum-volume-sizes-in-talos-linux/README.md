# How to Set Minimum and Maximum Volume Sizes in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Volume Sizing, Storage, Kubernetes, Disk Management

Description: Learn how to set minimum and maximum volume sizes in Talos Linux to control partition allocation and prevent storage issues.

---

When configuring storage on Talos Linux, getting volume sizes right is critical. Too small, and your workloads run out of space. Too large, and you waste disk capacity that could serve other purposes. Talos Linux provides minimum and maximum size constraints that give you fine-grained control over how partitions are allocated. This guide walks through the mechanics of volume sizing, when to use each option, and practical examples for common scenarios.

## Why Size Constraints Matter

Consider a cluster where each node has a 500GB system disk. By default, Talos takes what it needs for system partitions and gives the rest to the EPHEMERAL volume. But what if you also need space for a separate data volume? Or what if you are running multiple partition configurations and need to ensure fair allocation?

Size constraints let you:

- Guarantee minimum space for critical volumes
- Cap maximum space to leave room for other partitions
- Allow volumes to grow dynamically within defined bounds
- Prevent misconfiguration from consuming entire disks

## Setting Minimum Size

The `minSize` parameter ensures a volume gets at least the specified amount of space. If the disk cannot satisfy the minimum, the volume provisioning fails rather than creating an undersized partition:

```yaml
machine:
  volumes:
    - name: EPHEMERAL
      provisioning:
        minSize: 50GB
        grow: true
```

In this example, Talos will not provision the EPHEMERAL volume if there is less than 50GB of free space on the target disk. This protects against deploying to nodes with insufficient storage.

For custom disk partitions, minimum size works the same way:

```yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/data
          size: 100GB  # Exact size, acts as both min and max
```

When you specify an exact `size`, that is effectively both the minimum and maximum. The partition is created at exactly that size.

## Setting Maximum Size

The `maxSize` parameter caps how large a volume can grow. This is important when a volume has `grow: true` set, because without a maximum, it would consume all available space:

```yaml
machine:
  volumes:
    - name: EPHEMERAL
      provisioning:
        minSize: 50GB
        maxSize: 200GB
        grow: true
```

Here, the EPHEMERAL volume will be at least 50GB and at most 200GB. If the disk has 300GB of free space, EPHEMERAL takes 200GB and the remaining 100GB stays unallocated (or available for other partitions).

## The Grow Flag

The `grow` flag determines whether a volume should expand to fill available space (up to `maxSize`):

```yaml
# Without grow - volume is exactly minSize
machine:
  volumes:
    - name: EPHEMERAL
      provisioning:
        minSize: 50GB
        grow: false  # Volume will be exactly 50GB
```

```yaml
# With grow - volume expands up to maxSize
machine:
  volumes:
    - name: EPHEMERAL
      provisioning:
        minSize: 50GB
        maxSize: 200GB
        grow: true  # Volume fills available space, up to 200GB
```

When `grow` is `true` and no `maxSize` is set, the volume grows to fill all remaining space on the disk. This is the default behavior for the EPHEMERAL volume.

## Size Units

Talos accepts size values in standard units. When writing machine config YAML, you can use human-readable values:

```yaml
# Using different size units
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/small
          size: 512MB
        - mountpoint: /var/mnt/medium
          size: 50GB
        - mountpoint: /var/mnt/large
          size: 1TB
```

In CEL expressions and some volume configurations, you use the unsigned integer syntax with size constants:

```yaml
machine:
  volumes:
    - name: EPHEMERAL
      provisioning:
        minSize: 50u * GB  # 50 gigabytes in CEL syntax
        maxSize: 200u * GB
```

Be consistent with your units. Mixing bytes with gigabytes is a recipe for confusion.

## Practical Sizing Scenarios

### Scenario 1: Dedicated Data Partition on System Disk

You want the system disk to host both EPHEMERAL and a data partition:

```yaml
machine:
  install:
    disk: /dev/sda  # 500GB disk
  volumes:
    - name: EPHEMERAL
      provisioning:
        minSize: 100GB
        maxSize: 200GB
        grow: true
  disks:
    - device: /dev/sda
      partitions:
        - mountpoint: /var/mnt/data
          size: 200GB
```

This reserves 200GB for data and lets EPHEMERAL use 100-200GB of the remaining space.

### Scenario 2: Worker Nodes with Different Disk Sizes

Your workers have varied disk sizes (100GB, 250GB, 500GB). You want EPHEMERAL to be reasonable on all of them:

```yaml
machine:
  volumes:
    - name: EPHEMERAL
      provisioning:
        minSize: 40GB   # Minimum for the smallest nodes
        maxSize: 400GB  # Cap for the largest nodes
        grow: true
```

On the 100GB node, EPHEMERAL gets about 40-60GB (after system partitions). On the 500GB node, it caps at 400GB, leaving some room.

### Scenario 3: Control Plane Etcd Protection

Control plane nodes need enough EPHEMERAL space for etcd, but you do not want container images eating all the storage:

```yaml
machine:
  type: controlplane
  volumes:
    - name: EPHEMERAL
      provisioning:
        minSize: 30GB
        maxSize: 80GB
        grow: true
```

This keeps EPHEMERAL manageable on control plane nodes. Etcd typically needs 2-8GB, and the rest handles the minimal set of system pods that run on control plane nodes.

### Scenario 4: Multi-Partition Worker with Tiered Storage

A worker node with two disks where you want precise sizing:

```yaml
machine:
  disks:
    - device: /dev/sdb  # 200GB SSD
      partitions:
        - mountpoint: /var/mnt/hot
          size: 150GB
        - mountpoint: /var/mnt/warm
          size: 0  # Remainder of disk (~50GB)
    - device: /dev/sdc  # 2TB HDD
      partitions:
        - mountpoint: /var/mnt/cold
          size: 1TB
        - mountpoint: /var/mnt/archive
          size: 0  # Remainder (~1TB)
```

Using `size: 0` means "use all remaining space on the disk." It is the partition-level equivalent of `grow: true`.

## What Happens When Sizes Cannot Be Satisfied

If a disk does not have enough space to meet the minimum size constraint, Talos handles it predictably:

- The volume enters a **Failed** state
- An error message explains the constraint violation
- Other volumes on different disks are not affected
- The node continues to boot (unless the failed volume is critical, like EPHEMERAL)

You can check for sizing failures:

```bash
# Check for volume provisioning errors
talosctl get volumes --nodes 192.168.1.10 -o yaml
```

Failed volumes will show the error in their status section.

## Monitoring Volume Sizes

After provisioning, verify that volumes got the sizes you expected:

```bash
# Check actual volume sizes
talosctl get volumestatus --nodes 192.168.1.10 -o yaml
```

The output includes the actual size in bytes for each volume. Compare this against your configured constraints to verify everything is correct.

For ongoing monitoring, track filesystem usage through Prometheus:

```yaml
# Alert when a volume exceeds 85% usage
- alert: VolumeNearFull
  expr: |
    (node_filesystem_size_bytes - node_filesystem_avail_bytes)
    / node_filesystem_size_bytes > 0.85
  for: 15m
  labels:
    severity: warning
```

## Summary

Size constraints in Talos Linux give you precise control over volume allocation. Use `minSize` to guarantee space, `maxSize` to cap growth, and the `grow` flag to enable dynamic expansion. Plan your sizes based on workload requirements, and always account for the variety of disk sizes across your fleet. Test sizing configurations on representative hardware before deploying to production, and monitor actual usage to refine your constraints over time.
