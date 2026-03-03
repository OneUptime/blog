# How to Perform Rolling Upgrades in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Rolling Upgrade, Cluster Maintenance, Zero Downtime, Kubernetes

Description: Learn how to perform rolling upgrades in Talos Linux to update nodes one at a time while maintaining cluster availability and minimizing workload disruption.

---

Rolling upgrades are the standard approach for updating a Talos Linux cluster without taking the entire cluster offline. By upgrading nodes one at a time and waiting for each to recover before moving to the next, you maintain cluster availability throughout the process. This guide covers the strategy, tooling, and scripts you need to perform rolling upgrades effectively.

## What Is a Rolling Upgrade?

A rolling upgrade updates cluster nodes sequentially rather than all at once. In a Talos Linux cluster, this means:

1. Pick a node to upgrade
2. Drain workloads from that node
3. Upgrade the Talos OS on that node
4. Wait for the node to reboot and rejoin the cluster
5. Uncordon the node so workloads can be scheduled again
6. Move to the next node

By processing one node at a time, the cluster always has enough healthy nodes to run your workloads. The Kubernetes scheduler automatically redistributes pods to available nodes during the drain step.

## Planning the Upgrade Order

The upgrade order matters. Control plane nodes should be upgraded before worker nodes because:

- Control plane components need to be running a consistent version
- etcd quorum must be maintained throughout the upgrade
- Worker node kubelets must be compatible with the control plane version

```
Recommended Order:
  1. Control plane node 1
  2. Control plane node 2
  3. Control plane node 3
  4. Worker node 1
  5. Worker node 2
  ... and so on
```

For a cluster with three control plane nodes, you always have at least two healthy control plane nodes at any point during the rolling upgrade, which maintains etcd quorum.

## Manual Rolling Upgrade Process

### Upgrading a Control Plane Node

```bash
# Step 1: Verify cluster health before starting
kubectl get nodes
talosctl etcd status --nodes 192.168.1.10

# Step 2: Upgrade the first control plane node
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Step 3: Wait for the node to come back
# The node will reboot automatically
talosctl health --nodes 192.168.1.10 --wait-timeout 10m

# Step 4: Verify the upgrade succeeded
talosctl version --nodes 192.168.1.10

# Step 5: Verify etcd recovered
talosctl etcd status --nodes 192.168.1.10
talosctl etcd members --nodes 192.168.1.10

# Step 6: Check Kubernetes health
kubectl get nodes
kubectl get pods -n kube-system

# Wait a few minutes, then proceed to the next control plane node
```

### Upgrading a Worker Node

Worker node upgrades are simpler because there is no etcd to worry about:

```bash
# Step 1: Drain the worker node
kubectl drain worker-01 --ignore-daemonsets --delete-emptydir-data --timeout=300s

# Step 2: Upgrade the node
talosctl upgrade --nodes 192.168.1.20 \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Step 3: Wait for the node to come back
talosctl health --nodes 192.168.1.20 --wait-timeout 5m

# Step 4: Uncordon the node
kubectl uncordon worker-01

# Step 5: Verify workloads are running
kubectl get pods --field-selector spec.nodeName=worker-01
```

## Automated Rolling Upgrade Script

For clusters with many nodes, automating the rolling upgrade saves time and reduces the chance of human error:

```bash
#!/bin/bash
# Automated rolling upgrade script for Talos Linux

TALOS_IMAGE="ghcr.io/siderolabs/installer:v1.7.0"
HEALTH_TIMEOUT="10m"
DRAIN_TIMEOUT="300s"
PAUSE_BETWEEN_NODES=60  # seconds

# Control plane nodes (upgrade first)
CP_NODES=("192.168.1.10" "192.168.1.11" "192.168.1.12")

# Worker nodes (upgrade after control plane)
WORKER_NODES=("192.168.1.20" "192.168.1.21" "192.168.1.22" "192.168.1.23")

upgrade_node() {
  local NODE=$1
  local NODE_TYPE=$2

  echo "=========================================="
  echo "Upgrading $NODE_TYPE node: $NODE"
  echo "=========================================="

  # Get Kubernetes hostname
  local HOSTNAME
  HOSTNAME=$(talosctl get hostname --nodes "$NODE" -o json 2>/dev/null | jq -r '.spec.hostname')

  if [ "$NODE_TYPE" = "worker" ]; then
    echo "  Draining workloads from $HOSTNAME..."
    kubectl drain "$HOSTNAME" \
      --ignore-daemonsets \
      --delete-emptydir-data \
      --timeout="$DRAIN_TIMEOUT" || {
        echo "  WARNING: Drain failed, proceeding anyway"
      }
  fi

  echo "  Initiating upgrade..."
  talosctl upgrade --nodes "$NODE" --image "$TALOS_IMAGE"

  echo "  Waiting for node to come back..."
  sleep 30  # Give the node time to start rebooting

  talosctl health --nodes "$NODE" --wait-timeout "$HEALTH_TIMEOUT" || {
    echo "  ERROR: Node $NODE did not become healthy"
    echo "  Manual intervention may be needed"
    return 1
  }

  if [ "$NODE_TYPE" = "worker" ]; then
    echo "  Uncordoning $HOSTNAME..."
    kubectl uncordon "$HOSTNAME"
  fi

  # Verify version
  local NEW_VERSION
  NEW_VERSION=$(talosctl version --nodes "$NODE" 2>/dev/null | grep "Tag:" | tail -1 | awk '{print $2}')
  echo "  Node $NODE is now running: $NEW_VERSION"

  echo "  Pausing $PAUSE_BETWEEN_NODES seconds before next node..."
  sleep "$PAUSE_BETWEEN_NODES"

  return 0
}

# Upgrade control plane nodes first
echo "Starting control plane node upgrades..."
for NODE in "${CP_NODES[@]}"; do
  upgrade_node "$NODE" "controlplane" || {
    echo "ABORTING: Control plane upgrade failed"
    exit 1
  }

  # Extra verification for control plane
  echo "  Checking etcd health..."
  talosctl etcd status --nodes "$NODE"
done

echo ""
echo "Control plane upgrade complete. Starting worker upgrades..."
echo ""

# Upgrade worker nodes
for NODE in "${WORKER_NODES[@]}"; do
  upgrade_node "$NODE" "worker" || {
    echo "WARNING: Worker node $NODE upgrade had issues"
    echo "Check the node manually before continuing"
    read -p "Continue with next node? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  }
done

echo ""
echo "=========================================="
echo "Rolling upgrade complete!"
echo "=========================================="
echo ""

# Final verification
echo "Final cluster status:"
kubectl get nodes -o wide
```

