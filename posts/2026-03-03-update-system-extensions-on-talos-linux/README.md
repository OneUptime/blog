# How to Update System Extensions on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, System Extensions, Updates, Upgrade, Kubernetes, Infrastructure

Description: A practical guide to updating system extensions on Talos Linux, covering version management, rolling updates, compatibility checks, and rollback procedures.

---

System extensions on Talos Linux are tied to the Talos version and the installer image. Updating them is not as simple as running an `apt upgrade` - it requires building or referencing a new installer image with the updated extensions and then upgrading each node. This deliberate approach ensures that updates are predictable, testable, and reversible. This guide covers the complete workflow for updating extensions safely.

## How Extension Versioning Works

Each system extension is published as an OCI image with version tags that typically correspond to the Talos version they are compatible with:

```
ghcr.io/siderolabs/iscsi-tools:v1.7.0     # For Talos v1.7.0
ghcr.io/siderolabs/iscsi-tools:v1.7.1     # For Talos v1.7.1
ghcr.io/siderolabs/iscsi-tools:v1.8.0     # For Talos v1.8.0
```

When Talos itself is updated, the extensions usually get new versions too. The extension version and the Talos version should match. Using an extension built for one Talos version with a different Talos version can lead to incompatibilities, especially for kernel module extensions.

## Checking Current Extension Versions

Before updating, check what you currently have:

```bash
# List installed extensions on a node
talosctl -n 192.168.1.10 get extensions

# Get detailed version information
talosctl -n 192.168.1.10 get extensions -o yaml

# Check the current Talos version
talosctl -n 192.168.1.10 version
```

The output shows each extension's name, version, and the image it was loaded from.

## Checking for Available Updates

To see if newer versions of your extensions are available:

```bash
# Check available tags for an extension
# Using crane (go install github.com/google/go-containerregistry/cmd/crane@latest)
crane ls ghcr.io/siderolabs/iscsi-tools
crane ls ghcr.io/siderolabs/qemu-guest-agent
crane ls ghcr.io/siderolabs/tailscale

# Check the Talos releases page for compatible versions
# https://github.com/siderolabs/talos/releases
```

## Update Scenarios

### Scenario 1: Updating Extensions with a Talos Upgrade

The most common scenario is updating extensions as part of a Talos version upgrade. When you upgrade Talos, you should also update all extensions to their matching versions:

```bash
# Create a new schematic with updated extension versions
curl -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/json" \
  -d '{
    "customization": {
      "systemExtensions": {
        "officialExtensions": [
          "siderolabs/iscsi-tools",
          "siderolabs/qemu-guest-agent"
        ]
      }
    }
  }'

# The Image Factory will select the correct extension versions
# for the Talos version you specify in the installer URL

# Upgrade the node
talosctl -n 192.168.1.10 upgrade \
  --image factory.talos.dev/installer/<new-schematic-id>:v1.8.0
```

### Scenario 2: Updating Extensions Without Upgrading Talos

If you need to update an extension but keep the same Talos version (for example, to get a bug fix in an extension), you can create a new installer image with the updated extension:

```bash
# Create a new schematic referencing the fixed extension
# The Image Factory handles version selection

# Upgrade with the new image (same Talos version)
talosctl -n 192.168.1.10 upgrade \
  --image factory.talos.dev/installer/<updated-schematic-id>:v1.7.0
```

### Scenario 3: Adding a New Extension

Adding a new extension to an existing cluster also requires creating a new installer image:

```bash
# Create schematic with the additional extension
curl -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/json" \
  -d '{
    "customization": {
      "systemExtensions": {
        "officialExtensions": [
          "siderolabs/iscsi-tools",
          "siderolabs/qemu-guest-agent",
          "siderolabs/tailscale"
        ]
      }
    }
  }'

# Upgrade with the new image
talosctl -n 192.168.1.10 upgrade \
  --image factory.talos.dev/installer/<new-schematic>:v1.7.0
```

## Rolling Update Strategy

Never update all nodes simultaneously. Use a rolling strategy:

```bash
#!/bin/bash

IMAGE="factory.talos.dev/installer/<new-schematic-id>:v1.8.0"

# Update control plane nodes one at a time
CP_NODES="192.168.1.10 192.168.1.11 192.168.1.12"

for node in $CP_NODES; do
  echo "=== Updating control plane node: $node ==="

  # Check current state
  echo "Current extensions:"
  talosctl -n "$node" get extensions

  # Start upgrade
  echo "Starting upgrade..."
  talosctl -n "$node" upgrade --image "$IMAGE"

  # Wait for the node to come back
  echo "Waiting for node to restart..."
  sleep 180

  # Verify the upgrade
  echo "Verifying..."
  talosctl -n "$node" version
  talosctl -n "$node" get extensions
  talosctl -n "$node" services

  # Check etcd health before moving to the next node
  talosctl -n "$node" etcd status
  talosctl -n "$node" etcd members

  echo "Control plane node $node updated successfully."
  echo ""

  # Optional: wait between nodes for stability
  sleep 60
done

# Update worker nodes
WORKER_NODES="192.168.1.20 192.168.1.21 192.168.1.22"

for node in $WORKER_NODES; do
  echo "=== Updating worker node: $node ==="

  # Cordon the node to prevent new pod scheduling
  kubectl cordon "$node"

  # Drain pods from the node
  kubectl drain "$node" --ignore-daemonsets --delete-emptydir-data --timeout=300s

  # Start upgrade
  talosctl -n "$node" upgrade --image "$IMAGE"

  # Wait for the node to come back
  sleep 120

  # Verify
  talosctl -n "$node" version
  talosctl -n "$node" get extensions

  # Uncordon the node
  kubectl uncordon "$node"

  echo "Worker node $node updated successfully."
  echo ""
done
```

