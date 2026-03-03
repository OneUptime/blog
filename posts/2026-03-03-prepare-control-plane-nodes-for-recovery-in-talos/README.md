# How to Prepare Control Plane Nodes for Recovery in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Control Plane, Disaster Recovery, Kubernetes, etcd, Node Preparation

Description: How to properly prepare Talos Linux control plane nodes for cluster recovery by resetting state and configuring them for bootstrap.

---

Before you can recover a Talos Linux cluster from a backup, the control plane nodes need to be in the right state. They cannot have stale etcd data, conflicting certificates, or leftover state from the previous cluster. Preparing nodes correctly is what makes the difference between a smooth recovery and hours of troubleshooting cryptic errors.

## Why Node Preparation Matters

When you recover a Talos cluster using `talosctl bootstrap --recover-from`, the bootstrap process expects to work with a clean slate. If the node still has old etcd data, the new bootstrap conflicts with the existing data. If certificates are mismatched, the components cannot communicate. If the node thinks it is already part of a cluster, it will refuse to bootstrap.

Getting the nodes into the correct state before recovery eliminates these problems.

## Assessing Current Node State

Before resetting anything, understand what state the nodes are in:

```bash
# Check if the node is reachable
talosctl version --nodes <cp-node-ip>

# Check what services are running
talosctl services --nodes <cp-node-ip>

# Check the machine status
talosctl get machinestatus --nodes <cp-node-ip>

# Check if etcd is running (and possibly in a bad state)
talosctl services --nodes <cp-node-ip> | grep etcd
```

Nodes can be in several states:

1. **Running normally** - All services up, etcd healthy
2. **Running with failed etcd** - Services up but etcd is crashed or in a loop
3. **In maintenance mode** - Fresh install, waiting for configuration
4. **Unreachable** - Hardware failure, network issues

Your preparation steps depend on the current state.

## Scenario 1: Nodes Are Running (Need Reset)

If control plane nodes are still running but the cluster needs recovery (e.g., etcd quorum is lost), you need to reset the ephemeral data.

### Resetting with EPHEMERAL Wipe

```bash
# This wipes the EPHEMERAL partition which contains:
# - etcd data directory
# - kubelet data
# - Containerd state

talosctl reset --nodes <cp-node-1> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false

# The --graceful=false flag skips the drain and
# cordon steps, which would fail anyway if the
# cluster is not operational
```

The EPHEMERAL wipe preserves:
- The Talos OS installation
- The machine configuration
- The installed system extensions

This is the most common preparation method because it cleans up etcd data without requiring a full reinstall.

```bash
# Wait for the node to come back after reset
# It will reboot and start services fresh
talosctl services --nodes <cp-node-1>

# etcd should NOT be running yet
# It waits for the bootstrap command
```

### Resetting All Control Plane Nodes

Reset all control plane nodes before starting recovery:

```bash
# Reset all three control plane nodes
for node in 10.0.0.1 10.0.0.2 10.0.0.3; do
    echo "Resetting ${node}..."
    talosctl reset --nodes ${node} \
      --system-labels-to-wipe EPHEMERAL \
      --graceful=false
done

# Wait for all nodes to come back
echo "Waiting for nodes to reset..."
sleep 60

# Verify all nodes are back and ready
for node in 10.0.0.1 10.0.0.2 10.0.0.3; do
    echo "Checking ${node}..."
    talosctl version --nodes ${node}
    talosctl services --nodes ${node}
done
```

## Scenario 2: Nodes Need Fresh Configuration

If the machine configurations are outdated or need to be updated as part of the recovery:

```bash
# Apply updated configuration to each node
talosctl apply-config --nodes <cp-node-1> \
  --file updated-cp-1-config.yaml

talosctl apply-config --nodes <cp-node-2> \
  --file updated-cp-2-config.yaml

talosctl apply-config --nodes <cp-node-3> \
  --file updated-cp-3-config.yaml

# If the config changes require a reboot,
# the node will reboot automatically
```

Common configuration updates during recovery:

- Updated endpoint addresses (if infrastructure changed)
- New TLS certificates (if they expired)
- Updated network settings (if the network changed)

## Scenario 3: Fresh Nodes (New Infrastructure)

If you are rebuilding on new hardware or VMs, the nodes start in maintenance mode:

