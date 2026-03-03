# How to Use talosctl upgrade for Node Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, Upgrades, Node Management, Kubernetes, Infrastructure

Description: Learn how to use talosctl upgrade to safely upgrade Talos Linux on your cluster nodes with a rolling upgrade strategy

---

Keeping your Talos Linux nodes up to date is critical for security, stability, and access to new features. The `talosctl upgrade` command handles the entire upgrade process for you, from downloading the new image to rebooting the node with the updated operating system. This guide walks you through everything you need to know about upgrading Talos Linux nodes safely and effectively.

## How Talos Linux Upgrades Work

Unlike traditional Linux distributions where you run package updates and hope nothing breaks, Talos Linux upgrades are atomic and image-based. When you run `talosctl upgrade`, the system downloads a new installer image, writes it to an alternate partition, and reboots into the new version. If the new version fails to boot, the system automatically rolls back to the previous version.

This approach means upgrades are safe, predictable, and reversible. There is no half-upgraded state where some packages are updated and others are not.

## Basic Upgrade Command

To upgrade a single node:

```bash
# Upgrade a node to a specific version
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

The `--image` flag specifies which Talos Linux version to install. The image tag corresponds to the Talos Linux release version.

## Pre-Upgrade Checklist

Before starting any upgrade, verify your cluster is healthy:

```bash
# Check cluster health
talosctl health --nodes 192.168.1.10

# Check current versions across all nodes
talosctl version --nodes 192.168.1.10,192.168.1.11,192.168.1.12

# Check etcd health
talosctl etcd members --nodes 192.168.1.10

# Take an etcd backup
talosctl etcd snapshot ./pre-upgrade-backup-$(date +%Y%m%d).snapshot \
  --nodes 192.168.1.10

# Check Kubernetes node status
kubectl get nodes
```

Never start an upgrade if your cluster is already unhealthy. Fix existing issues first.

## Upgrading Control Plane Nodes

Control plane nodes should be upgraded one at a time with verification between each upgrade:

```bash
# Upgrade the first control plane node
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Wait for the node to come back
echo "Waiting for node to reboot..."
sleep 60

# Verify the node is healthy
talosctl health --nodes 192.168.1.10 --wait-timeout 5m

# Check the version
talosctl version --nodes 192.168.1.10

# Check etcd is healthy
talosctl etcd members --nodes 192.168.1.10

# Verify the node is Ready in Kubernetes
kubectl get nodes
```

Only after confirming the first node is fully healthy should you move to the next:

```bash
# Upgrade the second control plane node
talosctl upgrade --nodes 192.168.1.11 \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Repeat verification steps...
```

## Upgrading Worker Nodes

Worker nodes are safer to upgrade since they do not run control plane components. You can optionally drain them first:

```bash
# Drain the node from Kubernetes
kubectl drain worker-1 --ignore-daemonsets --delete-emptydir-data

# Upgrade the node
talosctl upgrade --nodes 192.168.1.20 \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Wait for the node to come back
sleep 60

# Verify health
talosctl health --nodes 192.168.1.20 --wait-timeout 5m

# Uncordon the node
kubectl uncordon worker-1
```

For large clusters, you might want to upgrade multiple worker nodes in parallel, but be careful not to take too much capacity offline at once.

## Rolling Upgrade Script

Here is a complete rolling upgrade script for your cluster:

```bash
#!/bin/bash
# rolling-upgrade.sh - Upgrade all nodes in a Talos Linux cluster

NEW_IMAGE="ghcr.io/siderolabs/installer:v1.7.0"
CP_NODES="192.168.1.10 192.168.1.11 192.168.1.12"
WORKER_NODES="192.168.1.20 192.168.1.21 192.168.1.22 192.168.1.23"

# Pre-upgrade backup
echo "Taking pre-upgrade etcd backup..."
talosctl etcd snapshot ./pre-upgrade-$(date +%Y%m%d-%H%M%S).snapshot \
  --nodes 192.168.1.10

# Upgrade control plane nodes
echo "=== Upgrading Control Plane Nodes ==="
for node in $CP_NODES; do
  echo "Upgrading control plane node: $node"

  talosctl upgrade --nodes "$node" --image "$NEW_IMAGE"

  echo "Waiting for node to reboot..."
  sleep 90

  echo "Checking health..."
  if ! talosctl health --nodes "$node" --wait-timeout 10m; then
    echo "ERROR: Node $node failed health check after upgrade!"
    echo "Stopping upgrade. Investigate before continuing."
    exit 1
  fi

  echo "Verifying version..."
  talosctl version --nodes "$node"

  echo "Waiting 60 seconds before next upgrade..."
  sleep 60
