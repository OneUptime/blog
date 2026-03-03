# How to Use Staged Mode for Configuration Changes in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Staged Configuration, Operations, Maintenance, Kubernetes

Description: Learn how to use staged mode in Talos Linux to prepare configuration changes that take effect at the next reboot during planned maintenance windows.

---

Production environments need predictable change management. You do not want configuration changes triggering unexpected reboots during business hours or causing disruptions at inopportune times. Talos Linux's staged mode lets you prepare configuration changes in advance and have them take effect at the next planned reboot. This gives you complete control over when potentially disruptive changes actually happen.

## What Is Staged Mode

When you apply a configuration with `--mode staged`, Talos saves the new configuration but does not apply it immediately. The node continues running with its current configuration until the next reboot. When the node restarts, it boots with the staged configuration.

```bash
# Stage a configuration change
talosctl apply-config --nodes 10.0.1.10 --patch @my-change.yaml --mode staged
```

Think of it as "prepare this change but do not activate it yet." It is similar to how you might stage a database migration script to run during the next maintenance window.

## Why Use Staged Mode

There are several scenarios where staged mode is the right choice:

**Planned maintenance windows.** You prepare changes during working hours and reboot during a scheduled maintenance window at night.

**Changes that require reboot.** Kernel parameters, system extensions, and disk configuration changes need a reboot. Staging them means you control exactly when that reboot happens.

**Coordinated multi-node updates.** Stage changes on all nodes first, then reboot them in a controlled sequence during maintenance.

**Safety net.** If you are not sure whether a change requires a reboot, staged mode guarantees no immediate disruption.

## Basic Staged Mode Workflow

Here is a typical workflow:

```bash
# Step 1: Prepare the change during working hours
talosctl apply-config --nodes 10.0.1.10 \
    --patch @kernel-modules.yaml --mode staged

# Step 2: Verify the staged configuration
talosctl get machineconfig --nodes 10.0.1.10

# Step 3: During maintenance window, reboot the node
talosctl reboot --nodes 10.0.1.10

# Step 4: Wait for the node to come back
talosctl health --nodes 10.0.1.10 --wait-timeout 5m

# Step 5: Verify the change took effect
talosctl get machineconfig --nodes 10.0.1.10
```

## Staging Changes Across Multiple Nodes

For a cluster-wide change, stage on all nodes first, then reboot in a controlled sequence:

```bash
#!/bin/bash
# staged-rollout.sh
# Stage changes on all nodes, then reboot during maintenance

PATCH_FILE="changes.yaml"
CP_NODES=("10.0.1.10" "10.0.1.11" "10.0.1.12")
WORKER_NODES=("10.0.1.21" "10.0.1.22" "10.0.1.23")
ALL_NODES=("${CP_NODES[@]}" "${WORKER_NODES[@]}")

echo "=== Phase 1: Staging configuration on all nodes ==="
for node in "${ALL_NODES[@]}"; do
    echo "Staging on $node..."
    talosctl apply-config --nodes "$node" --patch "@$PATCH_FILE" --mode staged
    echo "  Staged successfully"
done

echo ""
echo "Configuration staged on all nodes."
echo "Run the following commands during your maintenance window:"
echo ""

# Generate the reboot commands
echo "=== Phase 2: Reboot sequence (run during maintenance) ==="

# Workers first
for node in "${WORKER_NODES[@]}"; do
    echo "talosctl reboot --nodes $node && talosctl health --nodes $node --wait-timeout 5m"
done

# Then control plane nodes, one at a time
for node in "${CP_NODES[@]}"; do
    echo "talosctl reboot --nodes $node && talosctl health --nodes $node --wait-timeout 5m"
    echo "# Wait for etcd to stabilize"
    echo "sleep 30"
done
```

## Checking for Staged Configuration

After staging a change, you can verify that a staged configuration exists:

```bash
# Check the machine status for staged config indicator
talosctl get machinestatus --nodes 10.0.1.10
```

You can also compare the current running configuration with the staged one to see what will change:

```bash
# Get the current running config
talosctl get machineconfig --nodes 10.0.1.10 -o yaml > current.yaml

# After the reboot, the staged config becomes the running config
# To see what the staged config looks like before rebooting,
# you can check the applied config:
talosctl get machineconfig --nodes 10.0.1.10 -o yaml > staged.yaml
diff current.yaml staged.yaml
```

## Canceling Staged Changes

If you need to cancel a staged change before the reboot happens, apply the current configuration again with `--mode staged` or `--mode no-reboot`:

```bash
# Get the current running configuration
talosctl get machineconfig --nodes 10.0.1.10 -o yaml > current-config.yaml

# Reapply it to overwrite the staged change
talosctl apply-config --nodes 10.0.1.10 --file current-config.yaml --mode staged
```

Alternatively, if you simply do not reboot, the staged configuration just sits there until the next reboot. If you apply another change with `--mode staged`, the newer staged config replaces the previous one.

## Combining Staged and No-Reboot Changes

You can apply no-reboot changes immediately while staging reboot-required changes for later:

```bash
# Apply labels immediately (no reboot needed)
talosctl apply-config --nodes 10.0.1.10 \
    --patch @labels.yaml --mode no-reboot

# Stage kernel module changes (reboot needed)
talosctl apply-config --nodes 10.0.1.10 \
    --patch @kernel-modules.yaml --mode staged
```

This approach lets you make incremental improvements during the day while batching disruptive changes for the maintenance window.

