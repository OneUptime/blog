# How to Use talosctl patch mc for Machine Configuration Updates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Configuration Patching, talosctl, Machine Configuration

Description: Learn how to use talosctl patch mc to make targeted, repeatable machine configuration changes in Talos Linux clusters.

---

While `talosctl edit mc` opens the full configuration in an editor, `talosctl patch mc` lets you make targeted changes using patch documents. This approach is more precise, more repeatable, and better suited for automation. If you need to change the same setting across ten nodes, writing a patch once and applying it everywhere is far more efficient than editing each configuration manually.

## What Is talosctl patch mc?

The `talosctl patch mc` command applies a patch to the existing machine configuration on a node. The patch describes only the changes you want to make, not the entire configuration. Talos fetches the current configuration, applies the patch, validates the result, and saves it.

This is conceptually similar to `kubectl patch` if you are familiar with Kubernetes resource patching.

## Patch Formats

talosctl supports strategic merge patches in YAML format. You specify the fields you want to add or change, and Talos merges them into the existing configuration.

### Basic Patch Syntax

A patch file contains the same YAML structure as the machine configuration, but only includes the fields you want to change:

```yaml
# hostname-patch.yaml
machine:
    network:
        hostname: my-new-hostname
```

Apply it:

```bash
# Apply a patch from a file
talosctl patch mc --nodes <node-ip> --patch @hostname-patch.yaml
```

### Inline Patches

For small changes, specify the patch directly on the command line:

```bash
# Set hostname using an inline patch
talosctl patch mc --nodes <node-ip> --patch '{"machine": {"network": {"hostname": "my-node"}}}'
```

YAML also works inline:

```bash
# Using YAML inline (with proper shell quoting)
talosctl patch mc --nodes <node-ip> --patch "$(cat <<'EOF'
machine:
  network:
    hostname: my-node
EOF
)"
```

## Common Patch Examples

### Setting a Hostname

```yaml
# set-hostname.yaml
machine:
    network:
        hostname: talos-worker-01
```

```bash
talosctl patch mc --nodes <node-ip> --patch @set-hostname.yaml
```

### Adding DNS Servers

```yaml
# add-dns.yaml
machine:
    network:
        nameservers:
            - 8.8.8.8
            - 8.8.4.4
```

```bash
talosctl patch mc --nodes <node-ip> --patch @add-dns.yaml
```

### Adding Kubelet Extra Arguments

```yaml
# kubelet-args.yaml
machine:
    kubelet:
        extraArgs:
            max-pods: "250"
            serialize-image-pulls: "false"
```

```bash
talosctl patch mc --nodes <node-ip> --patch @kubelet-args.yaml
```

### Adding Node Labels

```yaml
# node-labels.yaml
machine:
    nodeLabels:
        topology.kubernetes.io/zone: us-east-1a
        node-type: gpu
```

```bash
talosctl patch mc --nodes <node-ip> --patch @node-labels.yaml
```

### Configuring NTP

```yaml
# ntp-config.yaml
machine:
    time:
        servers:
            - time.google.com
            - time.cloudflare.com
```

```bash
talosctl patch mc --nodes <node-ip> --patch @ntp-config.yaml
```

### Adding Extra Kubernetes Manifests

```yaml
# extra-manifests.yaml
cluster:
    extraManifests:
        - https://raw.githubusercontent.com/metallb/metallb/main/config/manifests/metallb-native.yaml
```

```bash
talosctl patch mc --nodes <node-ip> --patch @extra-manifests.yaml
```

### Adjusting etcd Quota

```yaml
# etcd-quota.yaml
cluster:
    etcd:
        extraArgs:
            quota-backend-bytes: "8589934592"
```

```bash
talosctl patch mc --nodes <node-ip> --patch @etcd-quota.yaml
```

## Apply Modes

Like other configuration commands, patch supports different apply modes:

```bash
# Auto mode - Talos decides whether to reboot (default)
talosctl patch mc --nodes <node-ip> --patch @patch.yaml --mode auto

# No reboot - fail if changes require a reboot
talosctl patch mc --nodes <node-ip> --patch @patch.yaml --mode no-reboot

# Staged - apply on next reboot
talosctl patch mc --nodes <node-ip> --patch @patch.yaml --mode staged

# Reboot - always reboot after applying
talosctl patch mc --nodes <node-ip> --patch @patch.yaml --mode reboot
```

## Dry Run

Always preview changes before applying to production:

```bash
# See what would change without actually applying
talosctl patch mc --nodes <node-ip> --patch @patch.yaml --dry-run
```

Dry run shows you the resulting configuration and whether a reboot would be required.

