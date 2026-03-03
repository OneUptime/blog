# How to Use talosctl reset to Factory Reset Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Factory Reset, talosctl, Node Lifecycle

Description: A complete guide to using talosctl reset for factory resetting Talos Linux nodes, covering all options and use cases.

---

The `talosctl reset` command returns a Talos Linux node to its original unconfigured state. It wipes cluster data, removes the machine configuration, and leaves the node ready to be re-provisioned for a new purpose. Understanding the full range of options this command provides helps you use it safely and effectively, whether you are decommissioning a single node or tearing down an entire cluster.

## What talosctl reset Does Internally

When you execute a reset, Talos performs these steps (depending on the options you choose):

1. Stops Kubernetes workloads (graceful mode)
2. Leaves the etcd cluster (graceful mode, control plane nodes)
3. Stops all Talos services
4. Wipes specified disk partitions
5. Reboots into maintenance mode or shuts down

The result is a clean node that has no memory of its previous cluster membership. The Talos Linux operating system itself remains installed on the BOOT partition, so you do not need to reinstall from scratch.

## Basic Reset Command

```bash
# Reset a node with default settings (graceful mode)
talosctl reset --nodes <node-ip>
```

This performs a graceful reset: it drains workloads, leaves etcd if applicable, wipes state and ephemeral partitions, and reboots into maintenance mode.

## Graceful Mode

Graceful mode is the default and recommended approach:

```bash
# Explicit graceful reset
talosctl reset --nodes <node-ip> --graceful=true
```

In graceful mode, the node:

- Cordons itself in Kubernetes
- Drains all workloads
- Leaves the etcd cluster (control plane nodes)
- Cleans up properly before wiping

This is what you want when the node is still part of an active cluster and you want a clean departure.

### When Graceful Mode Fails

Graceful mode can hang if:

- The drain gets stuck (pods not terminating, PDB violations)
- The etcd leave operation fails
- The node cannot communicate with the cluster

If graceful mode hangs, cancel it and switch to non-graceful:

```bash
# Force reset without graceful procedures
talosctl reset --nodes <node-ip> --graceful=false
```

## Non-Graceful Mode

```bash
# Skip drain and etcd leave, go straight to wiping
talosctl reset --nodes <node-ip> --graceful=false
```

Use non-graceful mode when:

- The cluster no longer exists
- You have already manually drained the node and removed it from etcd
- The node is broken and cannot communicate with the cluster
- You are performing a full cluster teardown

Non-graceful mode immediately stops services and wipes partitions without trying to cleanly leave the cluster.

## Choosing What to Wipe

By default, reset wipes the STATE and EPHEMERAL partitions. You can control this:

```bash
# Wipe only specific partitions
talosctl reset --nodes <node-ip> \
    --system-labels-to-wipe STATE \
    --system-labels-to-wipe EPHEMERAL
```

### Partition Descriptions

**STATE partition** contains:

- The machine configuration
- etcd data (on control plane nodes)
- Node identity information
- Cluster membership state

**EPHEMERAL partition** contains:

- Container images
- Kubernetes pod data
- Logs
- Temporary runtime data

### Wipe Only Ephemeral Data

If you want to clear container data while preserving the configuration:

```bash
# Keep configuration, wipe container and pod data only
talosctl reset --nodes <node-ip> --system-labels-to-wipe EPHEMERAL
```

After this reset, the node reboots and re-applies its saved configuration. All containers and pod data start fresh, but the node automatically rejoins its cluster.

### Full Wipe

To wipe everything:

```bash
# Wipe both partitions (default)
talosctl reset --nodes <node-ip> \
    --system-labels-to-wipe STATE \
    --system-labels-to-wipe EPHEMERAL
```

After a full wipe, the node boots into maintenance mode and needs a new configuration to be applied.

## Reboot vs. Shutdown After Reset

Control what happens after the wipe:

```bash
# Reboot into maintenance mode (default)
talosctl reset --nodes <node-ip> --reboot

# Power off after wiping
talosctl reset --nodes <node-ip> --shutdown
```

Use `--reboot` when you plan to re-provision the node immediately. Use `--shutdown` when you are decommissioning the hardware or need to perform physical maintenance.

## Resetting Worker Nodes

Worker nodes are simpler to reset because they do not run etcd:

```bash
# Cordon and drain first for a clean reset
kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Reset the worker
talosctl reset --nodes <worker-ip>
```

After the reset, the node is in maintenance mode. Re-provision it:

```bash
# Apply a new configuration to bring it back
talosctl apply-config --insecure --nodes <worker-ip> --file worker.yaml
```

## Resetting Control Plane Nodes

Control plane nodes require extra care because of etcd:

```bash
# Step 1: Verify etcd quorum will be maintained
talosctl etcd members --nodes <other-cp-ip>

# Step 2: Take an etcd snapshot as a backup
talosctl etcd snapshot /tmp/etcd-backup.snapshot --nodes <other-cp-ip>

# Step 3: Cordon and drain
kubectl cordon <cp-node-name>
kubectl drain <cp-node-name> --ignore-daemonsets --delete-emptydir-data

# Step 4: Reset (graceful mode handles etcd leave)
talosctl reset --nodes <cp-ip>
```