## Staged Mode in CI/CD Pipelines

Integrating staged mode into CI/CD pipelines gives you a controlled deployment process:

```yaml
# .github/workflows/talos-staged-deploy.yaml
name: Stage Talos Config
on:
  push:
    branches: [main]
    paths: ['talos/patches/**']

jobs:
  stage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install talosctl
        run: curl -sL https://talos.dev/install | sh

      - name: Stage configuration changes
        run: |
          # Stage changes on all nodes
          for node in 10.0.1.10 10.0.1.11 10.0.1.12; do
            talosctl apply-config --nodes "$node" \
                --patch @talos/patches/update.yaml \
                --mode staged
          done

      - name: Create maintenance ticket
        run: |
          # Create a ticket/notification for the ops team
          # to reboot nodes during the next maintenance window
          echo "Staged configuration changes on all nodes."
          echo "Reboot required during next maintenance window."
```

The pipeline stages the changes, and a separate process (manual or automated) handles the reboot during the maintenance window.

## Maintenance Window Reboot Script

Here is a complete script for executing the reboot sequence during a maintenance window:

```bash
#!/bin/bash
# maintenance-reboot.sh
# Execute staged configuration changes by rebooting nodes in order

set -euo pipefail

CP_NODES=("10.0.1.10" "10.0.1.11" "10.0.1.12")
WORKER_NODES=("10.0.1.21" "10.0.1.22" "10.0.1.23")
WAIT_TIMEOUT="5m"

echo "Starting maintenance reboot sequence at $(date)"

# Function to reboot and wait for a node
reboot_node() {
    local node=$1
    local role=$2

    echo "[$role] Rebooting $node..."
    talosctl reboot --nodes "$node"

    echo "[$role] Waiting for $node to come back..."
    if talosctl health --nodes "$node" --wait-timeout "$WAIT_TIMEOUT" 2>/dev/null; then
        echo "[$role] $node is healthy"
    else
        echo "[$role] WARNING: $node health check timed out"
        echo "[$role] Manual intervention may be needed"
        return 1
    fi
}

# Phase 1: Reboot workers (can be done in parallel for faster rollout)
echo ""
echo "=== Phase 1: Rebooting worker nodes ==="
for node in "${WORKER_NODES[@]}"; do
    reboot_node "$node" "WORKER"
    echo ""
done

# Phase 2: Reboot control plane nodes (one at a time, with etcd checks)
echo "=== Phase 2: Rebooting control plane nodes ==="
for node in "${CP_NODES[@]}"; do
    # Check etcd health before rebooting the next CP node
    echo "[CP] Checking etcd health..."
    talosctl etcd status --nodes "${CP_NODES[0]}" || true

    reboot_node "$node" "CP"

    # Wait for etcd to stabilize after CP node reboot
    echo "[CP] Waiting 30 seconds for etcd stabilization..."
    sleep 30

    # Verify etcd cluster is healthy
    echo "[CP] Verifying etcd cluster health..."
    talosctl etcd members --nodes "$node"
    echo ""
done

echo "=== Maintenance complete at $(date) ==="
echo "Verify cluster health:"
echo "  kubectl get nodes"
echo "  kubectl get pods --all-namespaces | grep -v Running"
```

## Staged Mode for Talos Upgrades

Staged mode is particularly useful for Talos version upgrades, where you update the installer image:

```yaml
# upgrade-patch.yaml
machine:
  install:
    image: ghcr.io/siderolabs/installer:v1.7.0
```

```bash
# Stage the upgrade on all nodes
for node in "${ALL_NODES[@]}"; do
    talosctl apply-config --nodes "$node" \
        --patch @upgrade-patch.yaml --mode staged
done

# Later, during maintenance, use talosctl upgrade for a proper upgrade
# Or reboot to apply the staged installer image
```

Note that for actual Talos version upgrades, the `talosctl upgrade` command is preferred over staged config changes because it handles the upgrade process more completely. But staged mode works well for configuration changes that accompany an upgrade.

## Verifying Changes After Reboot

After the maintenance window, verify that all changes took effect:

```bash
#!/bin/bash
# verify-post-maintenance.sh

ALL_NODES=("10.0.1.10" "10.0.1.11" "10.0.1.12" "10.0.1.21" "10.0.1.22" "10.0.1.23")

echo "=== Post-Maintenance Verification ==="

for node in "${ALL_NODES[@]}"; do
    echo ""
    echo "Node: $node"

    # Check if the node is up and healthy
    if talosctl version --nodes "$node" > /dev/null 2>&1; then
        echo "  Status: Reachable"
    else
        echo "  Status: UNREACHABLE"
        continue
    fi

    # Check Kubernetes node status
    hostname=$(talosctl get hostname --nodes "$node" -o json 2>/dev/null | jq -r '.spec.hostname')
    echo "  Hostname: $hostname"
done

echo ""
echo "=== Kubernetes Cluster Status ==="
kubectl get nodes -o wide
echo ""
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed
```

## Conclusion

Staged mode in Talos Linux gives operations teams the control they need over when potentially disruptive changes take effect. By separating the act of preparing a change from the act of activating it, you can fit Talos configuration management into your existing maintenance window practices. Stage changes during the day, verify what is staged, and reboot during your planned window. This approach is especially valuable for changes that require reboots, cluster-wide updates, and environments with strict change management processes. Combined with proper validation and verification scripts, staged mode makes Talos configuration changes predictable and safe.
