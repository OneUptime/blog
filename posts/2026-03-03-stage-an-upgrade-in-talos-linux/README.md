# How to Stage an Upgrade in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Staged Upgrade, Maintenance Window, Upgrade Planning, Kubernetes

Description: Learn how to stage upgrades in Talos Linux to prepare nodes for an upgrade ahead of time and apply the changes during a controlled maintenance window.

---

Staging an upgrade in Talos Linux changes how the upgrade is applied on the node. Instead of trying to stop services, unmount filesystems, and write the new installation immediately from the running system, Talos writes upgrade metadata to disk and reboots. Very early in the next boot, Talos sees the staged upgrade, applies the new kernel and OS image, and then reboots again into the upgraded version.

This is useful when a regular upgrade cannot cleanly unmount filesystems because a process is holding a file open. It is not a way to download an upgrade during business hours and leave it pending for a later manual reboot.

> Note: In Talos v1.13, `--stage` is a legacy upgrade flag used when falling back to the legacy upgrade API for older Talos versions. The Talos docs mark legacy upgrade flags including `--stage` as deprecated and scheduled for removal in Talos v1.18.

## What Does Staging an Upgrade Mean?

When you stage an upgrade in Talos Linux, the system records upgrade artifacts and metadata so the upgrade can be performed immediately after a reboot, before the full running system starts. After the staged upgrade is applied, Talos reboots again into the new version.

```text
Normal Upgrade:
  1. Drain node and stop services
  2. Unmount filesystems
  3. Write new installation
  4. Reboot into the new version

Staged Upgrade:
  1. Record upgrade metadata
  2. Reboot the node
  3. Apply the upgrade early in boot
  4. Reboot into the new version
```

This flow helps when the normal upgrade path fails because the running system cannot release disk access cleanly.

## Staging an Upgrade on a Single Node

The `--stage` flag tells Talos to use the staged upgrade path:

```bash
# Stage an upgrade on a specific node

talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --stage

# The node reboots, applies the upgrade early in boot, and reboots again
# into the upgraded Talos version.
```

After the command completes, verify the node version:

```bash
# Check the Talos version on the node
talosctl version --nodes 192.168.1.10

# Check overall cluster health
talosctl health --nodes 192.168.1.10 --wait-timeout 10m
```

The node is disrupted during the reboot sequence, so treat this like any other node upgrade.

## Staging Across Multiple Nodes

You can run staged upgrades across multiple nodes, but you should still roll through them carefully. Avoid upgrading every node at once unless you have confirmed your workloads and quorum-dependent systems can tolerate it.

```bash
#!/bin/bash
# Stage upgrades on nodes one at a time
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

echo "Running staged upgrades..."
for NODE in "${ALL_NODES[@]}"; do
  echo "  Upgrading $NODE..."
  talosctl upgrade --nodes "$NODE" \
    --image "$TALOS_IMAGE" \
    --stage

  talosctl health --nodes "$NODE" --wait-timeout 10m
  talosctl version --nodes "$NODE"
  echo "  $NODE upgraded successfully"
done
```

Because staging reboots the node, run this during an upgrade window, not during normal business hours.

## Applying the Staged Upgrade

There is no separate "apply later" step for a staged Talos upgrade. The upgrade is applied automatically during the reboot sequence started by the staged upgrade flow.

For a rolling upgrade, upgrade nodes one at a time:

```bash
#!/bin/bash
# Run staged upgrades during an upgrade window

CP_NODES=("192.168.1.10" "192.168.1.11" "192.168.1.12")
WORKER_NODES=("192.168.1.20" "192.168.1.21" "192.168.1.22" "192.168.1.23")
TALOS_IMAGE="ghcr.io/siderolabs/installer:v1.7.0"

# Upgrade control plane nodes first (one at a time)
echo "=== Upgrading Control Plane Nodes ==="
for NODE in "${CP_NODES[@]}"; do
  echo "Upgrading $NODE..."
  talosctl upgrade --nodes "$NODE" \
    --image "$TALOS_IMAGE" \
    --stage

  echo "Waiting for $NODE to be healthy..."
  talosctl health --nodes "$NODE" --wait-timeout 10m

  # Verify version
  talosctl version --nodes "$NODE"

  # Verify etcd
  talosctl etcd status --nodes "$NODE"

  echo "$NODE upgraded and healthy"
  echo ""
done

# Upgrade worker nodes (one at a time)
echo "=== Upgrading Worker Nodes ==="
for NODE in "${WORKER_NODES[@]}"; do
  HOSTNAME=$(talosctl get nodename --nodes "$NODE" -o json | jq -r '.spec.nodename')

  echo "Draining $HOSTNAME..."
  kubectl drain "$HOSTNAME" --ignore-daemonsets --delete-emptydir-data --timeout=300s

  echo "Upgrading $NODE..."
  talosctl upgrade --nodes "$NODE" \
    --image "$TALOS_IMAGE" \
    --stage

  echo "Waiting for $NODE to be healthy..."
  talosctl health --nodes "$NODE" --wait-timeout 10m

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

A staged upgrade is not a long-lived pending change that you normally cancel later. Once you run the staged upgrade command, Talos reboots and applies the upgrade in the next boot sequence.

If you need to undo a completed Talos OS upgrade, use the normal rollback flow:

```bash
# Roll back the node to the previous installation
talosctl rollback --nodes 192.168.1.10
```

The rollback command updates the boot reference and reboots the node into the previous installation.

## Benefits of Staged Upgrades

### 1. Avoiding Filesystem Unmount Failures

The biggest advantage is that staging moves the actual upgrade work into an early boot environment. If a normal upgrade fails because Talos cannot stop every disk access point and unmount filesystems cleanly, the staged path avoids that running-system conflict.

### 2. Predictable Upgrade Flow

The upgrade window still needs to cover the node reboot sequence and health verification. With staging, expect an extra reboot because Talos reboots once to apply the staged upgrade and then reboots again into the upgraded version.

```text
Normal upgrade:
  Drain and stop services
  Unmount filesystems
  Write new installation
  Reboot
  Verify health

