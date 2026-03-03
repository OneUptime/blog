# How to Reset Talos Linux to Maintenance Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Maintenance Mode, Node Recovery, Kubernetes, Operations

Description: Learn how to reset a Talos Linux node back to maintenance mode for reconfiguration, troubleshooting, and recovery scenarios.

---

Maintenance mode is a special state in Talos Linux where the node is running but has no machine configuration applied. It is the state a fresh Talos installation enters after the first boot, and it is the state you return to when you need to reconfigure a node from scratch. The node runs a minimal set of services, accepts configuration over the network, and waits for you to tell it what to do.

This guide explains maintenance mode in detail and covers the various ways to put a node back into this state.

## What Is Maintenance Mode?

When a Talos node boots without a machine configuration, it enters maintenance mode. In this state:

- The Talos API is available but only accepts unauthenticated requests (since there are no certificates yet)
- No Kubernetes services are running
- The node obtains an IP address via DHCP (or uses the last known static configuration if any)
- The node is ready to receive a machine configuration via `talosctl apply-config --insecure`

Maintenance mode is essentially the "blank slate" state. From here, you can configure the node as any role in any cluster.

## Returning a Node to Maintenance Mode

### Method 1: Reset the STATE Partition

The most common way to reach maintenance mode is by wiping the STATE partition, which contains the machine configuration:

```bash
# Drain and remove from the cluster first
kubectl drain node-name --ignore-daemonsets --delete-emptydir-data
kubectl delete node node-name

# For control plane nodes, also remove the etcd member
talosctl etcd remove-member --nodes 10.0.0.11 <member-id>

# Reset STATE to enter maintenance mode
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe STATE
```

After the reboot, the node enters maintenance mode with its EPHEMERAL data intact.

### Method 2: Full Reset

A complete reset also returns the node to maintenance mode, but wipes all data:

```bash
# Full reset - wipes everything and enters maintenance mode
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true
```

### Method 3: Boot from ISO

If the node is unresponsive, boot from a Talos ISO. The ISO always boots into maintenance mode regardless of what is on the disk:

```bash
# Boot from ISO through IPMI virtual media or USB
# The node enters maintenance mode automatically
# Then apply a config that will install to disk
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file worker.yaml
```

## Interacting with a Node in Maintenance Mode

### Discovering Nodes

Nodes in maintenance mode can be discovered on your network:

```bash
# Use talosctl to discover nodes in maintenance mode
talosctl cluster show

# Or scan a subnet for Talos maintenance mode nodes
# Talos listens on port 50000 in maintenance mode
nmap -p 50000 10.0.0.0/24
```

### Checking Node Status

Connect to a maintenance mode node using the `--insecure` flag (since there are no certificates):

```bash
# Get version information
talosctl version --nodes 10.0.0.50 --insecure

# Get basic machine info
talosctl get machinestatus --nodes 10.0.0.50 --insecure

# List disks
talosctl disks --nodes 10.0.0.50 --insecure
```

### Viewing Network Configuration

```bash
# Check current network configuration
talosctl get addresses --nodes 10.0.0.50 --insecure

# View network interfaces
talosctl get links --nodes 10.0.0.50 --insecure
```

## Configuring a Node from Maintenance Mode

Once you have a node in maintenance mode, apply a machine configuration:

```bash
# Generate machine configs for a new cluster
talosctl gen config my-cluster https://10.0.0.1:6443

# Apply control plane config
talosctl apply-config --insecure \
  --nodes 10.0.0.10 \
  --file controlplane.yaml

# Apply worker config
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file worker.yaml
```

The node will:
1. Accept the configuration
2. Write it to the STATE partition
3. Install Talos to disk (if not already installed)
4. Reboot into the configured state
5. Start Kubernetes services and join the cluster

## Use Cases for Maintenance Mode

### Reconfiguring a Node for a Different Cluster

```bash
# Reset to maintenance mode
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe STATE

# Wait for maintenance mode
sleep 45

# Apply config for the new cluster
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file new-cluster-worker.yaml
```

### Changing Node Role

To change a worker to a control plane node (or vice versa):

