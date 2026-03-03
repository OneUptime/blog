# How to Troubleshoot Talos Linux Maintenance Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Maintenance Mode, Troubleshooting, Node Configuration, Cluster Setup

Description: Learn how to diagnose and resolve issues when Talos Linux nodes get stuck in maintenance mode and how to properly transition them to running state.

---

Maintenance mode is the initial state of a Talos Linux node before it has received a machine configuration. When you boot a fresh Talos installation, the node enters maintenance mode and waits for you to apply a configuration. However, sometimes nodes get stuck in maintenance mode even when you have already applied a configuration, or they unexpectedly return to maintenance mode after being part of a running cluster. This guide covers how to handle both scenarios.

## What Is Maintenance Mode?

In maintenance mode, a Talos node runs a minimal set of services. The Talos API is available (on port 50000), but there is no Kubernetes running. The node is essentially waiting for instructions. You can think of it as a "setup" phase.

When a node is in maintenance mode:

- The Talos API is accessible with the `--insecure` flag
- No kubelet, etcd, or Kubernetes components are running
- The node has basic networking (DHCP by default)
- The configuration partition is empty or contains an invalid configuration

## Checking If a Node Is in Maintenance Mode

```bash
# Try connecting to the node normally
talosctl -n <node-ip> version

# If that fails with a certificate error, try insecure mode
talosctl -n <node-ip> version --insecure
```

If the insecure connection works but the secure one does not, the node is in maintenance mode. You can also check:

```bash
# Get the machine status
talosctl -n <node-ip> get machinestatus --insecure
```

This will show the current stage of the machine, which will be "maintenance" if the node has not received a valid configuration.

## Scenario 1: Fresh Node Not Accepting Configuration

If you are setting up a new node and applying the configuration fails:

```bash
# Apply configuration to a fresh node
talosctl apply-config --insecure -n <node-ip> --file worker.yaml
```

If this command fails, check the error message carefully. Common issues:

**Configuration validation error:**

```bash
# Validate your configuration file first
talosctl validate --config worker.yaml --mode metal
```

This will show you any syntax errors or invalid values in your configuration.

**Wrong endpoint in configuration:**

The configuration file must have a reachable control plane endpoint. If you are setting up the first control plane node, the endpoint should point to itself:

```yaml
cluster:
  controlPlane:
    endpoint: https://10.0.0.1:6443  # Must be reachable
```

**Network issues:**

If the node cannot communicate with you, even the insecure apply will fail. Check that you are on the same network:

```bash
# Check if you can reach the Talos API port
curl -k https://<node-ip>:50000
```

## Scenario 2: Node Returns to Maintenance Mode After Reboot

If a previously configured node reboots into maintenance mode, the machine configuration may have been lost or corrupted:

```bash
# Check if the configuration is present
talosctl -n <node-ip> get machineconfiguration --insecure
```

If the configuration is missing, possible causes include:

1. The STATE partition was corrupted or wiped
2. A disk failure caused data loss
3. A Talos upgrade went wrong

Check the disk status:

```bash
# Check disk information
talosctl -n <node-ip> disks --insecure
```

If the disk is healthy, re-apply the configuration:

```bash
# Re-apply the saved configuration
talosctl apply-config --insecure -n <node-ip> --file worker.yaml
```

## Scenario 3: Configuration Applied but Node Stays in Maintenance

Sometimes the configuration is applied successfully (no error returned), but the node does not progress beyond maintenance mode. Check the Talos logs:

```bash
# Check machine config controller logs
talosctl -n <node-ip> logs controller-runtime --insecure --tail 100
```

Look for errors in the configuration processing. The node might be stuck because:

**Missing required fields:**

```bash
# Validate the config file in detail
talosctl validate --config worker.yaml --mode metal --strict
```

**Wrong machine type:**

Make sure the machine type in the configuration matches the intended role. A worker configuration has `type: worker`, while a control plane has `type: controlplane`:

```yaml
machine:
  type: worker  # or controlplane
```

**Network interface not found:**

If the configuration references a network interface that does not exist on the hardware, networking will fail and the node may not progress:

```bash
# List available network interfaces
talosctl -n <node-ip> get links --insecure
```

Update your configuration to use the correct interface name.

## Scenario 4: Stuck After Reset

If you reset a node with `talosctl reset` and it goes back to maintenance mode, this is expected behavior. After a reset, the node is fresh and needs a new configuration:

```bash
# After reset, apply configuration again
talosctl apply-config --insecure -n <node-ip> --file worker.yaml
```

For control plane nodes, if this node was previously part of the etcd cluster, make sure to remove its etcd member first from a healthy node:

```bash
# Remove the old etcd member from a healthy control plane node
talosctl -n <healthy-cp-ip> etcd remove-member <member-id>

# Then apply config to the reset node
talosctl apply-config --insecure -n <reset-node-ip> --file controlplane.yaml
```

## Scenario 5: Maintenance Mode After Upgrade

If a Talos upgrade causes the node to enter maintenance mode, the upgrade may have failed partway through:

```bash
# Check the boot status
talosctl -n <node-ip> get installstatus --insecure
```

If the upgrade failed, the node might have booted into the wrong partition. Talos uses an A/B partition scheme for upgrades. Check which partition is active:

```bash
# Check system information
talosctl -n <node-ip> get systeminformation --insecure
```

You may need to force the node back to the previous good configuration:

```bash
# Re-apply the configuration
talosctl apply-config --insecure -n <node-ip> --file worker.yaml

# If that does not work, try a fresh install
talosctl -n <node-ip> reset --insecure --graceful=false
talosctl apply-config --insecure -n <node-ip> --file worker.yaml
```

## Working with Maintenance Mode Intentionally

Sometimes you want a node in maintenance mode - for example, to change its configuration before it joins the cluster:

```bash
# Get the current configuration from a maintenance mode node
talosctl -n <node-ip> get machineconfiguration --insecure -o yaml > current-config.yaml

# Edit the configuration
# ... make your changes ...

# Apply the modified configuration
talosctl apply-config --insecure -n <node-ip> --file modified-config.yaml
```

## Preventing Maintenance Mode Issues

To avoid unexpected maintenance mode situations:

1. Always keep a copy of your machine configurations in a safe location (not on the Talos nodes themselves)
2. Use config management tools or GitOps to store configurations
3. Before resetting a node, make sure you have its configuration saved
4. When upgrading Talos, verify the upgrade succeeded before moving to the next node

```bash
# Save a node's current configuration
talosctl -n <node-ip> get machineconfiguration -o yaml > backup-$(date +%Y%m%d).yaml
```

## Summary

Maintenance mode on Talos Linux is a normal initial state, but it can become a problem when nodes unexpectedly return to it. The key is always having your machine configurations backed up and ready to re-apply. Use `talosctl validate` to check configurations before applying them, and always verify network connectivity when working with nodes in maintenance mode. The `--insecure` flag on `talosctl` commands is your best friend when dealing with maintenance mode nodes.
