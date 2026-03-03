# How to Apply Machine Configurations to Talos Linux Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Machine Configuration, talosctl, Node Management, Kubernetes

Description: Learn how to apply, update, and manage machine configurations on Talos Linux nodes using talosctl.

---

Applying machine configurations is how you tell a Talos Linux node what to do. Unlike traditional Linux systems where you log in and install packages, configure services, and edit files, Talos takes a single YAML configuration that defines everything about the node. This guide covers all the ways you can apply and manage that configuration.

## The Two Scenarios for Applying Configs

There are two fundamentally different situations when applying a machine configuration:

1. **Initial application** - The node is in maintenance mode (freshly booted from the Talos image) and has never been configured.
2. **Updating an existing configuration** - The node is already running Talos with a configuration, and you want to change something.

The commands and behavior differ between these two cases, so let us cover each one.

## Applying to a New Node (Maintenance Mode)

When a Talos node first boots from the ISO or disk image, it enters maintenance mode. In this state, it waits for someone to push a machine configuration via the Talos API.

```bash
# Apply configuration to a node in maintenance mode
talosctl apply-config --insecure \
  --nodes 192.168.1.101 \
  --file controlplane.yaml
```

The `--insecure` flag is required here because the node does not yet have TLS certificates. Without a configuration, there is no mutual TLS, so talosctl needs to skip certificate verification.

After you apply the config, the node:

1. Validates the configuration
2. Writes it to the STATE partition
3. Installs Talos to the disk (if booted from ISO)
4. Reboots with the new configuration applied

You will see the node disappear from the network briefly during the reboot. When it comes back, it is running Talos with the configuration you provided.

## Applying to Multiple Nodes

If you have several nodes to configure, apply the configs one at a time or script it:

```bash
# Apply control plane config to three nodes
for node in 192.168.1.101 192.168.1.102 192.168.1.103; do
  echo "Applying control plane config to ${node}..."
  talosctl apply-config --insecure \
    --nodes "${node}" \
    --file controlplane.yaml
done

# Apply worker config to worker nodes
for node in 192.168.1.111 192.168.1.112; do
  echo "Applying worker config to ${node}..."
  talosctl apply-config --insecure \
    --nodes "${node}" \
    --file worker.yaml
done
```

## Applying Per-Node Configurations

Sometimes you need slightly different configurations for each node (different hostnames, static IPs, etc.). Generate per-node configs using patches:

```bash
# Create a per-node patch
cat > node1-patch.yaml << 'EOF'
machine:
  network:
    hostname: cp1
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.101/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
EOF

# Patch the base config to create a node-specific config
talosctl machineconfig patch controlplane.yaml \
  --patch @node1-patch.yaml \
  --output cp1.yaml

# Apply the node-specific config
talosctl apply-config --insecure \
  --nodes 192.168.1.101 \
  --file cp1.yaml
```

## Updating Configuration on a Running Node

Once a node is running and part of a cluster, you can update its configuration without the `--insecure` flag. talosctl uses mutual TLS from the talosconfig file.

### Using apply-config

```bash
# Update configuration on a running node
# Make sure TALOSCONFIG is set to your talosconfig file
export TALOSCONFIG="$(pwd)/talosconfig"

talosctl apply-config \
  --nodes 192.168.1.101 \
  --file updated-controlplane.yaml
```

### Using patch

The `patch` command is often more convenient for small changes because you do not need to provide the entire configuration file:

```bash
# Patch a specific part of the configuration
talosctl patch machineconfig \
  --nodes 192.168.1.101 \
  --patch '[{"op": "replace", "path": "/machine/network/hostname", "value": "new-hostname"}]'
```

Or using a YAML patch file:

```yaml
# hostname-patch.yaml
machine:
  network:
    hostname: new-hostname
```

```bash
# Apply a YAML patch
talosctl patch machineconfig \
  --nodes 192.168.1.101 \
  --patch @hostname-patch.yaml
```

## Apply Modes

When updating a running node's configuration, Talos determines what needs to happen based on what changed. There are several possible modes:

### No Reboot Required

Some changes take effect immediately without any disruption:

- Adding or modifying network interfaces
- Changing nameservers
- Updating time servers
- Modifying kubelet configuration

### Reboot Required

Other changes require a full node reboot:

- Changing the install disk
- Modifying kernel parameters
- Changing the cluster endpoint

You can control how apply-config handles reboots:

```bash
# Apply and automatically reboot if needed
talosctl apply-config \
  --nodes 192.168.1.101 \
  --file controlplane.yaml \
  --mode auto

# Apply in no-reboot mode (will fail if a reboot is needed)
talosctl apply-config \
  --nodes 192.168.1.101 \
  --file controlplane.yaml \
  --mode no-reboot

# Apply with staged reboot (config is staged, applied on next reboot)
talosctl apply-config \
  --nodes 192.168.1.101 \
  --file controlplane.yaml \
  --mode staged
```

The staged mode is useful for maintenance windows. You stage the new configuration, and it takes effect the next time the node reboots (either manually or during an upgrade).

## Dry Run

Before applying a configuration change, you can do a dry run to see what would change:

```bash
# Dry run to see the diff
talosctl apply-config \
  --nodes 192.168.1.101 \
  --file controlplane.yaml \
  --dry-run
```

This shows you the differences between the current and proposed configuration without actually applying anything. Always use this in production before making changes.

## Viewing the Current Configuration

To see what configuration a node is currently running:

```bash
# Get the full machine configuration
talosctl get machineconfig \
  --nodes 192.168.1.101 \
  -o yaml
```

This retrieves the configuration from the node. Note that sensitive fields like private keys are redacted in the output.

## Validating Configuration Before Applying

You can validate a configuration file without applying it:

```bash
# Validate a control plane config
talosctl validate --config controlplane.yaml --mode metal

# Validate a worker config
talosctl validate --config worker.yaml --mode metal
```

The `--mode` flag specifies the platform: `metal` for bare metal, `cloud` for cloud instances, or `container` for Docker-based nodes.

## Configuration from stdin

You can pipe configuration content directly to apply-config:

```bash
# Apply config from stdin
cat controlplane.yaml | talosctl apply-config --insecure \
  --nodes 192.168.1.101 \
  --file /dev/stdin
```

This is useful in CI/CD pipelines where you might generate the configuration dynamically.

## Troubleshooting Failed Applies

If a configuration apply fails, talosctl will report an error. Common issues include:

**Invalid YAML**: The configuration file has syntax errors.

```bash
# Validate the YAML first
talosctl validate --config controlplane.yaml --mode metal
```

**Network unreachable**: The node is not reachable on the specified IP. Check that the node is powered on and the IP is correct.

**TLS errors**: For running nodes, make sure your talosconfig is correct and has not expired.

**Version mismatch**: Very old configurations may not be compatible with newer Talos versions. Check the `version` field in the configuration.

Understanding how to apply and manage machine configurations is fundamental to working with Talos Linux. The declarative approach means you always know what state your nodes should be in, and every change goes through the same well-defined process.