Staged upgrade:
  Record staged upgrade metadata
  Reboot
  Apply upgrade early in boot
  Reboot
  Verify health
```

For a cluster with many nodes, roll through nodes in a controlled order.

### 3. Health Validation

After each node upgrades, verify that the node is running the expected version and that the cluster is healthy:

```bash
# Verify the upgraded version
talosctl version --nodes 192.168.1.10

# Check cluster health
talosctl health --nodes 192.168.1.10 --wait-timeout 10m
```

### 4. Controlled Execution

In large environments, automate staged upgrades with the same caution you use for regular upgrades:

```bash
# Upgrade all nodes sequentially
for NODE in "${ALL_NODES[@]}"; do
  talosctl upgrade --nodes "$NODE" \
    --image "$TALOS_IMAGE" \
    --stage
  talosctl health --nodes "$NODE" --wait-timeout 10m
done
echo "All nodes upgraded"
```

## Staged Upgrades in CI/CD Pipelines

You can integrate staged upgrades into your CI/CD pipeline for automated cluster management:

```yaml
# Example GitOps pipeline stages
stages:
  - name: upgrade-cp
    # Runs during maintenance window
    schedule: "0 2 * * SAT"  # Saturday at 2 AM
    steps:
      - upgrade control plane nodes sequentially with --stage
      - verify etcd health

  - name: upgrade-workers
    # Runs after control plane is upgraded
    depends_on: upgrade-cp
    steps:
      - drain and upgrade worker nodes sequentially with --stage
      - verify workload health
```

## Staged Upgrades and Automatic Rollback

The automatic rollback mechanism still works with staged upgrades. If the upgraded Talos system fails to start, Talos reboots and the bootloader uses the previous Talos kernel and OS image. If Talos upgrades successfully but workloads fail after the node rejoins the cluster, use `talosctl rollback` to revert the node to the previous Talos version.

```bash
# After a staged upgrade completes, check which version is running
talosctl version --nodes 192.168.1.10

# If the node needs to be reverted, roll it back
talosctl rollback --nodes 192.168.1.10
```

## Handling Mixed States

If some nodes in the cluster have been upgraded and others have not, follow the same compatibility rules as any other Talos rolling upgrade. Talos recommends upgrading through adjacent minor releases, because upgrade migrations are tested between adjacent minor versions.

This means you can upgrade in batches across your fleet, but you should plan the rollout order and version path before starting.

## Best Practices for Staged Upgrades

1. Use `--stage` when the normal upgrade path cannot cleanly unmount filesystems or when you explicitly need the staged boot-time upgrade behavior.

2. Treat the staged upgrade command as disruptive because it starts a reboot-driven upgrade flow.

3. Verify each node after upgrade with `talosctl version` and `talosctl health`.

4. Keep the order the same as a regular rolling upgrade: control plane first, then workers.

5. Have the rollback procedure ready even though automatic rollback should handle boot failures.

6. Check the Talos version you are running. In Talos v1.13 and newer, `--stage` is a deprecated legacy flag and is planned for removal in Talos v1.18.

## Conclusion

Staging upgrades in Talos Linux gives you a fallback upgrade path when the normal running-system upgrade cannot safely unmount filesystems. It does not create a pending upgrade that waits for a later manual reboot. The staged upgrade command records the upgrade metadata, reboots the node, applies the upgrade early in boot, and then reboots into the new version. Use it during a controlled upgrade window, roll through nodes carefully, and verify each node before moving on.
