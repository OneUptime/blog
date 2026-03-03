# How to Reset a Talos Node While Preserving Ephemeral Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Node Reset, Data Preservation, Kubernetes, Operations

Description: Learn how to reset a Talos Linux node while keeping its ephemeral data intact, useful for reconfiguration without re-downloading container images.

---

When you need to reconfigure a Talos Linux node - perhaps to change its cluster membership, update certificates, or apply a completely new machine configuration - a full reset wipes everything, including gigabytes of cached container images and kubelet state. For nodes with slow network connections or large container image caches, re-downloading all that data can take a long time and consume significant bandwidth. Fortunately, Talos lets you reset the node's configuration while preserving the ephemeral data.

This guide explains when and how to perform a targeted reset that keeps the EPHEMERAL partition intact.

## Why Preserve Ephemeral Data?

The EPHEMERAL partition on a Talos Linux node contains several categories of data:

- **Container images**: All pulled container images are stored here. In a typical production cluster, this can be tens of gigabytes.
- **Kubelet state**: Pod sandbox data, volume mounts, and kubelet internal state.
- **Pod logs**: Container stdout/stderr logs before they are collected by a logging agent.
- **Temporary storage**: emptyDir volumes and other ephemeral pod storage.

When you perform a full reset, all of this data is wiped. The node then has to re-pull every container image when pods are scheduled back to it. On a node running 50+ pods with large images, this can mean downloading 20-30 GB of data, which takes significant time.

By preserving the ephemeral partition, the node keeps its container image cache. When pods are rescheduled, they can start almost immediately because the images are already local.

## How to Reset While Preserving Ephemeral Data

The key is using the `--system-labels-to-wipe` flag to target only the STATE partition:

```bash
# Reset only the STATE partition, keeping EPHEMERAL intact
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe STATE
```

This command:

1. Gracefully stops Kubernetes services on the node
2. Leaves the etcd cluster (if it is a control plane node)
3. Wipes only the STATE partition (machine config, certificates, and keys)
4. Reboots the node into maintenance mode
5. Leaves the EPHEMERAL partition untouched

After the reboot, the node is in maintenance mode and waiting for a new machine configuration. But its container image cache, kubelet data directory, and other ephemeral data are still on disk.

## Step-by-Step Workflow

### Step 1: Drain the Node

```bash
# Get the node name
NODE_IP="10.0.0.50"
NODE_NAME=$(kubectl get nodes -o wide | grep "${NODE_IP}" | awk '{print $1}')

# Drain the node
kubectl drain "${NODE_NAME}" \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=300s
```

### Step 2: Remove from Cluster

For control plane nodes, remove the etcd member first:

```bash
# Remove etcd member (control plane only)
MEMBER_ID=$(talosctl etcd members --nodes 10.0.0.10 | grep "${NODE_IP}" | awk '{print $2}')
talosctl etcd remove-member --nodes 10.0.0.10 "${MEMBER_ID}"
```

Delete the node from Kubernetes:

```bash
kubectl delete node "${NODE_NAME}"
```

### Step 3: Perform the Targeted Reset

```bash
# Reset only the STATE partition
talosctl reset --nodes "${NODE_IP}" \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe STATE
```

### Step 4: Apply New Configuration

After the node reboots into maintenance mode, apply the new configuration:

```bash
# Wait for the node to be reachable in maintenance mode
sleep 30

# Apply the new configuration
talosctl apply-config --insecure \
  --nodes "${NODE_IP}" \
  --file worker.yaml
```

### Step 5: Verify Recovery

```bash
# Wait for the node to join the cluster
kubectl get nodes --watch

# Check that the node is ready
talosctl health --nodes "${NODE_IP}" --wait-timeout 10m

# Verify container images are still cached
talosctl images --nodes "${NODE_IP}"
```

You should see that many container images are already present on the node, which means pods can start immediately without pulling.

## When This Approach Is Useful

### Cluster Migration

When moving a node from one cluster to another, you want to wipe the configuration and certificates but keep the cached data:

```bash
# Remove from old cluster
kubectl drain old-node --ignore-daemonsets --delete-emptydir-data
kubectl delete node old-node
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe STATE

# Apply new cluster's config
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file new-cluster-worker.yaml
```

### Certificate Renewal

If certificates have expired and you cannot renew them through normal means, a STATE-only reset forces new certificate generation:

```bash
# Reset STATE to clear expired certificates
talosctl reset --nodes 10.0.0.50 \
  --graceful=false \
  --reboot=true \
  --system-labels-to-wipe STATE

# Reapply config to generate new certificates
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file controlplane.yaml
```

### Configuration Corruption

When the machine configuration on the STATE partition is corrupted and the node will not boot properly:

```bash
# Wipe only STATE to clear the corrupt config
talosctl reset --nodes 10.0.0.50 \
  --graceful=false \
  --reboot=true \
  --system-labels-to-wipe STATE

# Apply a fresh, known-good configuration
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file known-good-worker.yaml
```

## Caveats and Considerations

### Stale Data

The preserved EPHEMERAL data may contain stale information from the previous cluster:

- **Kubelet state**: Kubelet stores state files that reference the old cluster. Talos handles this by resetting kubelet's internal state during the first boot with a new config, but in rare cases stale data can cause issues.
- **Container images**: Cached images from the old cluster remain. This is generally beneficial but can waste disk space if the new cluster uses completely different images.
- **Pod volumes**: Any emptyDir or local persistent volumes from old pods may remain until the space is reclaimed.

### When NOT to Preserve Ephemeral Data

There are situations where you should perform a full reset instead:

- **Security incidents**: If the node was compromised, wipe everything. Cached container images could contain malicious layers.
- **Major version upgrades**: When upgrading between major Talos versions, a full reset avoids any potential compatibility issues with cached data.
- **Disk corruption**: If you suspect disk issues, wiping EPHEMERAL helps rule out data corruption.

## Automating the Process

```bash
#!/bin/bash
# reconfigure-node.sh - reset config while preserving data
set -euo pipefail

NODE_IP=$1
NEW_CONFIG=$2

echo "Step 1: Draining node..."
NODE_NAME=$(kubectl get nodes -o wide | grep "${NODE_IP}" | awk '{print $1}')
kubectl drain "${NODE_NAME}" --ignore-daemonsets --delete-emptydir-data --timeout=300s || true
kubectl delete node "${NODE_NAME}" || true

echo "Step 2: Resetting STATE partition only..."
talosctl reset --nodes "${NODE_IP}" \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe STATE

echo "Step 3: Waiting for maintenance mode..."
sleep 45

echo "Step 4: Applying new configuration..."
talosctl apply-config --insecure \
  --nodes "${NODE_IP}" \
  --file "${NEW_CONFIG}"

echo "Step 5: Waiting for node to join the cluster..."
for i in $(seq 1 60); do
  if kubectl get node | grep -q "${NODE_IP}"; then
    echo "Node has joined the cluster!"
    break
  fi
  sleep 10
done

echo "Step 6: Verifying health..."
talosctl health --nodes "${NODE_IP}" --wait-timeout 10m

echo "Node ${NODE_IP} has been reconfigured successfully."
```

## Comparing Reset Strategies

| Strategy | STATE Wiped | EPHEMERAL Wiped | Downtime | Image Re-pulls | Use Case |
|----------|-------------|-----------------|----------|---------------|----------|
| Full reset | Yes | Yes | High | All images | Security, corruption |
| STATE only | Yes | No | Medium | Minimal | Reconfig, migration |
| EPHEMERAL only | No | Yes | Medium | All images | Cache cleanup, kubelet fix |
| No reset (patch) | No | No | Low | None | Minor config changes |

## Wrapping Up

Resetting a Talos node while preserving ephemeral data is a practical technique that saves time and bandwidth during reconfiguration. By targeting only the STATE partition, you clear the machine configuration and certificates while keeping the container image cache and other cached data intact. This approach is particularly valuable for nodes with large image caches, slow network connections, or when you simply need to apply a new configuration without starting from absolute zero. Understanding when to use a targeted reset versus a full wipe is an important part of operating Talos Linux clusters efficiently.