## Applying Patches to Multiple Nodes

One of the biggest advantages of patch over edit is bulk application:

```bash
# Apply the same patch to all worker nodes
talosctl patch mc --nodes 10.0.0.4,10.0.0.5,10.0.0.6 --patch @worker-patch.yaml
```

Or using a loop for more control:

```bash
#!/bin/bash
# apply-patch-to-workers.sh
WORKER_NODES="10.0.0.4 10.0.0.5 10.0.0.6 10.0.0.7 10.0.0.8"

for node in $WORKER_NODES; do
    echo "Patching $node..."
    talosctl patch mc --nodes $node --patch @worker-patch.yaml --mode no-reboot
    if [ $? -eq 0 ]; then
        echo "$node patched successfully"
    else
        echo "Failed to patch $node"
    fi
done
```

## Multiple Patches at Once

You can apply multiple patches in a single command:

```bash
# Apply multiple patch files
talosctl patch mc --nodes <node-ip> \
    --patch @hostname-patch.yaml \
    --patch @dns-patch.yaml \
    --patch @kubelet-patch.yaml
```

The patches are applied in order, so later patches can override earlier ones if they modify the same fields.

## JSON Patch Format

For more precise control, you can use JSON Patch format (RFC 6902):

```bash
# Add a field
talosctl patch mc --nodes <node-ip> \
    --patch '[{"op": "add", "path": "/machine/network/hostname", "value": "my-node"}]'

# Replace a field
talosctl patch mc --nodes <node-ip> \
    --patch '[{"op": "replace", "path": "/machine/kubelet/extraArgs/max-pods", "value": "250"}]'

# Remove a field
talosctl patch mc --nodes <node-ip> \
    --patch '[{"op": "remove", "path": "/machine/network/nameservers"}]'
```

JSON Patch is more explicit about what operation is being performed (add, replace, remove, move, copy, test).

## Building a Patch Library

For teams managing Talos Linux clusters, maintaining a library of reusable patches is a good practice:

```
patches/
    common/
        ntp-servers.yaml
        dns-servers.yaml
        log-rotation.yaml
    controlplane/
        etcd-tuning.yaml
        api-server-args.yaml
    worker/
        kubelet-tuning.yaml
        gpu-labels.yaml
    environments/
        production/
            network-settings.yaml
        staging/
            network-settings.yaml
```

Apply relevant patches based on the node role and environment:

```bash
# Control plane node in production
talosctl patch mc --nodes <cp-ip> \
    --patch @patches/common/ntp-servers.yaml \
    --patch @patches/common/dns-servers.yaml \
    --patch @patches/controlplane/etcd-tuning.yaml \
    --patch @patches/environments/production/network-settings.yaml
```

## Error Handling

### Validation Failures

If the resulting configuration is invalid, the patch is rejected:

```bash
talosctl patch mc --nodes <node-ip> --patch '{"machine": {"type": "invalid"}}'
# Error: configuration validation failed: ...
```

The original configuration remains unchanged.

### Conflicting Patches

If two patches modify the same field, the last one wins:

```bash
# The second patch overrides the first for hostname
talosctl patch mc --nodes <node-ip> \
    --patch '{"machine": {"network": {"hostname": "first"}}}' \
    --patch '{"machine": {"network": {"hostname": "second"}}}'
# Result: hostname = "second"
```

## patch mc vs. edit mc vs. apply-config

Each command has its sweet spot:

| Command | Best For | Automation | Precision |
|---------|----------|------------|-----------|
| `edit mc` | Interactive, exploratory changes | Poor | Low (can change anything) |
| `patch mc` | Targeted, repeatable changes | Good | High (only changes what you specify) |
| `apply-config` | Full configuration replacement | Best | Total (replaces everything) |

Use `patch mc` when you know exactly what to change and want to make the same change across multiple nodes. Use `edit mc` when you want to explore and tweak interactively. Use `apply-config` when you have a complete configuration to push.

## Version Control for Patches

Store your patches in version control alongside your cluster documentation:

```bash
# Track patch changes over time
git add patches/
git commit -m "Add kubelet tuning patch for increased pod density"
```

This creates a record of every configuration change applied to the cluster, which is invaluable for troubleshooting and auditing.

## Conclusion

The `talosctl patch mc` command is the most efficient way to make targeted configuration changes across Talos Linux nodes. Its ability to modify specific fields without touching the rest of the configuration, combined with support for bulk application and automation, makes it essential for managing clusters at scale. Build a library of reusable patches, use dry run before applying to production, and store everything in version control. This approach gives you repeatable, auditable, and safe configuration management for your Talos Linux clusters.
