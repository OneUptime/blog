# How to Reset a Talos Linux Node to Factory Defaults

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Factory Reset, Node Management, Kubernetes, System Administration

Description: Learn how to reset a Talos Linux node to factory defaults using talosctl reset, including graceful and forced reset options.

---

Sometimes you need to wipe a Talos Linux node clean and start fresh. Whether you are decommissioning hardware, repurposing a node for a different cluster, or troubleshooting a deeply broken configuration, a factory reset brings the node back to its original unconfigured state. This guide covers how to do it properly with the various options available.

## What Does a Factory Reset Do?

A factory reset on Talos Linux removes all cluster state, configuration, and data from the node. Specifically, it wipes the STATE and EPHEMERAL partitions, which contain the machine configuration, etcd data (on control plane nodes), Kubernetes pod data, and container images.

After a reset, the node boots into maintenance mode, waiting for a new configuration to be applied. It is essentially back to the same state as when you first installed Talos Linux on it.

The BOOT partition (which contains the Talos Linux OS itself) is preserved by default. This means you do not need to reinstall Talos from scratch - just apply a new configuration.

## Prerequisites

Before resetting a node, make sure you have:

- `talosctl` installed and configured
- Access credentials for the target node
- The node properly drained if it is still part of an active cluster

If the node is part of a running cluster, follow the proper removal procedure before resetting:

```bash
# Cordon the node to prevent new workloads
kubectl cordon <node-name>

# Drain existing workloads
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# For control plane nodes, remove from etcd first
talosctl etcd leave --nodes <node-ip>
```

## Basic Factory Reset

The simplest form of the reset command is:

```bash
# Reset the node to factory defaults with graceful shutdown
talosctl reset --nodes <node-ip>
```

By default, this performs a graceful reset. It will stop services in the correct order, leave the etcd cluster if applicable, and then wipe the partitions.

You will be prompted to confirm the action. This is a destructive operation and cannot be undone.

## Graceful vs. Non-Graceful Reset

Talos Linux supports two modes of reset:

### Graceful Reset (Default)

```bash
# Graceful reset - the default behavior
talosctl reset --nodes <node-ip> --graceful=true
```

A graceful reset does the following in order:

1. Cordons the node in Kubernetes
2. Drains workloads from the node
3. Leaves the etcd cluster (for control plane nodes)
4. Stops all services
5. Wipes the STATE and EPHEMERAL partitions
6. Reboots into maintenance mode

This is the recommended approach when the node is still healthy and connected to the cluster.

### Non-Graceful Reset

```bash
# Force reset without graceful shutdown procedures
talosctl reset --nodes <node-ip> --graceful=false
```

A non-graceful reset skips the drain and etcd leave steps. It immediately stops services and wipes partitions. Use this when:

- The node is stuck and cannot communicate with the cluster properly
- The etcd member has already been removed manually
- You have already drained the node separately
- The cluster no longer exists and you just want to wipe the node

## Choosing What to Wipe

By default, the reset wipes both the STATE and EPHEMERAL partitions. You can control which partitions are wiped:

```bash
# Reset and specify which system disk to target
talosctl reset --nodes <node-ip> --system-labels-to-wipe STATE --system-labels-to-wipe EPHEMERAL
```

The available partition labels are:

- **STATE** - Contains the machine configuration and etcd data
- **EPHEMERAL** - Contains Kubernetes pod data, container images, and logs

If you only want to wipe the ephemeral data while keeping the configuration:

```bash
# Only wipe the ephemeral partition
talosctl reset --nodes <node-ip> --system-labels-to-wipe EPHEMERAL
```

This can be useful when you want to clear all container and pod data without losing the machine configuration.

## Resetting with Reboot

After the reset, you can choose whether the node reboots or shuts down:

```bash
# Reset and reboot into maintenance mode
talosctl reset --nodes <node-ip> --reboot

# Reset and shut down instead of rebooting
talosctl reset --nodes <node-ip> --shutdown
```

The `--reboot` option is the default. The node will come back up in maintenance mode, ready to accept a new configuration. The `--shutdown` option powers the node off after wiping, which is useful for decommissioning.

## Resetting Multiple Nodes

You can reset multiple worker nodes at once by specifying multiple IPs:

```bash
# Reset multiple worker nodes simultaneously
talosctl reset --nodes 192.168.1.11,192.168.1.12,192.168.1.13 --graceful=true
```

For control plane nodes, reset them one at a time to maintain cluster quorum throughout the process. Never reset all control plane nodes simultaneously unless you intend to destroy the entire cluster.

## Resetting All Nodes (Cluster Teardown)

If you want to completely tear down the cluster, reset all nodes. Start with the worker nodes, then the control plane nodes:

```bash
# First reset all worker nodes
talosctl reset --nodes <worker-ip-1>,<worker-ip-2>,<worker-ip-3>

# Then reset control plane nodes one by one
talosctl reset --nodes <cp-ip-1> --graceful=false
talosctl reset --nodes <cp-ip-2> --graceful=false
talosctl reset --nodes <cp-ip-3> --graceful=false
```

Use `--graceful=false` for control plane nodes during a full teardown because the cluster state no longer needs to be preserved.

## What Happens After Reset

After the reset completes and the node reboots, it enters maintenance mode. In this state:

- The Talos API is listening but only accepts configuration apply requests
- No Kubernetes components are running
- The node is waiting for a new machine configuration

You can apply a new configuration to bring it back into a cluster:

```bash
# Apply a new configuration to the reset node
talosctl apply-config --insecure --nodes <node-ip> --file worker.yaml
```

The `--insecure` flag is required because the node in maintenance mode does not have TLS credentials yet.

## Troubleshooting Reset Issues

### Reset Command Hangs

If the reset command hangs, it is usually because the graceful drain is stuck waiting for pods to terminate. Try canceling and running with `--graceful=false`:

```bash
# Force the reset if graceful mode is stuck
talosctl reset --nodes <node-ip> --graceful=false
```

### Cannot Reach the Node

If you cannot reach the node via `talosctl` at all, you may need to physically reboot it. On bare metal, use IPMI or physical access. In cloud environments, use the provider's console to force a restart or reinstall.

### Disk Not Fully Wiped

If you need to completely wipe the disk, including the Talos OS installation, you will need to boot from external media and use standard disk wiping tools. The `talosctl reset` command preserves the OS installation by design.

## Best Practices

Always drain and remove nodes from the cluster before resetting them. Even though the graceful reset handles this automatically, doing it explicitly gives you more control and lets you verify each step.

Keep a record of which nodes were reset and when. In larger clusters, tracking node lifecycle events helps with capacity planning and troubleshooting.

Test your reset and re-provisioning process periodically. You do not want the first time you reset a node to be during an emergency.

## Conclusion

Factory resetting a Talos Linux node is a clean, well-defined operation thanks to the immutable nature of the operating system. The `talosctl reset` command handles all the cleanup, from draining workloads to wiping partitions. Use graceful mode when possible, fall back to forced mode when needed, and always verify your cluster health after the operation. With the right preparation, resetting and re-provisioning nodes becomes a routine operational task rather than a stressful event.
