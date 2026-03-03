# How to Migrate from Talos v1.x to v1.y

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Migration, Version Upgrade, Cluster Management

Description: A comprehensive guide to migrating your Talos Linux cluster from one minor version to another with minimal risk and downtime.

---

Migrating between Talos Linux minor versions - say from v1.6 to v1.7 - is one of the most common maintenance tasks for Talos operators. While the process is well-documented by Siderolabs, there are plenty of practical details that only become apparent when you actually do it. This guide walks through the entire migration process with real-world tips.

## Understanding Minor Version Upgrades

Talos follows semantic versioning. A move from v1.6 to v1.7 is a minor version upgrade, which means new features and potentially breaking changes. Patch upgrades within the same minor version (v1.6.3 to v1.6.7) are simpler and carry less risk.

The most important rule: Talos only supports upgrading one minor version at a time. If you are on v1.5 and want to reach v1.7, you must go through v1.6 first. There are no shortcuts.

```bash
# Check your current Talos version
talosctl version --nodes <node-ip>

# Example output showing v1.6.4
# Tag:         v1.6.4
# SHA:         abc123...
```

## Phase 1: Research and Planning

### Read the Release Notes

Every minor version release includes detailed notes about what changed. Read them completely. Pay particular attention to:

```bash
# Items to look for in release notes:
# 1. Breaking changes in machine configuration
# 2. Deprecated fields or features
# 3. Changed defaults
# 4. New required configuration fields
# 5. Kubernetes version support matrix changes
# 6. System extension compatibility changes
```

### Check the Upgrade Guide

Talos publishes specific upgrade guides for each minor version transition. These guides list the exact steps and configuration changes needed.

```bash
# The upgrade guide is typically at:
# https://www.talos.dev/v1.7/talos-guides/upgrading-talos/
# Replace v1.7 with your target version
```

### Verify Kubernetes Compatibility

Different Talos versions support different Kubernetes versions. Make sure your current Kubernetes version is supported by the target Talos version.

```bash
# Check current Kubernetes version
kubectl version --short

# Verify this version is in the support matrix
# for the target Talos release
```

If your Kubernetes version is not supported by the new Talos version, you may need to upgrade Kubernetes as part of the migration. Check whether to upgrade Kubernetes before or after Talos - the release notes will specify.

## Phase 2: Configuration Migration

### Export Current Configuration

```bash
# Export machine configs from all node types
talosctl get machineconfig --nodes <cp-node> -o yaml > cp-config-v1.6.yaml
talosctl get machineconfig --nodes <worker-node> -o yaml > worker-config-v1.6.yaml
```

### Validate Against the New Version

Download the `talosctl` binary for the target version and use it to validate your configurations:

```bash
# Download the target version talosctl
curl -Lo talosctl-v1.7 \
  https://github.com/siderolabs/talos/releases/download/v1.7.0/talosctl-linux-amd64
chmod +x talosctl-v1.7

# Validate your existing config against the new version
./talosctl-v1.7 validate --config cp-config-v1.6.yaml --mode metal
```

If validation fails, you need to update your configuration to match the new schema.

### Apply Configuration Changes

Common configuration changes between minor versions include:

```yaml
# Example: A field that moved in v1.7
# Old location (v1.6):
machine:
  install:
    disk: /dev/sda

# New location (v1.7) - hypothetical example:
machine:
  install:
    disk: /dev/sda
    # New required field in v1.7
    bootloader:
      type: grub
```

Update your configuration templates and apply them:

```bash
# Apply updated config to each node before upgrading
talosctl apply-config --nodes <node-ip> \
  --file updated-config.yaml
```

Some configuration changes can be applied before the upgrade (they are backward-compatible), while others must be applied during or after. The upgrade guide specifies which is which.

## Phase 3: Prepare the Upgrade

### Update talosctl

Always use the target version of `talosctl` for the upgrade. Version mismatches between `talosctl` and the cluster can cause unexpected behavior.

```bash
# Install the target version talosctl
curl -Lo /usr/local/bin/talosctl \
  https://github.com/siderolabs/talos/releases/download/v1.7.0/talosctl-linux-amd64
chmod +x /usr/local/bin/talosctl

# Verify
talosctl version --client
```