done

# Upgrade worker nodes
echo "=== Upgrading Worker Nodes ==="
for node in $WORKER_NODES; do
  echo "Upgrading worker node: $node"

  talosctl upgrade --nodes "$node" --image "$NEW_IMAGE"

  echo "Waiting for node to reboot..."
  sleep 60

  echo "Checking health..."
  talosctl health --nodes "$node" --wait-timeout 10m

  echo "Verifying version..."
  talosctl version --nodes "$node"

  sleep 30
done

echo "=== Upgrade Complete ==="
talosctl version --nodes "$(echo $CP_NODES $WORKER_NODES | tr ' ' ',')"
```

## Using the Preserve Flag

By default, `talosctl upgrade` preserves your machine configuration and data. If you want to explicitly control this:

```bash
# Upgrade with explicit preserve (default behavior)
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --preserve
```

The preserve flag ensures that the node's machine configuration, etcd data (on control plane nodes), and other persistent state are kept across the upgrade.

## Upgrading with System Extensions

If you use system extensions (like ZFS, NVIDIA drivers, or iscsi-tools), you need to use a custom installer image that includes those extensions:

```bash
# Use the Talos Image Factory to generate a custom installer URL
# that includes your extensions, then use that URL for the upgrade
talosctl upgrade --nodes 192.168.1.10 \
  --image factory.talos.dev/installer/<schematic-id>:v1.7.0
```

Make sure the new installer image includes the same set of extensions you are currently using. Upgrading without an extension that your node depends on can cause issues.

## Handling Upgrade Failures

If an upgrade fails, Talos Linux will automatically roll back to the previous version on the next boot. You can verify this:

```bash
# After a failed upgrade, check the version
talosctl version --nodes 192.168.1.10

# Check logs for upgrade errors
talosctl dmesg --nodes 192.168.1.10 | tail -50
talosctl logs machined --nodes 192.168.1.10 | grep -i upgrade
```

If the node does not come back at all, you might need to:

1. Wait longer (some hardware takes time to reboot)
2. Check physical console access for boot errors
3. Use out-of-band management (IPMI) to check the node's state

## Staging Upgrades

You can stage an upgrade without immediately rebooting the node:

```bash
# Stage the upgrade - downloads the image but does not reboot
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --stage

# The upgrade will be applied on the next reboot
# You can trigger the reboot when ready
talosctl reboot --nodes 192.168.1.10
```

Staging is useful when you want to download the upgrade image during a low-traffic period and then apply it during a scheduled maintenance window.

## Checking Available Versions

Before upgrading, check which versions are available:

```bash
# Check the latest release on GitHub
# Visit: https://github.com/siderolabs/talos/releases

# Or use the crane tool to list available tags
crane ls ghcr.io/siderolabs/installer | tail -10
```

Always read the release notes for the version you are upgrading to. They contain important information about breaking changes, deprecations, and new features.

## Post-Upgrade Verification

After upgrading all nodes, do a final verification:

```bash
# Check all node versions match
talosctl version --nodes 192.168.1.10,192.168.1.11,192.168.1.12,192.168.1.20,192.168.1.21

# Run a comprehensive health check
talosctl health --nodes 192.168.1.10

# Check Kubernetes nodes
kubectl get nodes

# Check all pods are running
kubectl get pods -A | grep -v Running | grep -v Completed

# Check etcd health
talosctl etcd members --nodes 192.168.1.10
```

## Best Practices

- Always take an etcd backup before starting any upgrade.
- Upgrade control plane nodes one at a time with verification between each.
- Read the release notes before upgrading to understand breaking changes.
- Test upgrades in a staging environment before applying to production.
- Keep your `talosctl` client version in sync with your cluster version.
- Monitor your cluster throughout the upgrade process.
- Have a rollback plan ready, even though Talos handles automatic rollback.
- Stage upgrades during low-traffic periods for critical clusters.
- Do not skip minor versions when upgrading. Go from 1.6 to 1.7, not 1.6 to 1.8.

The `talosctl upgrade` command makes node upgrades predictable and safe. By following a disciplined rolling upgrade approach, you can keep your cluster current without downtime.
