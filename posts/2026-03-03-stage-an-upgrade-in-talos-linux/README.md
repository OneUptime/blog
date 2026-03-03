# How to Stage an Upgrade in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Staged Upgrade, Maintenance Window, Upgrade Planning, Kubernetes

Description: Learn how to stage upgrades in Talos Linux to prepare nodes for an upgrade ahead of time and apply the changes during a controlled maintenance window.

---

Staging an upgrade in Talos Linux lets you separate the preparation phase from the execution phase. Instead of downloading the new image and rebooting immediately, you can pre-load the upgrade on all nodes and then trigger the actual reboot during a planned maintenance window. This approach gives you more control over when the disruption happens and reduces the time nodes spend rebooting during the maintenance window.

## What Does Staging an Upgrade Mean?

When you stage an upgrade in Talos Linux, the system downloads the new installer image and writes the new kernel and initramfs to the inactive boot slot, but it does not reboot the node. The node continues running the current version until you explicitly reboot it.

```
Normal Upgrade:
  1. Download new image     -|
  2. Write to inactive slot  |-- Happens immediately
  3. Reboot the node        -|

Staged Upgrade:
  1. Download new image     -|
  2. Write to inactive slot  |-- Happens during staging
  3. (Node keeps running)   -|

  ... later, during maintenance window ...

  4. Reboot the node        --- Happens when you are ready
```

This decoupling is useful when you need to coordinate upgrades with other teams, plan around business hours, or prepare many nodes in advance.

## Staging an Upgrade on a Single Node

The `--stage` flag tells Talos to prepare the upgrade without rebooting:

```bash
# Stage an upgrade on a specific node
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --stage

# The command completes quickly - the node does NOT reboot
# The new image is downloaded and written to the inactive boot slot
```

After staging, you can verify that the upgrade was staged:

```bash
# Check machine status for upgrade information
talosctl get machinestatus --nodes 192.168.1.10 -o yaml

# You should see information about the staged upgrade
```

The node continues running normally on the current version. No workloads are disrupted.

## Staging Across Multiple Nodes

You can stage upgrades on all nodes in advance, then reboot them during the maintenance window:

```bash
#!/bin/bash
# Stage upgrades on all nodes
TALOS_IMAGE="ghcr.io/siderolabs/installer:v1.7.0"

ALL_NODES=(
  "192.168.1.10"  # cp-01
  "192.168.1.11"  # cp-02
  "192.168.1.12"  # cp-03
  "192.168.1.20"  # worker-01
  "192.168.1.21"  # worker-02
  "192.168.1.22"  # worker-03
  "192.168.1.23"  # worker-04
)

echo "Staging upgrades on all nodes..."
for NODE in "${ALL_NODES[@]}"; do
  echo "  Staging on $NODE..."
  talosctl upgrade --nodes "$NODE" \
    --image "$TALOS_IMAGE" \
    --stage
  echo "  $NODE staged successfully"
done

echo ""
echo "All nodes staged. Upgrades will apply on next reboot."
echo "Run the apply script during the maintenance window."
```

Since staging does not reboot the nodes, you can run this during business hours without any impact on running workloads.

## Applying the Staged Upgrade

During your maintenance window, trigger the reboots. For a rolling upgrade, reboot nodes one at a time:

```bash
#!/bin/bash
# Apply staged upgrades during maintenance window

CP_NODES=("192.168.1.10" "192.168.1.11" "192.168.1.12")
WORKER_NODES=("192.168.1.20" "192.168.1.21" "192.168.1.22" "192.168.1.23")

# Upgrade control plane nodes first (one at a time)
echo "=== Rebooting Control Plane Nodes ==="
for NODE in "${CP_NODES[@]}"; do
  echo "Rebooting $NODE..."
  talosctl reboot --nodes "$NODE"

  echo "Waiting for $NODE to come back..."
  sleep 30
  talosctl health --nodes "$NODE" --wait-timeout 10m

  # Verify version
  talosctl version --nodes "$NODE"

  # Verify etcd
  talosctl etcd status --nodes "$NODE"

  echo "$NODE upgraded and healthy"
  echo ""
done

# Upgrade worker nodes (one at a time)
echo "=== Rebooting Worker Nodes ==="
for NODE in "${WORKER_NODES[@]}"; do
  HOSTNAME=$(talosctl get hostname --nodes "$NODE" -o json | jq -r '.spec.hostname')

  echo "Draining $HOSTNAME..."
  kubectl drain "$HOSTNAME" --ignore-daemonsets --delete-emptydir-data --timeout=300s

  echo "Rebooting $NODE..."
  talosctl reboot --nodes "$NODE"

  echo "Waiting for $NODE to come back..."
  sleep 30
  talosctl health --nodes "$NODE" --wait-timeout 5m

  echo "Uncordoning $HOSTNAME..."
  kubectl uncordon "$HOSTNAME"

  talosctl version --nodes "$NODE"
  echo "$NODE upgraded and healthy"
  echo ""
done

echo "=== All nodes upgraded ==="
kubectl get nodes -o wide
```