### Prepare System Extension Images

If you use system extensions, prepare installer images for the new version:

```bash
# Use Image Factory to generate a custom installer
# that includes your extensions for the target version
# See the Image Factory documentation for details

INSTALLER_IMAGE="factory.talos.dev/installer/<schematic-id>:v1.7.0"
```

### Back Up Everything

```bash
# etcd snapshot
talosctl etcd snapshot ./etcd-backup-pre-migration.snapshot \
  --nodes <cp-node>

# Machine configs
for node in cp1 cp2 cp3 worker1 worker2; do
    talosctl get machineconfig --nodes ${node} \
      -o yaml > backup-${node}-config.yaml
done
```

## Phase 4: Execute the Migration

Follow the standard upgrade order: control plane first, then workers.

### Upgrade Control Plane Nodes

```bash
# Upgrade first control plane node
talosctl upgrade --nodes <cp-node-1> --image ${INSTALLER_IMAGE}

# Wait for health
talosctl health --nodes <cp-node-1> --wait-timeout 10m

# Verify etcd
talosctl etcd status --nodes <cp-node-2>
talosctl etcd members --nodes <cp-node-2>

# Check the new version
talosctl version --nodes <cp-node-1>

# Repeat for remaining control plane nodes
talosctl upgrade --nodes <cp-node-2> --image ${INSTALLER_IMAGE}
talosctl health --nodes <cp-node-2> --wait-timeout 10m

talosctl upgrade --nodes <cp-node-3> --image ${INSTALLER_IMAGE}
talosctl health --nodes <cp-node-3> --wait-timeout 10m
```

### Upgrade Worker Nodes

```bash
# For each worker node
NODE_NAME=$(kubectl get nodes -o wide | grep <worker-ip> | awk '{print $1}')

kubectl cordon ${NODE_NAME}
kubectl drain ${NODE_NAME} --ignore-daemonsets --delete-emptydir-data

talosctl upgrade --nodes <worker-ip> --image ${INSTALLER_IMAGE}
talosctl health --nodes <worker-ip> --wait-timeout 10m

kubectl uncordon ${NODE_NAME}
```

## Phase 5: Post-Migration Tasks

### Upgrade Kubernetes (If Needed)

If the new Talos version supports a newer Kubernetes version and you want to upgrade:

```bash
# Upgrade Kubernetes after Talos migration
talosctl upgrade-k8s --to 1.30.0 --nodes <cp-node-1>

# Monitor the Kubernetes upgrade
kubectl get nodes --watch
```

### Apply Post-Upgrade Configuration Changes

Some configuration changes can only be applied after the Talos version upgrade:

```bash
# Apply any post-upgrade config changes
talosctl apply-config --nodes <node-ip> \
  --file post-upgrade-config.yaml
```

### Run Full Validation

```bash
# Verify all nodes
talosctl version --nodes <all-nodes>

# Check etcd health
talosctl etcd status --nodes <cp-node-1>

# Verify Kubernetes
kubectl get nodes -o wide
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Run application tests
./run-integration-tests.sh
```

### Update Documentation and Automation

After a successful migration, update:

- Your infrastructure-as-code with the new version numbers
- CI/CD pipelines that reference specific Talos versions
- Monitoring dashboards with new metrics (if any changed)
- Runbooks and documentation

## Handling Multi-Step Migrations

If you need to jump multiple minor versions (say v1.5 to v1.8), plan each step as a separate migration:

```bash
# Migration path: v1.5 -> v1.6 -> v1.7 -> v1.8
# Each step follows the full procedure:
# 1. Read release notes for the target version
# 2. Update configurations
# 3. Back up
# 4. Upgrade control plane
# 5. Upgrade workers
# 6. Validate
# 7. Move to next step
```

This is time-consuming but necessary. Attempting to skip versions can result in configuration incompatibilities, data migration issues, or outright failures.

## Summary

Migrating from one Talos Linux minor version to another is a multi-phase process that requires careful planning. Read the release notes, validate and update your configurations, back up everything, upgrade nodes in the correct order, and validate thoroughly after each step. Do not skip versions, and do not rush the process. A well-executed migration should result in zero downtime for a properly configured high-availability cluster.