## Pre-Update Checks

Before starting any update, perform these checks:

```bash
# 1. Verify current cluster health
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 services
kubectl get nodes -o wide
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# 2. Check etcd health
talosctl -n 192.168.1.10 etcd status
talosctl -n 192.168.1.10 etcd members

# 3. Take an etcd snapshot
talosctl -n 192.168.1.10 etcd snapshot ./etcd-backup-$(date +%Y%m%d).snapshot

# 4. Record current extension versions
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  echo "=== $node ==="
  talosctl -n "$node" get extensions
done > extension-versions-before-update.txt

# 5. Verify the new image is accessible
crane manifest factory.talos.dev/installer/<new-schematic-id>:v1.8.0
```

## Post-Update Verification

After updating each node:

```bash
# 1. Verify extensions are updated
talosctl -n 192.168.1.10 get extensions -o yaml

# 2. Check all services are healthy
talosctl -n 192.168.1.10 services

# 3. Verify extension-specific functionality
# For iscsi-tools:
talosctl -n 192.168.1.10 read /proc/modules | grep iscsi

# For QEMU guest agent:
talosctl -n 192.168.1.10 services | grep qemu

# For Tailscale:
talosctl -n 192.168.1.10 logs ext-tailscale | tail -5

# 4. Check Kubernetes node status
kubectl get nodes -o wide

# 5. Verify workloads are running
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed
```

## Handling Update Failures

### Node Does Not Come Back After Upgrade

If a node fails to boot after an extension update, Talos has built-in rollback:

```bash
# Talos uses A/B partitions
# If the new image fails to boot, it automatically rolls back

# Check from another node if the failed node is reachable
talosctl -n 192.168.1.11 get members

# If the node rolled back, check the logs
talosctl -n 192.168.1.10 dmesg | grep -i "rollback\|error\|fail"
```

### Extension Service Fails to Start

If the extension installs but its service does not start:

```bash
# Check service status
talosctl -n 192.168.1.10 services

# Check extension logs
talosctl -n 192.168.1.10 logs ext-<extension-name>

# Check for compatibility issues in dmesg
talosctl -n 192.168.1.10 dmesg | grep -i error
```

### Rolling Back an Extension Update

To roll back, upgrade with the previous installer image:

```bash
# Roll back to the previous version
talosctl -n 192.168.1.10 upgrade \
  --image factory.talos.dev/installer/<previous-schematic-id>:v1.7.0
```

## Automating Extension Updates

For large clusters, automate the update process:

```bash
#!/bin/bash
# automated-extension-update.sh

set -e

NEW_IMAGE="factory.talos.dev/installer/<new-schematic>:v1.8.0"
LOG_FILE="extension-update-$(date +%Y%m%d).log"

log() {
  echo "$(date -u): $1" | tee -a "$LOG_FILE"
}

check_node_health() {
  local node=$1
  local healthy=true

  # Check services
  if ! talosctl -n "$node" services 2>/dev/null | grep -q "Running.*OK"; then
    healthy=false
  fi

  echo "$healthy"
}

update_node() {
  local node=$1
  local node_type=$2

  log "Starting update on $node ($node_type)"

  # Pre-check
  if [ "$(check_node_health "$node")" != "true" ]; then
    log "WARNING: $node is not healthy before update. Skipping."
    return 1
  fi

  # Drain if worker
  if [ "$node_type" = "worker" ]; then
    kubectl drain "$node" --ignore-daemonsets --delete-emptydir-data --timeout=300s
  fi

  # Upgrade
  talosctl -n "$node" upgrade --image "$NEW_IMAGE"

  # Wait and verify
  sleep 180
  talosctl -n "$node" get extensions >> "$LOG_FILE"

  # Uncordon if worker
  if [ "$node_type" = "worker" ]; then
    kubectl uncordon "$node"
  fi

  log "Update complete on $node"
}

# Execute updates
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  update_node "$node" "controlplane"
done

for node in 192.168.1.20 192.168.1.21; do
  update_node "$node" "worker"
done

log "All updates complete."
```

## Best Practices

1. **Always test in staging** - Update extensions in a non-production environment first.

2. **Match extension and Talos versions** - Use extension versions that are built for your Talos version.

3. **Update one node at a time** - Never update all nodes simultaneously.

4. **Take etcd snapshots before updating control plane nodes** - This is your safety net if something goes wrong.

5. **Verify after each node** - Check services, extensions, and workload health before moving to the next node.

6. **Keep update records** - Log which extensions were updated, when, and the outcome.

Updating system extensions on Talos Linux is a deliberate process that prioritizes safety and predictability. By following a structured approach with proper testing, rolling updates, and verification at each step, you can keep your extensions current without risking cluster stability.