```bash
# New nodes waiting for configuration
# Apply configs with --insecure since trust is not established yet
talosctl apply-config --nodes <new-cp-1-ip> \
  --file cp-1-config.yaml \
  --insecure

talosctl apply-config --nodes <new-cp-2-ip> \
  --file cp-2-config.yaml \
  --insecure

talosctl apply-config --nodes <new-cp-3-ip> \
  --file cp-3-config.yaml \
  --insecure

# Wait for installation to complete
# The nodes will install Talos to disk and reboot
for node in <new-cp-1-ip> <new-cp-2-ip> <new-cp-3-ip>; do
    echo "Waiting for ${node} to be ready..."
    until talosctl version --nodes ${node} 2>/dev/null; do
        sleep 10
    done
    echo "${node} is ready"
done
```

## Verifying Node Readiness

Before proceeding with the bootstrap, verify each node is in the correct state:

```bash
# Check each control plane node
for node in 10.0.0.1 10.0.0.2 10.0.0.3; do
    echo "=== Node ${node} ==="

    # Should be reachable
    talosctl version --nodes ${node}

    # Should have the correct machine config
    talosctl get machineconfig --nodes ${node} -o yaml | head -20

    # etcd should NOT be running (waiting for bootstrap)
    talosctl services --nodes ${node} | grep etcd

    # Check disk space on EPHEMERAL partition
    talosctl get disks --nodes ${node}

    echo "---"
done
```

The expected state before recovery is:

- Node is reachable via the Talos API
- Machine configuration is applied and correct
- etcd is not running (or was just wiped)
- The EPHEMERAL partition has free space for new etcd data

## Handling Nodes That Will Not Reset

Sometimes a node gets stuck and will not respond to reset commands:

```bash
# If the node is unresponsive to talosctl
# Option 1: Hard reboot (if you have IPMI/BMC access)
ipmitool -H <bmc-ip> -U admin -P password power cycle

# Option 2: Force reboot through the Talos API
talosctl reboot --nodes <stuck-node> --mode powercycle

# Option 3: For VMs, force restart through the hypervisor
# (vSphere, Proxmox, cloud console, etc.)
```

After a hard reboot, the node should come back and you can try the reset again.

## Preparing for Specific Recovery Methods

### Preparing for bootstrap recover-from

```bash
# The bootstrap node needs to be in a clean state
# with etcd data wiped

# Verify the bootstrap node is ready
talosctl services --nodes <bootstrap-node>

# etcd should be in "Waiting" state, not "Running"
# If etcd is running, reset the EPHEMERAL partition

# The other control plane nodes should also be reset
# They will join after the bootstrap completes
```

### Preparing for Manual etcd Recovery

```bash
# If you are recovering etcd manually (removing/re-adding members)
# you only need to reset the specific nodes that have bad data

# Only reset the problematic node
talosctl reset --nodes <bad-node> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false

# Leave the healthy nodes alone
# They will accept the recovered node when it rejoins
```

## Pre-Recovery Checklist

Run through this checklist before starting the recovery:

```bash
#!/bin/bash
# pre-recovery-checklist.sh

CP_NODES=("10.0.0.1" "10.0.0.2" "10.0.0.3")
ERRORS=0

for node in "${CP_NODES[@]}"; do
    echo "Checking ${node}..."

    # Node reachable?
    if ! talosctl version --nodes ${node} 2>/dev/null; then
        echo "  FAIL: Node is not reachable"
        ((ERRORS++))
        continue
    fi
    echo "  OK: Node is reachable"

    # Config applied?
    if ! talosctl get machineconfig --nodes ${node} 2>/dev/null; then
        echo "  FAIL: No machine configuration"
        ((ERRORS++))
        continue
    fi
    echo "  OK: Machine configuration present"

    # Check services
    ETCD_STATE=$(talosctl services --nodes ${node} 2>/dev/null | grep etcd | awk '{print $2}')
    if [ "${ETCD_STATE}" = "Running" ]; then
        echo "  WARN: etcd is still running (may need reset)"
    else
        echo "  OK: etcd is not running"
    fi
done

echo ""
if [ ${ERRORS} -gt 0 ]; then
    echo "Pre-recovery check FAILED with ${ERRORS} error(s)"
    echo "Fix the issues above before proceeding"
    exit 1
else
    echo "Pre-recovery check PASSED"
    echo "Ready to proceed with cluster recovery"
fi
```

## Summary

Preparing control plane nodes for recovery in Talos Linux involves getting them into a clean state where etcd data has been wiped and the machine configuration is correct. For existing nodes, use `talosctl reset --system-labels-to-wipe EPHEMERAL` to clear stale data while preserving the OS installation. For new nodes, apply the machine configuration and wait for installation to complete. Always verify node readiness before starting the bootstrap recovery process - a few minutes of verification can save hours of debugging failed recoveries.
