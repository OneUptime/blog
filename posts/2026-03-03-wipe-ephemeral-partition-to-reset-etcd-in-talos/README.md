# How to Wipe EPHEMERAL Partition to Reset etcd in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, EPHEMERAL Partition, etcd, Reset, Kubernetes, Partition Management

Description: Learn how to wipe the EPHEMERAL partition in Talos Linux to reset etcd data and prepare nodes for recovery or fresh bootstrap.

---

The EPHEMERAL partition in Talos Linux holds all the runtime data that is expected to be lost on reset or reinstall. This includes the etcd data directory, kubelet state, containerd images, and other transient data. Wiping this partition is the primary way to reset etcd on a Talos node without doing a full reinstall. This guide explains when and how to do it safely.

## Understanding the EPHEMERAL Partition

Talos Linux uses a specific disk partition layout:

- **EFI** - Boot partition (EFI System Partition)
- **BIOS** - BIOS boot partition (for legacy boot)
- **BOOT** - Contains the bootloader configuration
- **META** - Stores Talos metadata
- **STATE** - Stores the machine configuration and state
- **EPHEMERAL** - Runtime data (etcd, kubelet, containerd)

The EPHEMERAL partition is the largest partition and holds everything that accumulates during normal operation.

```bash
# View the partition layout on a Talos node
talosctl get disks --nodes <node-ip>

# View mount points
talosctl get mounts --nodes <node-ip>

# The EPHEMERAL partition is typically mounted at /var
```

## What Lives on the EPHEMERAL Partition

```bash
# The EPHEMERAL partition contains:
# /var/lib/etcd/          - etcd database and WAL files
# /var/lib/kubelet/       - kubelet data, pod manifests, volumes
# /var/lib/containerd/    - container images and layers
# /var/log/               - system logs
# /var/run/               - runtime state files

# You can explore the contents
talosctl ls /var/lib/etcd --nodes <cp-node-ip>
talosctl ls /var/lib/kubelet --nodes <node-ip>
```

## When to Wipe the EPHEMERAL Partition

Wipe the EPHEMERAL partition in these situations:

1. **etcd data corruption** - When etcd cannot start due to corrupted data files
2. **Cluster recovery** - Before bootstrapping from an etcd backup
3. **Removing a node from one cluster to join another** - Clearing the old cluster's state
4. **Resetting a stuck node** - When services are in a bad state and cannot recover
5. **Troubleshooting persistent issues** - When you suspect stale state is causing problems

Do NOT wipe EPHEMERAL when:

- etcd is healthy and you just need a service restart
- The issue is in the machine configuration (wipe STATE instead or apply-config)
- You want to preserve the etcd data for investigation

## How to Wipe EPHEMERAL

### Using talosctl reset

The standard way to wipe the EPHEMERAL partition:

```bash
# Wipe only the EPHEMERAL partition
talosctl reset --nodes <node-ip> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false
```

Let us break down the flags:

- `--system-labels-to-wipe EPHEMERAL` - Specifies which partition to wipe. Without this, `reset` wipes everything including the OS.
- `--graceful=false` - Skips the Kubernetes drain and cordon steps. Use this when the cluster is not operational.

For a graceful reset (when the cluster is still working):

```bash
# Graceful reset - drains the node first
talosctl reset --nodes <node-ip> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=true
```

### What Happens During the Wipe

1. If graceful, the node is cordoned and drained in Kubernetes
2. System services (etcd, kubelet, containerd) are stopped
3. The EPHEMERAL partition is reformatted
4. The node reboots
5. Services start fresh with empty data directories

```bash
# Monitor the reset process
talosctl dmesg --nodes <node-ip> --follow

# After reboot, verify the partition is clean
talosctl ls /var/lib/etcd --nodes <node-ip>
# Should be empty or not exist yet
```

## Wiping EPHEMERAL on All Control Plane Nodes

For a full cluster recovery, you typically need to wipe all control plane nodes:

```bash
#!/bin/bash
# wipe-all-cp-ephemeral.sh

CP_NODES=("10.0.0.1" "10.0.0.2" "10.0.0.3")

echo "WARNING: This will wipe etcd data on all control plane nodes"
echo "Make sure you have an etcd backup before proceeding"
read -p "Continue? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    echo "Aborted"
    exit 1
fi

# Wipe all control plane nodes
for node in "${CP_NODES[@]}"; do
    echo "Wiping EPHEMERAL on ${node}..."
    talosctl reset --nodes ${node} \
      --system-labels-to-wipe EPHEMERAL \
      --graceful=false &
done

# Wait for all resets to complete
wait
echo "All nodes reset. Waiting for reboots..."

# Wait for nodes to come back
sleep 60

for node in "${CP_NODES[@]}"; do
    echo "Checking ${node}..."
    until talosctl version --nodes ${node} 2>/dev/null; do
        sleep 5
    done
    echo "${node} is back online"
done

echo "All control plane nodes wiped and ready for bootstrap"
```

## Wiping EPHEMERAL on a Single Worker Node

Worker nodes can be wiped more freely since they do not affect etcd:

```bash
# Gracefully drain and reset a worker
NODE_NAME=$(kubectl get nodes -o wide | grep <worker-ip> | awk '{print $1}')

# Drain the node first
kubectl cordon ${NODE_NAME}
kubectl drain ${NODE_NAME} --ignore-daemonsets --delete-emptydir-data --timeout=300s

# Wipe EPHEMERAL
talosctl reset --nodes <worker-ip> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false

# Wait for the node to come back
until talosctl version --nodes <worker-ip> 2>/dev/null; do
    sleep 5
done

# Uncordon
kubectl uncordon ${NODE_NAME}
```

## Verifying the Wipe

After the EPHEMERAL partition is wiped and the node reboots:

```bash
# Check that etcd data is gone
talosctl ls /var/lib/etcd --nodes <node-ip>
# Should show an empty or nonexistent directory

# Check services
talosctl services --nodes <node-ip>

# On a control plane node, etcd should be waiting for bootstrap
# On a worker node, kubelet should be trying to connect

# Verify the machine config is still present
# (EPHEMERAL wipe does NOT touch the machine config)
talosctl get machineconfig --nodes <node-ip>
```

## What Is Preserved After EPHEMERAL Wipe

The EPHEMERAL wipe only affects runtime data. These are preserved:

- **Machine configuration** (stored on STATE partition)
- **Talos OS installation** (stored on BOOT/EFI partitions)
- **System extensions** (part of the OS image)
- **META data** (network configuration metadata)

This means after a wipe, the node boots with the same Talos version, same machine config, and same extensions - just without any runtime state.

## Wiping vs. Full Reset

There are different levels of reset in Talos:

```bash
# Wipe only EPHEMERAL (most common for etcd reset)
talosctl reset --nodes <node-ip> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false

# Wipe EPHEMERAL and STATE (removes machine config too)
talosctl reset --nodes <node-ip> \
  --system-labels-to-wipe EPHEMERAL \
  --system-labels-to-wipe STATE \
  --graceful=false

# Full reset (wipes everything, node goes back to maintenance mode)
talosctl reset --nodes <node-ip> \
  --graceful=false
```

Choose the level of wipe based on what you need:

- Just resetting etcd? Wipe EPHEMERAL only.
- Need to reapply configuration? Wipe EPHEMERAL and STATE.
- Complete node reset? Full reset.

## Troubleshooting Wipe Issues

### Reset Command Hangs

```bash
# If the reset command hangs, the node might be
# waiting for a graceful shutdown

# Use --graceful=false to force it
talosctl reset --nodes <node-ip> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false

# If it still hangs, try a hard reboot
talosctl reboot --nodes <node-ip> --mode powercycle
```

### Node Does Not Come Back After Wipe

```bash
# Check the node's console output
# (BMC console, VM console, cloud serial console)

# Common issues:
# - Network configuration lost (check META partition)
# - Boot order changed
# - Hardware failure during reboot
```

### etcd Still Has Old Data After Wipe

```bash
# This should not happen, but if it does:
# Verify the wipe actually completed
talosctl dmesg --nodes <node-ip> | grep -i "ephemeral\|wipe\|format"

# If the node did not actually wipe, try again
talosctl reset --nodes <node-ip> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false
```

## Summary

Wiping the EPHEMERAL partition in Talos Linux is the standard way to reset etcd and other runtime data without reinstalling the OS. The command is `talosctl reset --system-labels-to-wipe EPHEMERAL --graceful=false`. It preserves the machine configuration and OS installation while clearing etcd data, kubelet state, and container images. Use it before cluster recovery from backup, when etcd data is corrupted, or when you need to cleanly reset a node's runtime state. Always make sure you have an etcd backup before wiping control plane nodes.
