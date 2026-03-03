# How to Upgrade Talos Linux to a Newer Version

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Upgrade, Version Management, Kubernetes, Cluster Maintenance

Description: A complete guide to upgrading Talos Linux to a newer version, including preparation steps, the upgrade process, verification, and handling common issues.

---

Upgrading Talos Linux to a newer version is one of the most important maintenance tasks for any Talos cluster. New versions bring security patches, bug fixes, performance improvements, and support for newer Kubernetes versions. Talos makes the upgrade process relatively simple and safe, but understanding the details helps you plan and execute upgrades with confidence.

## Before You Upgrade

### Check the Release Notes

Every Talos release has release notes that document breaking changes, new features, and upgrade requirements. Always read these before starting.

```bash
# Check your current Talos version
talosctl version --nodes 192.168.1.10

# Check the latest available version
# Visit https://github.com/siderolabs/talos/releases
```

### Verify Cluster Health

Make sure your cluster is in a healthy state before upgrading:

```bash
# Check that all nodes are Ready
kubectl get nodes

# Check that all system pods are running
kubectl get pods -n kube-system

# Verify etcd health on control plane nodes
talosctl etcd status --nodes 192.168.1.10

# Check for any existing alerts or issues
talosctl health --nodes 192.168.1.10
```

### Check Version Compatibility

Talos versions are tied to specific Kubernetes versions. Make sure the Talos version you are upgrading to supports the Kubernetes version you want to run:

```bash
# Check current Kubernetes version
kubectl version --short

# The Talos release notes specify which Kubernetes versions are supported
```

### Take Backups

Before any upgrade, take an etcd snapshot:

```bash
# Snapshot etcd
talosctl etcd snapshot /tmp/etcd-backup-pre-upgrade.snapshot \
  --nodes 192.168.1.10

# Keep a copy of your machine configuration
talosctl get machineconfig --nodes 192.168.1.10 -o yaml > cp-01-config-backup.yaml
```

## The Upgrade Process

### Upgrading a Single Node

The basic upgrade command is straightforward:

```bash
# Upgrade a node to a specific Talos version
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

This command does the following:
1. Downloads the new Talos installer image
2. Writes the new kernel and initramfs to the inactive boot slot
3. Updates the bootloader configuration
4. Reboots the node
5. The node boots with the new Talos version

The `--preserve` flag keeps the existing machine configuration and ephemeral data:

```bash
# Upgrade while preserving configuration and data
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --preserve
```

### Upgrade Order

The recommended upgrade order is:

1. **Control plane nodes first**, one at a time
2. **Worker nodes** after all control plane nodes are upgraded

For control plane nodes, wait for each node to finish upgrading and rejoin the cluster before moving to the next one:

```bash
# Upgrade control plane node 1
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Wait for the node to come back
talosctl health --nodes 192.168.1.10 --wait-timeout 10m

# Verify it is running the new version
talosctl version --nodes 192.168.1.10

# Check etcd health
talosctl etcd status --nodes 192.168.1.10

# Then proceed to control plane node 2
talosctl upgrade --nodes 192.168.1.11 \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

### Upgrading Worker Nodes

Worker nodes can be upgraded more aggressively since they do not affect control plane availability:

```bash
# Upgrade worker nodes one at a time
for NODE in 192.168.1.20 192.168.1.21 192.168.1.22; do
  echo "Upgrading $NODE..."
  talosctl upgrade --nodes "$NODE" \
    --image ghcr.io/siderolabs/installer:v1.7.0

  # Wait for the node to be ready
  echo "Waiting for $NODE to come back..."
  sleep 60
  talosctl health --nodes "$NODE" --wait-timeout 5m

  echo "$NODE upgraded successfully"
done
```

## Verifying the Upgrade

After upgrading each node, verify everything is working:

```bash
# Check the Talos version
talosctl version --nodes 192.168.1.10

# Check node status in Kubernetes
kubectl get nodes

# Verify system services are running
talosctl get services --nodes 192.168.1.10

# Check etcd (control plane only)
talosctl etcd status --nodes 192.168.1.10

# Run a health check
talosctl health --nodes 192.168.1.10
```

