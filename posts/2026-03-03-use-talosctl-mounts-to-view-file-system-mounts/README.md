# How to Use talosctl mounts to View File System Mounts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, File Systems, Storage, System Administration

Description: Learn how to use talosctl mounts to view and analyze file system mounts on Talos Linux nodes for storage troubleshooting

---

Understanding the file system layout of your Talos Linux nodes is important for troubleshooting storage issues, configuring persistent volumes, and ensuring your nodes have enough disk space. The `talosctl mounts` command shows you every mounted filesystem on a node, including system partitions, Kubernetes volumes, and any additional mounts you have configured.

## Basic Usage

To view all file system mounts on a node:

```bash
# List all mounts on a node
talosctl mounts --nodes 192.168.1.10
```

The output shows each mounted filesystem with its source, target, filesystem type, and mount options:

```
FILESYSTEM    SIZE       USED       AVAILABLE  PERCENT    MOUNTED ON
/dev/sda6     50.0 GB    12.3 GB    37.7 GB    24%        /
/dev/sda5     1.0 GB     200 MB     800 MB     20%        /system
tmpfs         8.0 GB     256 MB     7.7 GB     3%         /run
```

## Understanding Talos Linux Partitions

Talos Linux has a specific partition layout that is different from traditional Linux distributions. When you look at the mounts, you will see several Talos-specific partitions:

- **EFI**: The EFI system partition for UEFI boot
- **BIOS**: The BIOS boot partition for legacy boot
- **BOOT**: Contains the Talos boot assets
- **META**: Stores metadata about the node
- **STATE**: Contains the machine configuration and other persistent state
- **EPHEMERAL**: The writable partition where Kubernetes data is stored

```bash
# View mounts to see the Talos partition layout
talosctl mounts --nodes 192.168.1.10
```

The EPHEMERAL partition is particularly important because it holds containerd data, kubelet data, and etcd data (on control plane nodes). If this partition fills up, your node will have serious problems.

## Checking Disk Space

The most common reason to check mounts is to verify disk space:

```bash
# Check disk usage on a node
talosctl mounts --nodes 192.168.1.20
```

Pay special attention to the PERCENT column. If any partition is above 80% usage, you should investigate and take action:

```bash
# Look for high disk usage across all nodes
for node in 192.168.1.10 192.168.1.11 192.168.1.20 192.168.1.21; do
  echo "=== $node ==="
  talosctl mounts --nodes "$node" 2>/dev/null
  echo ""
done
```

## Monitoring Disk Space with Scripts

Set up automated monitoring to catch disk space issues before they cause problems:

```bash
#!/bin/bash
# disk-space-monitor.sh - Alert on high disk usage

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21 192.168.1.22"
THRESHOLD=80

echo "Disk space check - $(date)"
echo "========================="

for node in $NODES; do
  MOUNTS=$(talosctl mounts --nodes "$node" 2>/dev/null)

  # Parse and check each mount point
  while IFS= read -r line; do
    PERCENT=$(echo "$line" | awk '{print $5}' | tr -d '%')

    if [ -n "$PERCENT" ] && [ "$PERCENT" -ge "$THRESHOLD" ] 2>/dev/null; then
      MOUNT_POINT=$(echo "$line" | awk '{print $6}')
      echo "ALERT: Node $node - $MOUNT_POINT is ${PERCENT}% full"
    fi
  done <<< "$MOUNTS"
done
```

## Understanding tmpfs Mounts

Talos Linux uses tmpfs (temporary filesystem in RAM) for several purposes:

```bash
# View mounts to see tmpfs entries
talosctl mounts --nodes 192.168.1.10 | grep tmpfs
```

tmpfs mounts include:
- `/run`: Runtime data for services
- `/tmp`: Temporary files
- Various Kubernetes secret and configmap mounts

These mounts use RAM instead of disk, so they do not contribute to disk space usage. However, they do count against your node's memory.

## Checking Kubernetes Volume Mounts

When Kubernetes pods use persistent volumes, those volumes show up in the node's mount list:

```bash
# View all mounts including Kubernetes volumes
talosctl mounts --nodes 192.168.1.20
```

You might see entries like:

```
/dev/sdb1     100 GB     45 GB      55 GB      45%        /var/mnt/data
```

These are persistent volumes that pods are using for data storage.

## Investigating Mount Issues

### Partition Full

If a partition is full, you need to figure out what is consuming the space:

```bash
# Check the mounts to find the full partition
talosctl mounts --nodes 192.168.1.20

# If EPHEMERAL is full, it is usually container images or logs
# Check container images
talosctl containers --nodes 192.168.1.20 -k

# Check if there are many unused images
talosctl stats --nodes 192.168.1.20
```

