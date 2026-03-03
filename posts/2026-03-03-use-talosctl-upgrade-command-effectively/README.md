# How to Use talosctl upgrade Command Effectively

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, Upgrade, Command Line, Cluster Operations

Description: Master the talosctl upgrade command with this in-depth guide covering all flags, options, best practices, and real-world usage patterns for Talos Linux upgrades.

---

The `talosctl upgrade` command is the primary tool for upgrading Talos Linux nodes. While the basic usage is simple, the command has several flags and options that give you precise control over the upgrade process. Understanding these options helps you plan upgrades more effectively and handle edge cases when they arise.

## Basic Syntax

The fundamental form of the command is:

```bash
talosctl upgrade --nodes <node-ip> --image <installer-image>
```

For example:

```bash
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

This downloads the specified installer image, writes the new Talos version to the inactive boot slot, and reboots the node.

## Essential Flags

### --nodes

Specifies which node to upgrade. You can specify one node at a time (recommended) or multiple nodes:

```bash
# Single node (recommended)
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Multiple nodes (they will be upgraded sequentially)
talosctl upgrade --nodes 192.168.1.10,192.168.1.11 \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

Upgrading one node at a time is the safest approach because it gives you full control over the process and makes troubleshooting easier if something goes wrong.

### --image

The installer image to use for the upgrade. This is typically the official Talos installer from the Siderolabs container registry:

```bash
# Official image
--image ghcr.io/siderolabs/installer:v1.7.0

# Custom image with extensions
--image myregistry.com/talos-installer:v1.7.0-custom

# Image from a private registry
--image registry.internal.company.com/talos/installer:v1.7.0
```

The image tag usually matches the Talos version, but for custom images it could be anything.

### --preserve

Keeps the existing machine configuration and EPHEMERAL partition data during the upgrade:

```bash
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --preserve
```

Without `--preserve`, the upgrade may wipe the EPHEMERAL partition, which means losing container images, pod data, and temporary storage. For most production upgrades, you want `--preserve`.

When to skip `--preserve`:
- When you want a clean EPHEMERAL partition
- When troubleshooting disk corruption issues
- When the EPHEMERAL partition is full and you want to clear it

### --stage

Prepares the upgrade without rebooting:

```bash
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --stage
```

The new image is downloaded and written to the inactive boot slot, but the node continues running the current version. You can then reboot at a time of your choosing:

```bash
# Later, when ready:
talosctl reboot --nodes 192.168.1.10
```

This is useful for planning maintenance windows where you want to minimize the reboot time.

### --force

Forces the upgrade even if the node detects potential issues:

```bash
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --force
```

Use this with caution. The pre-upgrade checks exist for a reason. Only use `--force` when you understand why the check is failing and have confirmed it is safe to proceed.

### --wait

Waits for the upgrade to complete before returning:

```bash
# Wait for the upgrade to complete (default behavior may vary)
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --wait

# Combine with a timeout
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --wait --wait-timeout 10m
```

## Choosing the Right Image

### Standard Official Images

```bash
# Standard Talos installer
ghcr.io/siderolabs/installer:v1.7.0

# The image includes the kernel, initramfs, and installer
```

### Custom Images with Extensions

If you need system extensions (GPU drivers, storage tools, etc.), build a custom image:

```bash
# Build custom installer image
docker run --rm -t -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  installer \
  --system-extension-image ghcr.io/siderolabs/nvidia-container-toolkit:535.54.03-v1.13.5 \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4 \
  --system-extension-image ghcr.io/siderolabs/qemu-guest-agent:8.2.2

# Tag and push to your registry
crane push /tmp/out/installer-amd64.tar myregistry.com/talos-installer:v1.7.0-custom

# Use in upgrade
talosctl upgrade --nodes 192.168.1.10 \
  --image myregistry.com/talos-installer:v1.7.0-custom
```

### Using Image Factory

The Talos Image Factory can generate custom images with extensions on demand:

```bash
# Use an Image Factory URL for the installer
talosctl upgrade --nodes 192.168.1.10 \
  --image factory.talos.dev/installer/<schematic-id>:v1.7.0
```

## Pre-Upgrade Checklist

Before running the upgrade command, run through these checks:

```bash
# 1. Verify current version
talosctl version --nodes 192.168.1.10

# 2. Check cluster health
talosctl health --nodes 192.168.1.10
kubectl get nodes

# 3. For control plane nodes, verify etcd
talosctl etcd status --nodes 192.168.1.10
talosctl etcd members --nodes 192.168.1.10

# 4. Check node capacity (ensure other nodes can handle workloads)
kubectl top nodes

# 5. Take etcd snapshot
talosctl etcd snapshot /tmp/etcd-backup.snapshot --nodes 192.168.1.10

# 6. Backup machine configuration
talosctl get machineconfig --nodes 192.168.1.10 -o yaml > node-config-backup.yaml
```