## Canceling a Staged Upgrade

If you staged an upgrade but decide not to proceed, you need to clear the staged state. The simplest way is to stage the current version again (which overwrites the staged upgrade with the same version):

```bash
# Find current version
CURRENT=$(talosctl version --nodes 192.168.1.10 | grep "Tag:" | tail -1 | awk '{print $2}')

# Stage the current version to cancel the pending upgrade
talosctl upgrade --nodes 192.168.1.10 \
  --image "ghcr.io/siderolabs/installer:$CURRENT" \
  --stage
```

If the node reboots for any reason (power outage, hardware issue), it will boot the staged version. So if you do not want the upgrade to happen, canceling the staged upgrade is important.

## Benefits of Staged Upgrades

### 1. Controlled Timing

The biggest advantage is separating preparation from execution. You can download large installer images during off-peak hours when bandwidth is available, and then execute the quick reboot during a tight maintenance window.

### 2. Reduced Maintenance Window Duration

Since the image is already downloaded and written to disk, the maintenance window only needs to cover the reboot time and health verification. On most hardware, a Talos reboot takes 2-5 minutes.

```
Without staging (per node):
  Download image: 2-5 minutes (depends on bandwidth)
  Write to disk: 1-2 minutes
  Reboot: 2-5 minutes
  Total: 5-12 minutes per node

With staging (per node):
  Reboot: 2-5 minutes
  Total: 2-5 minutes per node
```

For a cluster with 20 nodes, this difference adds up significantly.

### 3. Pre-Validation

After staging, you can verify that the image was downloaded and written correctly before committing to the reboot:

```bash
# Verify the staged image
talosctl get machinestatus --nodes 192.168.1.10

# Check that the inactive boot slot has the new version
```

### 4. Batch Preparation

In large environments, you can stage upgrades across hundreds of nodes in parallel without any service impact:

```bash
# Stage all nodes in parallel
for NODE in "${ALL_NODES[@]}"; do
  talosctl upgrade --nodes "$NODE" \
    --image "$TALOS_IMAGE" \
    --stage &
done
wait
echo "All nodes staged"
```

## Staged Upgrades in CI/CD Pipelines

You can integrate staged upgrades into your CI/CD pipeline for automated cluster management:

```yaml
# Example GitOps pipeline stages
stages:
  - name: stage-upgrade
    # Runs during business hours - no impact
    schedule: "0 10 * * MON"  # Monday at 10 AM
    steps:
      - stage upgrades on all nodes

  - name: apply-upgrade-cp
    # Runs during maintenance window
    schedule: "0 2 * * SAT"  # Saturday at 2 AM
    steps:
      - reboot control plane nodes sequentially
      - verify etcd health

  - name: apply-upgrade-workers
    # Runs after control plane is upgraded
    depends_on: apply-upgrade-cp
    steps:
      - drain and reboot worker nodes sequentially
      - verify workload health
```

## Staged Upgrades and Automatic Rollback

The automatic rollback mechanism still works with staged upgrades. If the staged version fails to boot, the bootloader reverts to the previous version. The only difference is the timing - with a staged upgrade, the rollback happens when you reboot (during the maintenance window), not immediately after the upgrade command.

```bash
# After rebooting a node with a staged upgrade
# Check which version it is running
talosctl version --nodes 192.168.1.10

# If it rolled back, you will see the old version
# If the upgrade succeeded, you will see the new version
```

## Handling Mixed States

If some nodes in the cluster have staged upgrades and others do not, there is no compatibility issue. The staged upgrade is purely a local node operation. Nodes run their current version until rebooted, regardless of what is staged on other nodes.

This means you can stage upgrades in batches across your fleet without worrying about version conflicts. Only when nodes are rebooted do they start running the new version.

## Best Practices for Staged Upgrades

1. Stage all nodes within 24-48 hours of the planned maintenance window. Staging too far in advance increases the risk of an unplanned reboot applying the upgrade unexpectedly.

2. Always cancel staged upgrades if the maintenance window is postponed.

3. Verify staging was successful on all target nodes before the maintenance window.

4. Keep the reboot order the same as a regular rolling upgrade: control plane first, then workers.

5. Have the rollback procedure ready even though automatic rollback should handle most failures.

6. Document which version is staged on each node so there is no confusion during the maintenance window.

## Conclusion

Staging upgrades in Talos Linux gives you control over when the disruptive part of an upgrade (the reboot) happens. By separating the image download and installation from the reboot, you can prepare during business hours and execute during a narrow maintenance window. This approach is especially valuable for large clusters where download times add up and for organizations with strict change management processes that require precise control over when changes take effect.