Never reset more control plane nodes than your etcd cluster can tolerate losing.

## Resetting Multiple Nodes

### Workers in Bulk

```bash
# Reset multiple workers at once
talosctl reset --nodes 10.0.0.4,10.0.0.5,10.0.0.6
```

Make sure all nodes are drained first.

### Full Cluster Teardown

To tear down an entire cluster:

```bash
#!/bin/bash
# teardown-cluster.sh

WORKERS="10.0.0.4 10.0.0.5 10.0.0.6"
CONTROL_PLANES="10.0.0.1 10.0.0.2 10.0.0.3"

# Reset workers first (they are simpler)
echo "Resetting worker nodes..."
for node in $WORKERS; do
    talosctl reset --nodes $node --graceful=false &
done
wait

# Then reset control plane nodes one at a time
echo "Resetting control plane nodes..."
for node in $CONTROL_PLANES; do
    talosctl reset --nodes $node --graceful=false
    sleep 10
done

echo "Cluster teardown complete."
```

Use `--graceful=false` during teardown because the cluster state does not need to be preserved.

## After the Reset

### Node in Maintenance Mode

After a reset with `--reboot`, the node enters maintenance mode. You can verify it is in this state:

```bash
# Check if the node is responsive in maintenance mode
talosctl version --insecure --nodes <node-ip>
```

The `--insecure` flag is needed because maintenance mode does not use TLS.

### Re-Provisioning

Apply a new configuration to bring the node back into a cluster:

```bash
# Apply control plane or worker config
talosctl apply-config --insecure --nodes <node-ip> --file worker.yaml
```

### Joining a Different Cluster

After a reset, the node has no cluster affiliation. You can configure it for any cluster:

```bash
# Generate configs for a different cluster
talosctl gen config new-cluster https://192.168.1.100:6443

# Apply to the reset node
talosctl apply-config --insecure --nodes <node-ip> --file worker.yaml
```

## Common Issues and Solutions

### Reset Hangs During Drain

```bash
# Cancel the hanging reset (Ctrl+C) and retry without grace
talosctl reset --nodes <node-ip> --graceful=false
```

### Cannot Reach the Node After Reset

If the node rebooted into maintenance mode but you cannot reach it:

- The IP may have changed if it was using DHCP
- Check your network for the node's new DHCP lease
- Use the cloud console or physical access to find the IP

### Node Keeps Old Configuration After Reset

If you only wiped EPHEMERAL but not STATE, the configuration is preserved. That is expected behavior. To clear the configuration too:

```bash
# Wipe both partitions
talosctl reset --nodes <node-ip> \
    --system-labels-to-wipe STATE \
    --system-labels-to-wipe EPHEMERAL
```

### etcd Member Not Removed After Reset

If you used `--graceful=false` or the graceful etcd leave failed, the old etcd member entry persists:

```bash
# Force remove the stale etcd member from a healthy node
talosctl etcd remove-member <member-id> --nodes <healthy-cp-ip>
```

## Safety Checklist

Before running talosctl reset:

1. Have you taken an etcd snapshot?
2. Have you verified there is enough capacity in the cluster to handle the lost node?
3. Have you drained the node (or confirmed graceful mode will handle it)?
4. For control plane nodes, will etcd maintain quorum?
5. Have you updated any load balancer configurations?
6. Have you noted the node's current configuration in case you need to re-provision?

## Scripted Reset with Safety Checks

```bash
#!/bin/bash
# safe-reset.sh <node-ip> <healthy-cp-ip>

NODE=$1
HEALTHY_CP=$2

# Pre-flight checks
echo "Taking etcd snapshot..."
talosctl etcd snapshot "/tmp/etcd-pre-reset-$(date +%s).snapshot" --nodes $HEALTHY_CP

echo "Checking cluster health..."
talosctl health --nodes $HEALTHY_CP --wait-timeout 2m
if [ $? -ne 0 ]; then
    echo "Cluster not healthy. Aborting."
    exit 1
fi

# Proceed with reset
echo "Resetting $NODE..."
talosctl reset --nodes $NODE --graceful=true

echo "Reset initiated. Verifying cluster health..."
sleep 30
talosctl health --nodes $HEALTHY_CP --wait-timeout 5m

echo "Done."
```

## Conclusion

The `talosctl reset` command is a precise tool for returning Talos Linux nodes to a clean state. Whether you are resetting a single worker for re-provisioning or tearing down an entire cluster, understanding the options - graceful vs. non-graceful, which partitions to wipe, reboot vs. shutdown - gives you full control over the process. Always take backups before resetting, verify etcd quorum for control plane operations, and use the safety checklist to avoid surprises. With these practices in place, node resets become a routine and reliable part of your cluster lifecycle management.