## Post-Upgrade Verification

After the upgrade command completes and the node reboots:

```bash
# 1. Check the new version
talosctl version --nodes 192.168.1.10

# 2. Verify health
talosctl health --nodes 192.168.1.10

# 3. Check services
talosctl get services --nodes 192.168.1.10

# 4. Verify Kubernetes sees the node
kubectl get nodes

# 5. For control plane nodes, check etcd
talosctl etcd status --nodes 192.168.1.10
talosctl etcd members --nodes 192.168.1.10

# 6. Check system extensions
talosctl get extensions --nodes 192.168.1.10
```

## Common Patterns

### Sequential Control Plane Upgrade

```bash
#!/bin/bash
IMAGE="ghcr.io/siderolabs/installer:v1.7.0"
CP_NODES=("192.168.1.10" "192.168.1.11" "192.168.1.12")

for NODE in "${CP_NODES[@]}"; do
  echo "Upgrading $NODE..."

  talosctl upgrade --nodes "$NODE" --image "$IMAGE" --preserve

  echo "Waiting for health check..."
  sleep 30
  talosctl health --nodes "$NODE" --wait-timeout 10m

  echo "Verifying etcd..."
  talosctl etcd status --nodes "$NODE"

  echo "$NODE complete"
  echo ""
done
```

### Worker Node Upgrade with Drain

```bash
#!/bin/bash
IMAGE="ghcr.io/siderolabs/installer:v1.7.0"
NODE="192.168.1.20"
HOSTNAME="worker-01"

# Drain
kubectl drain "$HOSTNAME" --ignore-daemonsets --delete-emptydir-data

# Upgrade
talosctl upgrade --nodes "$NODE" --image "$IMAGE" --preserve

# Wait
sleep 30
talosctl health --nodes "$NODE" --wait-timeout 5m

# Uncordon
kubectl uncordon "$HOSTNAME"
```

### Stage and Apply Pattern

```bash
# Phase 1: Stage during business hours
for NODE in "${ALL_NODES[@]}"; do
  talosctl upgrade --nodes "$NODE" --image "$IMAGE" --stage
done

# Phase 2: Apply during maintenance window
for NODE in "${CP_NODES[@]}"; do
  talosctl reboot --nodes "$NODE"
  sleep 30
  talosctl health --nodes "$NODE" --wait-timeout 10m
done

for NODE in "${WORKER_NODES[@]}"; do
  talosctl reboot --nodes "$NODE"
  sleep 30
  talosctl health --nodes "$NODE" --wait-timeout 5m
done
```

## Troubleshooting Upgrade Issues

### Upgrade Command Hangs

If the upgrade command seems stuck:

```bash
# The command might be waiting for the image to download
# Large custom images can take time

# Check if the node is still responsive
talosctl version --nodes 192.168.1.10

# Check events
talosctl get events --nodes 192.168.1.10
```

### Upgrade Fails to Start

```bash
# Check for error messages in the output
# Common issues:
# - Invalid image reference
# - Registry authentication failure
# - Disk space insufficient for the new image

# Verify the image exists and is pullable
crane manifest ghcr.io/siderolabs/installer:v1.7.0
```

### Node Does Not Come Back After Upgrade

```bash
# Wait a few minutes - reboots can take time

# Try to reach the node
talosctl version --nodes 192.168.1.10

# If unreachable, the automatic rollback should kick in
# Wait 5-10 minutes for the rollback to complete

# If still unreachable, check via console/IPMI access
```

### Wrong Version After Upgrade

If the node comes back running the old version:

```bash
# This means automatic rollback happened
# Check dmesg for boot errors
talosctl dmesg --nodes 192.168.1.10

# Check if there is a known issue with the target version
# Try the upgrade again if it was a transient issue
# Or investigate the boot failure before retrying
```

## Best Practices

1. Always use `--preserve` in production unless you have a specific reason not to
2. Upgrade one node at a time and verify health between each
3. Use `--stage` for planned maintenance windows
4. Keep your `talosctl` client version close to your cluster version
5. Test upgrades in a staging environment first
6. Document the exact upgrade command for each node type in your runbook
7. Take etcd snapshots before upgrading control plane nodes
8. Monitor the cluster during and after upgrades

## Conclusion

The `talosctl upgrade` command is a powerful and well-designed tool for managing Talos Linux upgrades. By understanding its flags - especially `--preserve`, `--stage`, and `--force` - you can tailor the upgrade process to your specific needs and constraints. Combined with proper pre-upgrade checks, post-upgrade verification, and a clear upgrade strategy, the command gives you everything you need to keep your Talos cluster up to date safely and efficiently.