## Using Custom Images

If you use Talos with custom system extensions (like GPU drivers or storage tools), you need to upgrade using a custom installer image that includes those extensions:

```bash
# Build a custom installer image with extensions
docker run --rm -t -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  installer \
  --system-extension-image ghcr.io/siderolabs/nvidia-container-toolkit:535.54.03-v1.13.5 \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4

# Push the custom image to your registry
docker push myregistry.com/talos-installer:v1.7.0-custom

# Upgrade using the custom image
talosctl upgrade --nodes 192.168.1.10 \
  --image myregistry.com/talos-installer:v1.7.0-custom
```

## Handling Upgrade Issues

### Node Fails to Boot After Upgrade

Talos has an automatic rollback mechanism. If the new version fails to boot, the bootloader will revert to the previous version. Check if this happened:

```bash
# After the node comes back, check the version
talosctl version --nodes 192.168.1.10

# If it is still on the old version, the rollback happened
# Check dmesg for boot errors
talosctl dmesg --nodes 192.168.1.10
```

### Node Gets Stuck During Upgrade

If a node seems stuck during the upgrade process:

```bash
# Check upgrade status
talosctl get machinestatus --nodes 192.168.1.10

# Check system events
talosctl get events --nodes 192.168.1.10

# If the node is unresponsive, wait a few minutes
# The upgrade and reboot process can take time
```

### etcd Issues After Control Plane Upgrade

If etcd has problems after upgrading a control plane node:

```bash
# Check etcd member list
talosctl etcd members --nodes 192.168.1.11

# Check for etcd alarms
talosctl etcd alarm list --nodes 192.168.1.11

# If a member is unhealthy, it may need time to catch up
# Monitor the etcd logs
talosctl logs etcd --nodes 192.168.1.10
```

## Upgrade Strategies

### Conservative (Recommended for Production)

Upgrade one node at a time, wait for full health verification, and move on:

```bash
# For each node:
# 1. Verify cluster health
# 2. Upgrade the node
# 3. Wait for it to come back
# 4. Verify health again
# 5. Wait a buffer period
# 6. Move to the next node
```

### Staged Upgrade

Use the `--stage` flag to prepare the upgrade without rebooting immediately:

```bash
# Stage the upgrade on all nodes
for NODE in 192.168.1.10 192.168.1.11 192.168.1.12; do
  talosctl upgrade --nodes "$NODE" \
    --image ghcr.io/siderolabs/installer:v1.7.0 \
    --stage
done

# Nodes will apply the upgrade on next reboot
# You can then reboot nodes during a maintenance window
talosctl reboot --nodes 192.168.1.10
```

### Skip Version Upgrades

Talos generally supports upgrading from version N to version N+1. Skipping multiple versions may work but is not always guaranteed. Check the release notes for each intermediate version to understand any required migration steps.

## Scheduling Upgrades

Plan your upgrades during low-traffic periods and allow enough time for the full process:

- **Small cluster (3 control plane + 3 workers)**: Allow 1-2 hours
- **Medium cluster (3 CP + 20 workers)**: Allow 3-4 hours
- **Large cluster (3 CP + 100+ workers)**: Allow a full day or use rolling upgrades over multiple days

## Post-Upgrade Tasks

After all nodes are upgraded:

```bash
# Verify all nodes are on the new version
talosctl version --nodes 192.168.1.10,192.168.1.11,192.168.1.12

# Check cluster health
talosctl health --nodes 192.168.1.10

# Verify Kubernetes is healthy
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Run your application health checks
```

## Conclusion

Upgrading Talos Linux is a well-designed process with built-in safety mechanisms like automatic rollback. The key to successful upgrades is preparation: read the release notes, verify cluster health, take backups, and follow the correct upgrade order (control plane first, then workers). By upgrading one node at a time and verifying health between each upgrade, you minimize risk and maintain cluster availability throughout the process.
