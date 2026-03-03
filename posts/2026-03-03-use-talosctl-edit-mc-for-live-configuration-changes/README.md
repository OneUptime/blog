# How to Use talosctl edit mc for Live Configuration Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Configuration Editing, talosctl, Machine Configuration

Description: Learn how to use talosctl edit mc to make live configuration changes to Talos Linux nodes with an interactive editor.

---

When you need to make a quick configuration change to a Talos Linux node, the `talosctl edit mc` command opens the node's machine configuration in your text editor. You make your changes, save and close the editor, and talosctl applies the updated configuration to the node. It is the Talos equivalent of `kubectl edit` and is perfect for interactive configuration adjustments.

## What Is "mc"?

The "mc" in `talosctl edit mc` stands for "machine configuration." This is the complete configuration document that defines how a Talos Linux node behaves, including its network settings, disk configuration, Kubernetes parameters, and more.

The machine configuration is stored on the node itself. When you run `talosctl edit mc`, talosctl fetches the current configuration, opens it in your editor, and then sends the modified version back to the node.

## Basic Usage

```bash
# Edit the machine configuration on a specific node
talosctl edit mc --nodes <node-ip>
```

This opens the full machine configuration in your default editor (set by the `EDITOR` environment variable). Make your changes, save the file, and close the editor. talosctl will validate and apply the changes.

## Setting Your Editor

talosctl uses the `EDITOR` environment variable to determine which editor to open:

```bash
# Use vim
export EDITOR=vim
talosctl edit mc --nodes <node-ip>

# Use nano
export EDITOR=nano
talosctl edit mc --nodes <node-ip>

# Use VS Code (waits for file to be closed)
export EDITOR="code --wait"
talosctl edit mc --nodes <node-ip>
```

If `EDITOR` is not set, talosctl defaults to `vi`.

## What You See in the Editor

When the editor opens, you see the full machine configuration in YAML format. It looks something like this:

```yaml
version: v1alpha1
machine:
    type: controlplane
    token: <redacted>
    ca:
        crt: <base64-encoded>
        key: <base64-encoded>
    network:
        hostname: talos-cp-1
        interfaces:
            - interface: eth0
              dhcp: true
    install:
        disk: /dev/sda
        image: ghcr.io/siderolabs/installer:v1.7.0
    kubelet:
        image: ghcr.io/siderolabs/kubelet:v1.29.0
cluster:
    controlPlane:
        endpoint: https://10.0.0.1:6443
    network:
        podSubnets:
            - 10.244.0.0/16
        serviceSubnets:
            - 10.96.0.0/12
    # ... more cluster configuration
```

You can modify any field in this document.

## Common Configuration Changes

### Changing the Hostname

Navigate to the `machine.network.hostname` field and change the value:

```yaml
machine:
    network:
        hostname: new-hostname
```

### Adding a Static IP

```yaml
machine:
    network:
        interfaces:
            - interface: eth0
              addresses:
                  - 10.0.0.10/24
              routes:
                  - network: 0.0.0.0/0
                    gateway: 10.0.0.1
```

### Adding DNS Servers

```yaml
machine:
    network:
        nameservers:
            - 8.8.8.8
            - 8.8.4.4
```

### Modifying Kubelet Arguments

```yaml
machine:
    kubelet:
        extraArgs:
            max-pods: "200"
            eviction-hard: "memory.available<500Mi"
```

### Adding Extra Manifests

```yaml
cluster:
    extraManifests:
        - https://raw.githubusercontent.com/example/manifests/main/monitoring.yaml
```

### Adjusting etcd Settings

```yaml
cluster:
    etcd:
        extraArgs:
            quota-backend-bytes: "8589934592"
```

## What Happens After Saving

After you save and close the editor, talosctl:

1. Validates the modified configuration
2. Compares it with the current configuration
3. Determines whether changes can be applied without a reboot
4. Applies the changes or reports what needs to happen

If the changes can be applied live, they take effect immediately. If a reboot is needed, talosctl tells you:

```
Applied configuration with a reboot
```

If there are validation errors, talosctl reports them and does not apply the changes:

```
Error: configuration validation failed: machine.network.interfaces[0].addresses: invalid CIDR
```

## Apply Modes with edit mc

You can control how changes are applied using the `--mode` flag:

```bash
# Only apply if no reboot is needed
talosctl edit mc --nodes <node-ip> --mode no-reboot

# Stage changes for the next reboot
talosctl edit mc --nodes <node-ip> --mode staged

# Force a reboot after applying
talosctl edit mc --nodes <node-ip> --mode reboot

# Let Talos decide (default)
talosctl edit mc --nodes <node-ip> --mode auto
```

Using `--mode no-reboot` is the safest option for production changes. If the changes you make would require a reboot, the edit is rejected instead of rebooting the node unexpectedly.

## Dry Run

Before making changes to a production node, you can do a dry run:

```bash
# Preview changes without applying
talosctl edit mc --nodes <node-ip> --dry-run
```

With dry run, the editor still opens and you can make changes. But when you save and close, talosctl only shows what would happen without actually applying anything.

## Editing Configuration on Multiple Nodes

The `talosctl edit mc` command targets one node at a time. For making the same change across multiple nodes, consider:

```bash
# Edit each node individually
talosctl edit mc --nodes 10.0.0.1
talosctl edit mc --nodes 10.0.0.2
talosctl edit mc --nodes 10.0.0.3
```

For bulk changes, `talosctl patch mc` (covered in a separate guide) is more efficient than editing each node interactively.

## Safety Considerations

### Sensitive Data

The machine configuration contains sensitive data including TLS certificates, tokens, and keys. When editing:

- Do not copy the configuration content to insecure locations
- Be careful with terminal scrollback that might capture sensitive values
- Close the editor properly rather than force-quitting

### Critical Fields

Some fields should be changed with extreme caution:

- **machine.type** - Changing from controlplane to worker (or vice versa) is a major change
- **cluster.controlPlane.endpoint** - Changing this affects how all nodes connect to the API server
- **machine.ca** and cluster certificates - Incorrect changes will break cluster communication
- **machine.token** - This is used for node authentication

### Recovery

If you accidentally apply a bad configuration and the node becomes unreachable:

1. If the node rebooted with a bad config, you may need to boot into maintenance mode
2. If the change was non-disruptive, connect to another node and apply the correct config remotely
3. Keep a backup of the working configuration before making changes

## edit mc vs. apply-config

Both commands update the machine configuration, but they serve different purposes:

| Feature | edit mc | apply-config |
|---------|---------|-------------|
| Interactive | Yes (opens editor) | No (takes a file) |
| Fetches current config | Yes | No |
| Best for | Quick, one-off changes | Scripted/automated changes |
| Multiple nodes | One at a time | Can target multiple |
| CI/CD friendly | No | Yes |

Use `edit mc` for interactive troubleshooting and quick fixes. Use `apply-config` for automated workflows and repeatable operations.

## edit mc vs. patch mc

Similarly, `edit mc` and `patch mc` have different strengths:

| Feature | edit mc | patch mc |
|---------|---------|----------|
| Shows full config | Yes | No |
| Change precision | Free-form | Targeted patches |
| Learning curve | Lower (just edit YAML) | Higher (need patch syntax) |
| Automation | Poor | Good |
| Risk of accidental changes | Higher | Lower |

Use `edit mc` when you want to see the full configuration and make changes visually. Use `patch mc` when you know exactly what to change and want a precise, repeatable operation.

## Practical Workflow

A typical workflow for making a configuration change:

```bash
# Step 1: Back up the current configuration
talosctl get machineconfig --nodes <node-ip> -o yaml > backup.yaml

# Step 2: Dry run your changes
talosctl edit mc --nodes <node-ip> --dry-run

# Step 3: Apply the changes in no-reboot mode first
talosctl edit mc --nodes <node-ip> --mode no-reboot

# Step 4: If a reboot is needed and you are in a maintenance window
talosctl edit mc --nodes <node-ip> --mode auto

# Step 5: Verify the node is healthy after changes
talosctl health --nodes <node-ip> --wait-timeout 5m
```

## Conclusion

The `talosctl edit mc` command provides an intuitive, interactive way to modify Talos Linux node configurations. It fetches the current configuration, lets you edit it in your preferred text editor, validates your changes, and applies them. Combined with dry run mode and the ability to choose apply modes, it gives you full control over configuration changes. Use it for quick fixes and interactive troubleshooting, and pair it with proper backup practices to keep your cluster running smoothly.