Common causes of full ephemeral partitions:
- Too many container images cached
- Excessive logging from pods
- Large etcd database (on control plane nodes)
- Pods writing large amounts of data to emptyDir volumes

### Mount Not Present

If an expected mount is missing:

```bash
# Check the current mounts
talosctl mounts --nodes 192.168.1.20

# Check the machine configuration for expected mounts
talosctl get machineconfig --nodes 192.168.1.20 -o yaml | grep -A10 disks

# Check kernel messages for mount errors
talosctl dmesg --nodes 192.168.1.20 | grep -iE "mount|error|fail"
```

### Read-Only Mount

If a filesystem becomes read-only, it usually indicates a hardware problem:

```bash
# Check mount options to see if anything is read-only
talosctl mounts --nodes 192.168.1.20

# Check kernel messages for filesystem errors
talosctl dmesg --nodes 192.168.1.20 | grep -iE "ext4|xfs|read.only|error"
```

A filesystem going read-only typically means the kernel detected corruption or disk errors and remounted the filesystem to prevent further damage.

## Mounts on Control Plane vs. Worker Nodes

Control plane nodes and worker nodes have slightly different mount profiles:

```bash
# Control plane node mounts
echo "=== Control Plane Node ==="
talosctl mounts --nodes 192.168.1.10

# Worker node mounts
echo "=== Worker Node ==="
talosctl mounts --nodes 192.168.1.20
```

The main difference is that control plane nodes have etcd data stored on the EPHEMERAL partition, which can be a significant amount of space depending on the size of your cluster.

## Configuring Additional Mounts

You can add additional disks and mount points through the machine configuration:

```yaml
# Machine configuration for additional disk mounts
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/storage
          size: 0  # Use the entire disk
```

After applying this configuration:

```bash
# Apply the configuration
talosctl apply-config --nodes 192.168.1.20 --file updated-config.yaml

# Verify the new mount appears
talosctl mounts --nodes 192.168.1.20
```

## Tracking Mount Space Over Time

Build a history of disk space usage to predict when you might run out:

```bash
#!/bin/bash
# mount-history.sh - Track disk space usage over time

NODES="192.168.1.10 192.168.1.20 192.168.1.21"
LOG_FILE="./mount-history.csv"
TIMESTAMP=$(date +%Y-%m-%d_%H:%M:%S)

# Create header if file does not exist
if [ ! -f "$LOG_FILE" ]; then
  echo "timestamp,node,mount_point,size,used,available,percent" > "$LOG_FILE"
fi

for node in $NODES; do
  MOUNTS=$(talosctl mounts --nodes "$node" 2>/dev/null | tail -n +2)

  while IFS= read -r line; do
    FS=$(echo "$line" | awk '{print $1}')
    SIZE=$(echo "$line" | awk '{print $2}')
    USED=$(echo "$line" | awk '{print $3}')
    AVAIL=$(echo "$line" | awk '{print $4}')
    PCT=$(echo "$line" | awk '{print $5}')
    MOUNT=$(echo "$line" | awk '{print $6}')

    if [ -n "$FS" ] && [ -n "$MOUNT" ]; then
      echo "$TIMESTAMP,$node,$MOUNT,$SIZE,$USED,$AVAIL,$PCT" >> "$LOG_FILE"
    fi
  done <<< "$MOUNTS"
done
```

Run this via cron every hour to build a useful dataset for capacity planning.

## Combining Mounts with Disks

For a complete storage picture, use `talosctl mounts` alongside `talosctl disks`:

```bash
# Physical disk inventory
echo "=== Physical Disks ==="
talosctl disks --nodes 192.168.1.20

# Logical mount points
echo "=== Mount Points ==="
talosctl mounts --nodes 192.168.1.20
```

The disks command shows you what hardware is available, while the mounts command shows how that hardware is being used.

## Best Practices

- Monitor disk space on all partitions, especially EPHEMERAL, since it holds the most dynamic data.
- Set up automated alerts when any partition exceeds 80% usage.
- Track disk space trends over time for capacity planning.
- Understand the Talos Linux partition layout so you know what each partition is for.
- Check mounts after applying configuration changes to verify new disks are properly mounted.
- Investigate read-only remounts immediately, as they indicate potential hardware failure.
- Keep enough free space on the EPHEMERAL partition for container images, logs, and temporary data.
- Use dedicated disks for persistent storage workloads rather than sharing the Talos boot disk.

The `talosctl mounts` command is your primary tool for understanding file system usage on Talos Linux nodes. Regular monitoring and proactive capacity management prevent storage-related outages.