## Handling Pod Disruption Budgets

Pod Disruption Budgets (PDBs) control how many pods of a particular application can be unavailable during voluntary disruptions like drains. During a rolling upgrade, PDBs can slow down or block the drain process.

```yaml
# Example PDB that allows one pod to be unavailable
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web-app
```

If a PDB blocks the drain:

```bash
# The drain will wait until the PDB allows disruption
kubectl drain worker-01 --ignore-daemonsets --delete-emptydir-data \
  --timeout=600s  # Give more time for PDB-constrained workloads

# If the drain is stuck, check PDB status
kubectl get pdb --all-namespaces

# As a last resort (not recommended for production):
kubectl drain worker-01 --ignore-daemonsets --delete-emptydir-data \
  --disable-eviction  # Bypasses PDBs - use with caution
```

## Monitoring the Rolling Upgrade

During the upgrade, keep an eye on cluster health:

```bash
# In a separate terminal, watch node status
kubectl get nodes -w

# Watch pod status across the cluster
kubectl get pods --all-namespaces -w

# Monitor etcd during control plane upgrades
watch -n 5 'talosctl etcd members --nodes 192.168.1.10 2>/dev/null'
```

If you have Prometheus and Grafana, monitor:
- Node availability (node_up metric)
- Pod restarts (kube_pod_container_status_restarts_total)
- etcd leader changes (etcd_server_leader_changes_seen_total)
- API server availability (apiserver_request_total)

## Rollback During a Rolling Upgrade

If you discover a problem mid-upgrade, you have options:

```bash
# Stop upgrading further nodes (just stop running the script)

# For nodes already upgraded that have issues:
# Option 1: The automatic A/B boot rollback may have already kicked in
talosctl version --nodes 192.168.1.10  # Check if it rolled back

# Option 2: Manually upgrade back to the previous version
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.6.0
```

The fact that you are doing a rolling upgrade limits the blast radius. Only one node at a time is affected, so the rest of the cluster continues running normally.

## Upgrade Speed vs Safety

There is a tradeoff between upgrade speed and safety:

**Maximum safety (recommended for production):**
- Upgrade one node at a time
- Wait 5-10 minutes between nodes
- Verify all health checks between each node
- Stop at any sign of trouble

**Faster upgrades (suitable for staging):**
- Upgrade worker nodes in batches of 2-3
- Shorter pauses between nodes
- Automated script without manual checkpoints

```bash
# Faster worker upgrade with parallel batches
# Only do this if you have enough cluster capacity
BATCH_SIZE=3
for ((i=0; i<${#WORKER_NODES[@]}; i+=BATCH_SIZE)); do
  BATCH=("${WORKER_NODES[@]:i:BATCH_SIZE}")
  echo "Upgrading batch: ${BATCH[*]}"

  for NODE in "${BATCH[@]}"; do
    talosctl upgrade --nodes "$NODE" --image "$TALOS_IMAGE" &
  done
  wait  # Wait for all nodes in the batch to finish

  echo "Batch complete, verifying health..."
  sleep 120
  kubectl get nodes
done
```

## Best Practices

1. Always test the upgrade in a staging environment first
2. Read the release notes for every version between your current and target version
3. Take etcd snapshots before starting
4. Have a rollback plan ready
5. Schedule upgrades during low-traffic periods
6. Monitor the cluster throughout the process
7. Do not rush - the pause between nodes is valuable for catching issues early

## Conclusion

Rolling upgrades in Talos Linux are the safest way to update your cluster while maintaining availability. By upgrading nodes one at a time and verifying health between each step, you limit the impact of any issues and maintain the ability to roll back. Whether you do it manually or with an automated script, the key principles remain the same: upgrade control plane first, drain before upgrading workers, verify health at every step, and never rush the process.
