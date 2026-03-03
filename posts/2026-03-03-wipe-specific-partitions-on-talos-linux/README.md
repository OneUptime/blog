# How to Wipe Specific Partitions on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Partitions, Disk Management, Kubernetes, Node Maintenance

Description: Learn how to selectively wipe specific partitions on Talos Linux nodes for targeted cleanup without performing a full node reset.

---

A full node reset is not always what you need. Sometimes you want to clear out just the ephemeral data while keeping the machine configuration intact. Other times you might need to wipe a specific data disk without touching the system partitions. Talos Linux gives you the tools to perform targeted partition wipes, giving you fine-grained control over what gets cleaned up and what stays.

This guide covers the partition layout of Talos Linux, how to wipe specific partitions, and when each approach makes sense.

## Talos Linux Partition Layout

Before diving into partition management, it helps to understand how Talos organizes its disks. A standard Talos installation creates several partitions on the system disk:

- **EFI**: The EFI system partition containing the bootloader. This is small (around 100MB) and rarely needs to be touched.
- **BIOS**: A BIOS boot partition for legacy boot support.
- **BOOT**: Contains the Talos kernel and initramfs. This is the actual operating system.
- **META**: A small metadata partition used for storing configuration hints and overlay data.
- **STATE**: Contains the machine configuration, PKI certificates, and other persistent state. This is what makes the node "know" which cluster it belongs to.
- **EPHEMERAL**: The largest partition, used for kubelet data, container images, pod logs, and temporary storage. This is where most of the day-to-day data lives.

You can view the partition layout on a running node:

```bash
# View disk partitions
talosctl disks --nodes 10.0.0.50

# Get detailed partition information
talosctl get systemdisk --nodes 10.0.0.50 -o yaml

# View mount points
talosctl mounts --nodes 10.0.0.50
```

## Wiping the EPHEMERAL Partition

The EPHEMERAL partition is the most common target for selective wipes. It contains container images, pod data, and kubelet state. Wiping it clears out all cached data and forces the node to re-pull images and recreate pod storage.

```bash
# Reset with only the EPHEMERAL partition wiped
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe EPHEMERAL
```

After this operation, the node reboots with its machine configuration intact (from the STATE partition) and automatically rejoins the cluster. It will need to re-pull container images and restart all pods, but it does not need a new configuration applied.

### When to Wipe EPHEMERAL

- **Disk space issues**: If the ephemeral partition is full due to accumulated container images or pod logs
- **Corrupt kubelet state**: When kubelet gets into a bad state and restarting the service does not fix it
- **Stale container data**: After changing container runtimes or runtime configurations
- **Testing**: When you want to test node startup behavior without losing cluster membership

## Wiping the STATE Partition

The STATE partition contains the machine configuration and PKI material. Wiping it puts the node back into maintenance mode, requiring a fresh machine configuration:

```bash
# Reset with only the STATE partition wiped
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe STATE
```

After this reset, the node retains its EPHEMERAL data (which may be stale) but loses its configuration. You will need to apply a new machine configuration, and the node will rejoin the cluster as if it were new.

### When to Wipe STATE

- **Configuration corruption**: When the machine configuration is corrupted and cannot be patched
- **Certificate issues**: When PKI certificates are expired or compromised
- **Cluster migration**: When moving a node from one cluster to another
- **Security**: When decommissioning a node from a sensitive environment

## Wiping Both Partitions Selectively

You can specify multiple partition labels in a single reset command:

```bash
# Wipe both STATE and EPHEMERAL partitions
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe STATE \
  --system-labels-to-wipe EPHEMERAL
```

This is functionally equivalent to a full reset and is the most thorough way to clean a node while preserving the OS installation.

## Wiping User Data Disks

Beyond system partitions, your nodes may have additional disks used for persistent volumes, local storage, or application data. These are not affected by a standard reset unless you explicitly target them:

```bash
# Wipe a specific user data disk
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe EPHEMERAL \
  --user-disks-to-wipe /dev/sdb
```

You can target multiple disks:

```bash
# Wipe multiple user data disks
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true \
  --user-disks-to-wipe /dev/sdb \
  --user-disks-to-wipe /dev/sdc \
  --user-disks-to-wipe /dev/nvme1n1
```

### Identifying User Data Disks

Before wiping, identify which disks are which:

```bash
# List all disks and their partitions
talosctl disks --nodes 10.0.0.50

# View disk usage
talosctl get blockdevices --nodes 10.0.0.50

# Check what is mounted where
talosctl mounts --nodes 10.0.0.50
```

Be extremely careful with disk paths. Wiping the wrong disk can destroy your OS installation.

## Handling the META Partition

The META partition is special. It stores overlay configuration data that supplements the machine configuration. You generally do not need to wipe it independently, but you can include it in a reset:

```bash
# Wipe including META
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe STATE \
  --system-labels-to-wipe EPHEMERAL \
  --system-labels-to-wipe META
```

This is only necessary in special cases, such as when the META partition contains incorrect overlay data that is causing boot issues.

## Scripted Partition Management

For operational automation, script the partition wipe process:

```bash
#!/bin/bash
# wipe-ephemeral.sh - wipe ephemeral data on worker nodes
set -euo pipefail

NODE=$1
PARTITION="${2:-EPHEMERAL}"

echo "Preparing to wipe ${PARTITION} on ${NODE}..."

# Get the Kubernetes node name
NODE_NAME=$(talosctl get hostname --nodes "${NODE}" -o jsonpath='{.spec.hostname}')

# Drain the node first
echo "Draining ${NODE_NAME}..."
kubectl drain "${NODE_NAME}" \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=300s

# Perform the partition wipe
echo "Wiping ${PARTITION} on ${NODE}..."
talosctl reset --nodes "${NODE}" \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe "${PARTITION}"

# Wait for the node to come back
echo "Waiting for ${NODE} to rejoin the cluster..."
until talosctl health --nodes "${NODE}" 2>/dev/null; do
  sleep 10
done

# Uncordon the node
echo "Uncordoning ${NODE_NAME}..."
kubectl uncordon "${NODE_NAME}"

echo "Done! ${NODE} is back in the cluster."
```

## Verifying Partition State

After a partition wipe, verify that the expected partitions were cleared and that the node is healthy:

```bash
# Check partition sizes (a freshly wiped partition will be nearly empty)
talosctl disks --nodes 10.0.0.50

# Check system health
talosctl health --nodes 10.0.0.50

# For EPHEMERAL wipes, verify kubelet restarted
talosctl services --nodes 10.0.0.50 | grep kubelet

# Check that pods are being recreated
kubectl get pods --field-selector spec.nodeName=node-name --all-namespaces
```

## Partition Wipe vs Full Reset Comparison

| Action | STATE | EPHEMERAL | User Disks | Result |
|--------|-------|-----------|------------|--------|
| Full reset | Wiped | Wiped | Optional | Node enters maintenance mode |
| EPHEMERAL only | Kept | Wiped | Untouched | Node rejoins cluster automatically |
| STATE only | Wiped | Kept | Untouched | Node enters maintenance mode |
| User disks only | Kept | Kept | Wiped | Node continues running |

## Wrapping Up

Selective partition wiping gives you surgical control over Talos Linux node cleanup. Instead of reaching for a full reset every time something goes wrong, you can target exactly the data that needs to be cleared. Wiping EPHEMERAL fixes kubelet and container issues while keeping the node configured. Wiping STATE forces a reconfiguration without losing cached data. And targeting user disks lets you clean up persistent volume data independently. Understanding the partition layout and knowing which partition holds what data is key to efficient Talos node management.
