# How to Use talosctl apply-config Command

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Configuration Management, Talosctl, Machine Configuration

Description: Master the talosctl apply-config command for applying and updating machine configurations on Talos Linux nodes.

---

The `talosctl apply-config` command is how you push configuration to Talos Linux nodes. Whether you are setting up a new node for the first time or updating an existing node's configuration, this command is the mechanism that makes changes happen. Understanding its options and behaviors is essential for managing Talos Linux clusters effectively.

## What apply-config Does

When you run `talosctl apply-config`, the command sends a machine configuration to the target node's Talos API. The node receives the configuration, validates it, and applies it. Depending on what changed, the node may:

- Apply the changes immediately without a reboot
- Require a reboot to apply the changes
- Restart specific services

The command tells you what effect the configuration change will have.

## Basic Usage

### Applying to a New Node (Insecure Mode)

When a node is freshly installed with Talos Linux and has not been configured yet, it runs in maintenance mode. In this state, it does not have TLS credentials, so you need the `--insecure` flag:

```bash
# Apply configuration to a new, unconfigured node
talosctl apply-config --insecure --nodes <node-ip> --file controlplane.yaml
```

The `--insecure` flag bypasses TLS verification. Only use this for initial node setup when the node is in maintenance mode.

### Applying to an Existing Node

For nodes that are already configured and running:

```bash
# Apply updated configuration to an existing node
talosctl apply-config --nodes <node-ip> --file updated-config.yaml
```

No `--insecure` flag needed because the node already has TLS credentials and your talosconfig has the matching certificates.

## Apply Modes

talosctl apply-config supports different modes that control how the configuration is applied:

### Auto Mode (Default)

```bash
# Auto mode - Talos decides whether to reboot
talosctl apply-config --nodes <node-ip> --file config.yaml --mode auto
```

In auto mode, Talos analyzes the difference between the current and new configuration. If the changes can be applied without a reboot, it applies them immediately. If they require a reboot, it reboots the node automatically.

### No-Reboot Mode

```bash
# Only apply changes that do not require a reboot
talosctl apply-config --nodes <node-ip> --file config.yaml --mode no-reboot
```

In no-reboot mode, Talos applies only the changes that can be done without rebooting. If the configuration requires a reboot, the command fails rather than rebooting the node. This is useful when you want to make sure a configuration change does not cause unexpected downtime.

### Reboot Mode

```bash
# Force a reboot after applying the configuration
talosctl apply-config --nodes <node-ip> --file config.yaml --mode reboot
```

Reboot mode always reboots the node after applying the configuration, even if the changes would not normally require it. This is useful when you want a clean restart.

### Staged Mode

```bash
# Stage the configuration for the next reboot
talosctl apply-config --nodes <node-ip> --file config.yaml --mode staged
```

Staged mode saves the new configuration but does not apply it immediately. The changes take effect on the next reboot. This is useful for preparing configuration changes during a maintenance window.

## Configuration File Sources

### From a File

The most common approach:

```bash
# Apply from a YAML file
talosctl apply-config --nodes <node-ip> --file /path/to/config.yaml
```

### From Stdin

You can pipe configuration through stdin:

```bash
# Apply from stdin
cat config.yaml | talosctl apply-config --nodes <node-ip> --file -
```

This is useful in scripts or when generating configuration dynamically:

```bash
# Generate and apply in one pipeline
talosctl gen config my-cluster https://10.0.0.1:6443 --output-types controlplane -o - | \
    talosctl apply-config --nodes <node-ip> --file -
```

## Applying Configuration Patches

Instead of replacing the entire configuration, you can apply patches to modify specific fields:

```bash
# Apply a patch to the existing configuration
talosctl apply-config --nodes <node-ip> --config-patch '[{"op": "add", "path": "/machine/network/hostname", "value": "my-node"}]'
```

Patches use JSON Patch format (RFC 6902). This is useful for making small changes without managing the entire configuration file.

