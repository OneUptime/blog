# How to Reset a Talos Linux Node Completely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Node Reset, Cluster Management, Kubernetes, Operations

Description: A step-by-step guide to completely resetting a Talos Linux node, covering graceful resets, data cleanup, and rejoining the cluster from scratch.

---

There are plenty of situations where you need to start fresh with a Talos Linux node. Maybe you are decommissioning a node and want to repurpose the hardware. Maybe a configuration went sideways and you want a clean slate. Or maybe you are testing disaster recovery procedures and need to simulate a complete node loss. Whatever the reason, Talos provides built-in tools for performing a complete node reset.

This guide walks through the full process of resetting a Talos Linux node, including the preparation steps, the reset itself, and what happens after.

## Understanding What a Reset Does

A complete reset on Talos Linux wipes all data partitions and returns the node to its initial state. Specifically, it:

- Removes the STATE partition (which contains the machine configuration and PKI material)
- Removes the EPHEMERAL partition (which contains kubelet data, container images, and pod volumes)
- Optionally removes user data on extra disks
- Reboots the node into maintenance mode, where it waits for a new machine configuration

After a complete reset, the node is essentially a fresh installation. It has no cluster membership, no certificates, and no workload data.

## Before You Reset

### Drain the Node

Before resetting, drain the node to move workloads to other nodes in the cluster:

```bash
# Cordon the node to prevent new pods from being scheduled
kubectl cordon node-name

# Drain the node, evicting all pods
kubectl drain node-name \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=300s

# Verify the node is drained
kubectl get pods --all-namespaces --field-selector spec.nodeName=node-name
```

### Remove from the Cluster

For control plane nodes, you should also remove the etcd member:

```bash
# List etcd members to find the member ID
talosctl etcd members --nodes 10.0.0.10

# Remove the etcd member for the node being reset
talosctl etcd remove-member --nodes 10.0.0.10 <member-id>
```

For worker nodes, simply deleting the node object is sufficient:

```bash
# Delete the Kubernetes node object
kubectl delete node node-name
```

## Performing a Complete Reset

The reset command is straightforward:

```bash
# Complete reset of a Talos node
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true
```

The flags control the behavior:

- `--graceful=true` (default): Attempts to leave the etcd cluster and cordon/drain the node before wiping. This is the recommended approach for nodes that are still functioning normally.
- `--reboot=true` (default): Reboots the node after wiping. The node comes back in maintenance mode.

### What Happens During the Reset

1. **Graceful shutdown**: If `--graceful` is set, Talos attempts to leave the etcd cluster (for control plane nodes) and stops all Kubernetes workloads.
2. **Partition wipe**: The STATE and EPHEMERAL partitions are wiped. The BOOT partition (containing the Talos OS itself) is preserved.
3. **Reboot**: The node reboots and enters maintenance mode.
4. **Waiting for config**: The node broadcasts its presence on the network and waits for a new machine configuration.

## Resetting Without Reboot

Sometimes you want to reset the data but shut down the node instead of rebooting:

```bash
# Reset and shut down instead of rebooting
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=false
```

This is useful when you plan to physically remove the server or change its hardware configuration before bringing it back.

## Resetting with User Disk Wipe

If you want to wipe additional disks (beyond the Talos system partitions), you can specify them:

```bash
# Reset and also wipe specific user data disks
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true \
  --user-disks-to-wipe /dev/sdb \
  --user-disks-to-wipe /dev/sdc
```

This is important when your nodes have dedicated data disks for persistent volumes or local storage. Without this flag, those disks retain their data through the reset.

## Rejoining the Cluster After Reset

After the reset completes and the node reboots into maintenance mode, you can reconfigure it:

```bash
# Apply a new machine configuration to the reset node
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file worker.yaml

# Wait for the node to join the cluster
kubectl get nodes --watch
```

For control plane nodes, you need to be more careful about the machine configuration to ensure the etcd cluster remains healthy:

```bash
# Apply control plane config
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file controlplane.yaml

# The node will automatically attempt to join the existing etcd cluster
# Monitor the process
talosctl health --nodes 10.0.0.50 --wait-timeout 10m
```

## Resetting Multiple Nodes

When resetting multiple nodes, the order matters, especially for control plane nodes:

```bash
#!/bin/bash
# reset-workers.sh - reset all worker nodes
set -euo pipefail

WORKER_NODES=("10.0.0.20" "10.0.0.21" "10.0.0.22")

for node in "${WORKER_NODES[@]}"; do
  echo "Draining and resetting ${node}..."

  # Drain in Kubernetes
  NODE_NAME=$(kubectl get nodes -o jsonpath="{.items[?(@.status.addresses[?(@.type=='InternalIP')].address=='${node}')].metadata.name}")
  kubectl drain "${NODE_NAME}" --ignore-daemonsets --delete-emptydir-data --timeout=300s
  kubectl delete node "${NODE_NAME}"

  # Reset the Talos node
  talosctl reset --nodes "${node}" --graceful=true --reboot=true

  echo "${node} has been reset"
done
```

Never reset all control plane nodes at once. Always maintain a quorum in the etcd cluster. If you have three control plane nodes, you can safely reset one at a time, waiting for it to rejoin before resetting the next.

## Verifying the Reset

After a reset, verify that the node is in the expected state:

```bash
# Check if the node is in maintenance mode (before applying config)
talosctl get machinestatus --nodes 10.0.0.50 --insecure

# After applying config and joining the cluster, check health
talosctl health --nodes 10.0.0.50

# Verify in Kubernetes
kubectl get node node-name -o wide
kubectl describe node node-name
```

## Troubleshooting Reset Issues

### Reset Hangs

If the reset command hangs, the node may be stuck trying to gracefully leave the cluster. Use a non-graceful reset:

```bash
# Force reset without graceful shutdown
talosctl reset --nodes 10.0.0.50 \
  --graceful=false \
  --reboot=true
```

### Node Does Not Enter Maintenance Mode

If the node reboots but does not enter maintenance mode, the STATE partition may not have been fully wiped. This can happen with certain disk configurations. Try resetting with explicit system disk targeting:

```bash
# Specify the system disk explicitly
talosctl reset --nodes 10.0.0.50 \
  --graceful=false \
  --reboot=true \
  --system-labels-to-wipe STATE \
  --system-labels-to-wipe EPHEMERAL
```

### Cannot Reach the Node After Reset

After reset, the node gets a new IP address via DHCP unless you have static IP configuration in the machine config. Check your DHCP server logs or use a network scanner to find the node:

```bash
# Scan the network for Talos nodes in maintenance mode
talosctl cluster show --nodes 10.0.0.0/24
```

## Wrapping Up

Completely resetting a Talos Linux node is a well-defined, predictable operation. The combination of graceful cluster leave, partition wipe, and reboot into maintenance mode gives you a clean path from a running cluster member back to bare hardware ready for reprovisioning. By following the proper drain and removal procedures before the reset, you ensure that workloads are not disrupted and that the cluster remains healthy throughout the process. Whether you are rotating hardware, recovering from problems, or simply starting over, the reset workflow gives you confidence that the node is truly clean.