```bash
# Remove from cluster
kubectl drain worker-node --ignore-daemonsets --delete-emptydir-data
kubectl delete node worker-node

# Reset to maintenance mode
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe STATE \
  --system-labels-to-wipe EPHEMERAL

# Apply control plane config
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file controlplane.yaml
```

### Troubleshooting Boot Issues

If a node is not booting correctly after a configuration change, you can go back to maintenance mode to fix the issue:

```bash
# Reset to maintenance mode to clear the bad config
talosctl reset --nodes 10.0.0.50 \
  --graceful=false \
  --reboot=true \
  --system-labels-to-wipe STATE

# Apply a corrected configuration
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file corrected-config.yaml
```

### Testing Machine Configurations

Maintenance mode is useful for testing new machine configurations without disrupting production:

```bash
# Put a test node in maintenance mode
talosctl reset --nodes 10.0.0.99 \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe STATE

# Apply the new config to test
talosctl apply-config --insecure \
  --nodes 10.0.0.99 \
  --file experimental-config.yaml

# If it does not work, reset and try again
talosctl reset --nodes 10.0.0.99 \
  --graceful=false \
  --reboot=true \
  --system-labels-to-wipe STATE
```

## Automating Maintenance Mode Workflows

For fleet management, script the process of cycling nodes through maintenance mode:

```bash
#!/bin/bash
# reconfigure-fleet.sh - reconfigure all worker nodes with a new config
set -euo pipefail

NEW_CONFIG=$1
WORKER_NODES=("10.0.0.20" "10.0.0.21" "10.0.0.22" "10.0.0.23")

for node in "${WORKER_NODES[@]}"; do
  echo "=== Processing ${node} ==="

  # Get node name
  NODE_NAME=$(kubectl get nodes -o wide | grep "${node}" | awk '{print $1}')

  # Drain
  echo "Draining ${NODE_NAME}..."
  kubectl drain "${NODE_NAME}" --ignore-daemonsets --delete-emptydir-data --timeout=300s

  # Delete node object
  kubectl delete node "${NODE_NAME}"

  # Reset to maintenance mode
  echo "Resetting to maintenance mode..."
  talosctl reset --nodes "${node}" \
    --graceful=true \
    --reboot=true \
    --system-labels-to-wipe STATE

  # Wait for maintenance mode
  echo "Waiting for maintenance mode..."
  for i in $(seq 1 30); do
    if talosctl version --nodes "${node}" --insecure 2>/dev/null; then
      break
    fi
    sleep 10
  done

  # Apply new config
  echo "Applying new configuration..."
  talosctl apply-config --insecure \
    --nodes "${node}" \
    --file "${NEW_CONFIG}"

  # Wait for node to rejoin
  echo "Waiting for node to rejoin..."
  for i in $(seq 1 60); do
    if kubectl get nodes | grep -q "Ready"; then
      NEW_NODE=$(kubectl get nodes -o wide | grep "${node}" | awk '{print $1}')
      if [ -n "${NEW_NODE}" ]; then
        echo "${node} has rejoined as ${NEW_NODE}"
        break
      fi
    fi
    sleep 10
  done

  echo "=== ${node} complete ==="
  echo ""
done

echo "All nodes reconfigured."
```

## Security Considerations

Maintenance mode accepts unauthenticated API requests, which is necessary because the node has no certificates. This means:

- Anyone on the network can connect to a maintenance mode node
- Anyone can apply a machine configuration
- The node trusts the first configuration it receives

To mitigate these risks:

- Keep maintenance mode exposure brief. Apply configuration as soon as possible after entering maintenance mode.
- Use network segmentation to restrict access to the management network.
- Monitor for unexpected nodes in maintenance mode, which could indicate a security issue.

## Wrapping Up

Maintenance mode is a fundamental part of the Talos Linux lifecycle. It serves as the entry point for new nodes and the recovery point for existing ones. Whether you need to reconfigure a node for a different cluster, change its role, fix a broken configuration, or test new settings, maintenance mode gives you a clean starting point. Understanding how to enter and exit maintenance mode efficiently is essential for anyone operating Talos Linux clusters.
