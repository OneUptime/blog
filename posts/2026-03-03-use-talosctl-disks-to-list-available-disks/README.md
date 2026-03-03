# How to Use talosctl disks to List Available Disks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, Disk Management, Storage, Infrastructure

Description: Learn how to use the talosctl disks command to list and inspect available disks on Talos Linux nodes for storage planning

---

Understanding the disk layout on your Talos Linux nodes is essential for storage planning, troubleshooting, and configuring persistent storage solutions. The `talosctl disks` command gives you a complete view of all block devices attached to a node, including their sizes, types, and partition information. This guide shows you how to use it effectively.

## Basic Usage

To list all disks on a node:

```bash
# List all disks on a node
talosctl disks --nodes 192.168.1.10
```

The output shows each block device with its details:

```
DEV        MODEL              SIZE     BUS    SUBSYS   WWID                           TYPE    UUID
/dev/sda   Samsung SSD 860    500 GB   scsi   block    naa.5002538e40a85c23           HDD
/dev/sdb   WDC WD10EZEX       1.0 TB   scsi   block    naa.50014ee2b5c7e3a1           HDD
/dev/nvme0 Samsung 970 EVO    1.0 TB   pci    block    eui.0025385b71b07e7f           NVME
```

This tells you what disks are available, their sizes, connection types, and identifiers.

## Understanding the Output

Each column provides specific information:

- **DEV**: The device path in the Linux filesystem (e.g., /dev/sda, /dev/nvme0n1).
- **MODEL**: The manufacturer and model of the disk.
- **SIZE**: The total capacity of the disk.
- **BUS**: How the disk is connected (scsi, pci, usb, virtio, etc.).
- **SUBSYS**: The kernel subsystem managing the device.
- **WWID**: World Wide ID - a globally unique identifier for the disk.
- **TYPE**: The type of disk (HDD, SSD, NVME, etc.).
- **UUID**: A unique identifier if available.

## Checking Disks Across Multiple Nodes

To compare disk configurations across your cluster:

```bash
# Check disks on all nodes
talosctl disks --nodes 192.168.1.10,192.168.1.11,192.168.1.12,192.168.1.20,192.168.1.21
```

This helps you verify that all nodes have the expected disk configuration, which is important when you are setting up distributed storage solutions.

## Identifying the Boot Disk

Talos Linux installs itself on one disk and uses it as the boot device. To identify which disk Talos is installed on:

```bash
# List disks and check which one has the Talos partitions
talosctl disks --nodes 192.168.1.10

# Also check mounts to see which disk is mounted
talosctl mounts --nodes 192.168.1.10
```

The Talos boot disk will have specific partitions: EFI, BIOS, BOOT, META, STATE, and EPHEMERAL. You can identify it through the mounts command by looking for these partition types.

## Planning Storage Solutions

When setting up persistent storage for Kubernetes workloads, you need to know what disks are available on your nodes:

```bash
#!/bin/bash
# storage-inventory.sh - Inventory available disks across the cluster

NODES="192.168.1.20 192.168.1.21 192.168.1.22 192.168.1.23"

echo "Storage Inventory Report - $(date)"
echo "==============================="

for node in $NODES; do
  echo ""
  echo "=== Node: $node ==="
  talosctl disks --nodes "$node" 2>/dev/null
done
```

This inventory helps you plan storage solutions like:

- **Local Path Provisioner**: Uses directories on the node's local disk
- **OpenEBS**: Can use raw disks or partitions for distributed storage
- **Rook-Ceph**: Requires dedicated disks on each node
- **Longhorn**: Uses disk space on each node for replicated storage

## Using Disk Information for Rook-Ceph

Rook-Ceph requires raw, unpartitioned disks. Use `talosctl disks` to find suitable candidates:

```bash
# List all disks
talosctl disks --nodes 192.168.1.20

# Look for disks that are NOT the boot disk and are unpartitioned
# The boot disk is usually /dev/sda or /dev/nvme0n1

# In your Rook-Ceph configuration, reference these disks
# For example, if /dev/sdb is available:
```

```yaml
# rook-ceph-cluster.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: true
    useAllDevices: false
    devices:
    - name: "sdb"
    # Or for NVMe
    - name: "nvme1n1"
```

## Configuring Disks in Talos Machine Configuration

The disk information from `talosctl disks` helps you write accurate machine configurations:

```yaml
# machine configuration snippet for disk setup
machine:
  install:
    disk: /dev/sda    # Boot disk identified from talosctl disks
    image: ghcr.io/siderolabs/installer:v1.7.0
  disks:
    - device: /dev/sdb  # Additional disk identified from talosctl disks
      partitions:
        - mountpoint: /var/mnt/data
          size: 500GB
```

## Monitoring Disk Health

While `talosctl disks` does not directly show SMART health data, you can use the disk listing to identify which disks to monitor:

```bash
# List disks to get device names
talosctl disks --nodes 192.168.1.10

# Check disk-related kernel messages
talosctl dmesg --nodes 192.168.1.10 | grep -iE "sd[a-z]|nvme|error|fail|bad"
```

Kernel messages about disk errors are early warning signs of hardware failure.

## Verifying Disk Configuration After Setup

After configuring additional disks in your machine configuration, verify they are recognized:

```bash
# Apply the updated machine configuration
talosctl apply-config --nodes 192.168.1.20 --file updated-machine-config.yaml

# After the node applies the config, check disks
talosctl disks --nodes 192.168.1.20

# Check if the new partitions are mounted
talosctl mounts --nodes 192.168.1.20
```

## Working with Virtual Machine Disks

In virtualized environments, the disk names and types may differ:

```bash
# On VMs using virtio
talosctl disks --nodes 192.168.1.10
# You might see /dev/vda, /dev/vdb (virtio disks)

# On VMs using SCSI
# You might see /dev/sda, /dev/sdb (SCSI disks)

# On cloud VMs
# You might see /dev/xvda, /dev/xvdb (Xen) or /dev/nvme0n1 (AWS NVMe)
```

Understanding the naming convention for your environment helps you write correct machine configurations.

## Disk Space and Capacity Planning

Use disk information to plan capacity:

```bash
#!/bin/bash
# disk-capacity-report.sh - Report disk capacity across the cluster

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21 192.168.1.22"

echo "Disk Capacity Report - $(date)"
echo "==============================="

TOTAL_STORAGE=0

for node in $NODES; do
  echo ""
  echo "Node: $node"
  DISK_OUTPUT=$(talosctl disks --nodes "$node" 2>/dev/null)
  echo "$DISK_OUTPUT"

  # Note: actual parsing depends on output format
done

echo ""
echo "Review the above to calculate total cluster storage capacity."
```

## Troubleshooting Disk Issues

### Disk Not Detected

If a disk that should be present is not showing up:

```bash
# Check if the kernel sees the disk
talosctl dmesg --nodes 192.168.1.20 | grep -iE "disk|sd[a-z]|nvme|block"

# Check for hardware-level issues
talosctl dmesg --nodes 192.168.1.20 | grep -i error
```

Common causes include:
- Loose cable connections (physical servers)
- Missing storage controller driver (may need a Talos system extension)
- VM configuration issue (virtual machines)

### Wrong Disk Size Reported

If the disk size does not match what you expect:

```bash
# Check the disk details
talosctl disks --nodes 192.168.1.20

# Verify with kernel information
talosctl cp --nodes 192.168.1.20 /proc/partitions -
```

Size mismatches can happen due to RAID configurations, hardware controller limitations, or partition table issues.

### Disk Performance Issues

While `talosctl disks` does not show performance metrics directly, you can use it to identify which disk to investigate:

```bash
# Identify the disks
talosctl disks --nodes 192.168.1.20

# Check disk I/O statistics via proc
talosctl cp --nodes 192.168.1.20 /proc/diskstats -
```

## Best Practices

- Run `talosctl disks` on every new node to verify disk configuration matches your expectations.
- Document the expected disk layout for each node role (control plane vs. worker).
- Keep a disk inventory for your cluster to track total storage capacity.
- Before configuring distributed storage solutions, verify that dedicated disks are available on all required nodes.
- Monitor kernel messages for disk errors as an early warning of hardware failure.
- Use the WWID or UUID to reference disks in configurations when possible, as device names (like /dev/sda) can change between boots.
- Test disk configurations in a staging environment before deploying to production.
- Ensure the Talos boot disk has enough space for the operating system and ephemeral storage.

The `talosctl disks` command provides the disk visibility you need for storage planning and troubleshooting on Talos Linux. Use it alongside `talosctl mounts` for a complete picture of your node's storage configuration.