You can also use patch files:

```bash
# Apply a patch from a file
talosctl apply-config --nodes <node-ip> --config-patch @patch.yaml
```

## Dry Run

Before applying changes to production nodes, use dry run to see what would happen:

```bash
# Check what changes would be applied without actually applying them
talosctl apply-config --nodes <node-ip> --file config.yaml --dry-run
```

Dry run validates the configuration and shows what changes would be made, including whether a reboot would be required. This is a safety check you should always use before applying to production.

## Applying to Multiple Nodes

### Same Configuration to Multiple Nodes

For worker nodes that share the same configuration:

```bash
# Apply to multiple nodes
talosctl apply-config --nodes 10.0.0.4,10.0.0.5,10.0.0.6 --file worker.yaml
```

### Different Configurations to Different Nodes

When each node has unique configuration (hostnames, static IPs):

```bash
# Apply different configs to different nodes
talosctl apply-config --nodes 10.0.0.1 --file cp1.yaml
talosctl apply-config --nodes 10.0.0.2 --file cp2.yaml
talosctl apply-config --nodes 10.0.0.3 --file cp3.yaml
```

## Understanding Configuration Changes

### Changes That Do Not Require a Reboot

Some configuration changes can be applied live:

- Network configuration changes (in some cases)
- Cluster discovery settings
- Machine labels and annotations
- Some kubelet configuration changes

### Changes That Require a Reboot

Other changes require a reboot:

- Kernel parameters
- Install disk changes
- Machine type changes (worker to control plane)
- Cluster certificate changes
- Major Kubernetes version changes

When you apply in auto mode, Talos handles this distinction for you.

## Error Handling

### Validation Errors

If the configuration is invalid, apply-config rejects it before making any changes:

```bash
# An invalid configuration produces an error
talosctl apply-config --nodes <node-ip> --file bad-config.yaml
# Error: configuration validation failed: ...
```

Common validation errors:

- Missing required fields
- Invalid IP addresses or CIDR notation
- Incompatible settings combinations
- Malformed YAML syntax

### Connectivity Errors

```bash
# If the node is unreachable
talosctl apply-config --nodes <unreachable-ip> --file config.yaml
# Error: rpc error: ... connection refused
```

Check network connectivity and ensure port 50000 is accessible.

### Recovery from Bad Configuration

If you apply a configuration that makes the node unreachable:

For nodes still running with the old config (staged mode):

```bash
# Revert by applying the old configuration
talosctl apply-config --nodes <node-ip> --file old-config.yaml
```

For nodes that rebooted with a bad config and are unreachable via normal means, you may need to boot into maintenance mode and reapply.

## Best Practices

### Version Control Your Configurations

Store machine configurations in git:

```bash
# Keep configurations in a repository
git add controlplane.yaml worker.yaml
git commit -m "Initial Talos cluster configuration"
```

### Always Dry Run First

```bash
# Make dry run a habit before every apply
talosctl apply-config --nodes <node-ip> --file config.yaml --dry-run
```

### Use Staged Mode for Control Plane Changes

For control plane nodes, staging changes reduces risk:

```bash
# Stage the change
talosctl apply-config --nodes <cp-ip> --file updated-cp.yaml --mode staged

# Then reboot at a controlled time
talosctl reboot --nodes <cp-ip>
```

### Backup Current Configuration

Before applying changes, save the current configuration:

```bash
# Save the running configuration
talosctl get machineconfig --nodes <node-ip> -o yaml > backup-config.yaml
```

## Conclusion

The `talosctl apply-config` command is the primary mechanism for managing Talos Linux node configurations. Whether you are bootstrapping new nodes with `--insecure`, updating existing nodes with different apply modes, or making targeted changes with patches, this command handles it all. Use dry run to validate changes before applying, choose the right apply mode for your situation, and always keep backups of working configurations. Mastering this command is fundamental to effective Talos Linux cluster management.
