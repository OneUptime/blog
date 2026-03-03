# How to Remove System Extensions from Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, System Extensions, Kubernetes, Infrastructure, Configuration Management

Description: Learn how to safely remove system extensions from Talos Linux nodes, including dependency checking, creating new installer images, and verifying the removal.

---

There comes a time when you need to remove a system extension from your Talos Linux cluster. Maybe you are decommissioning a storage solution and no longer need iSCSI tools. Perhaps you switched from one guest agent to another. Or maybe an extension was added during initial setup but turned out to be unnecessary. Removing extensions on Talos is not a simple uninstall command - it requires generating a new installer image without the unwanted extension and upgrading the node. This guide walks through the complete removal process.

## Understanding Extension Removal

On traditional Linux, removing a package is as simple as `apt remove` or `yum erase`. Talos works differently. Extensions are baked into the installer image, and removing one means creating a new installer image that does not include it. Then you upgrade the node with this new image, and after a reboot, the extension is gone.

This approach has an important benefit: it is atomic and reversible. Either the extension is fully present or fully absent. There is no partial state where some files from the extension remain while others are removed.

## Step 1: Identify Extensions to Remove

Start by checking what extensions are currently installed:

```bash
# List all extensions on the node
talosctl -n 192.168.1.10 get extensions

# Get detailed information
talosctl -n 192.168.1.10 get extensions -o yaml
```

Example output:

```yaml
items:
  - metadata:
      name: iscsi-tools
    spec:
      version: v1.7.0
      image: ghcr.io/siderolabs/iscsi-tools:v1.7.0
  - metadata:
      name: qemu-guest-agent
    spec:
      version: v1.7.0
      image: ghcr.io/siderolabs/qemu-guest-agent:v1.7.0
  - metadata:
      name: tailscale
    spec:
      version: v1.7.0
      image: ghcr.io/siderolabs/tailscale:v1.7.0
```

Decide which extension(s) you want to remove. In this example, let's say we want to remove the Tailscale extension.

## Step 2: Check for Dependencies

Before removing an extension, verify that nothing depends on it:

### Storage Extensions

If removing iSCSI tools, check that no volumes are using iSCSI:

```bash
# Check for iSCSI-based PersistentVolumes
kubectl get pv -o yaml | grep -i iscsi

# Check for storage classes that use iSCSI
kubectl get storageclass -o yaml | grep -i iscsi

# Check for active iSCSI sessions on the node
talosctl -n 192.168.1.10 read /proc/modules | grep iscsi
```

### Networking Extensions

If removing Tailscale, check that no services or configurations depend on the Tailscale network:

```bash
# Check if any services route through Tailscale IPs
kubectl get svc --all-namespaces -o wide | grep -E "100\."

# Check if the Talos API endpoint uses a Tailscale address
talosctl config info
```

### GPU Extensions

If removing NVIDIA extensions, ensure no GPU workloads are running:

```bash
# Check for pods requesting GPU resources
kubectl get pods --all-namespaces -o yaml | grep "nvidia.com/gpu"

# Remove the NVIDIA device plugin first
kubectl delete -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/main/deployments/static/nvidia-device-plugin.yml
```

## Step 3: Create a New Installer Image

Generate a new schematic that excludes the extension you want to remove. If you currently have three extensions and want to remove one, create a schematic with only the two remaining extensions:

```bash
# Original schematic had: iscsi-tools, qemu-guest-agent, tailscale
# New schematic without tailscale:
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

# Save the new schematic ID
# factory.talos.dev/installer/<new-schematic-without-tailscale>:v1.7.0
```

## Step 4: Clean Up Extension Configuration

Before upgrading, remove any configuration related to the extension from the machine config:

```bash
# For Tailscale, remove the auth configuration
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "remove",
    "path": "/machine/files/0"
  }
]'
```

Be careful with the path index - check the current configuration to find the correct index:

```bash
# View current files configuration to find the right index
talosctl -n 192.168.1.10 get machineconfig -o yaml | grep -A5 "files:"
```

For extensions that configured kernel modules:

```bash
# Remove kernel module configuration
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "remove",
    "path": "/machine/kernel/modules/0"
  }
]'
```

## Step 5: Upgrade the Node

Apply the new image that does not include the removed extension:

```bash
# Upgrade with the new image
talosctl -n 192.168.1.10 upgrade \
  --image factory.talos.dev/installer/<new-schematic>:v1.7.0
```

The node will reboot with the new image, and the removed extension will no longer be present.

## Step 6: Verify the Removal

After the node comes back up:

```bash
# Verify the extension is gone
talosctl -n 192.168.1.10 get extensions

# The removed extension should not appear in the list

# Check that services are healthy
talosctl -n 192.168.1.10 services

# Verify the node is working correctly
kubectl get nodes
```

## Rolling Removal Across the Cluster

Remove extensions from nodes one at a time:

```bash
#!/bin/bash

NEW_IMAGE="factory.talos.dev/installer/<schematic-without-extension>:v1.7.0"

# Control plane nodes first
CP_NODES="192.168.1.10 192.168.1.11 192.168.1.12"

for node in $CP_NODES; do
  echo "=== Removing extension from $node ==="

  # Remove extension-related config
  # (adjust the patch based on your configuration)
  talosctl -n "$node" patch machineconfig -p '[
    {
      "op": "remove",
      "path": "/machine/files/0"
    }
  ]' 2>/dev/null || true

  # Upgrade with new image
  talosctl -n "$node" upgrade --image "$NEW_IMAGE"

  # Wait for node to come back
  sleep 180

  # Verify
  echo "Extensions on $node:"
  talosctl -n "$node" get extensions

  # Check etcd health
  talosctl -n "$node" etcd status

  echo "Done with $node"
  echo ""
done

# Worker nodes
WORKER_NODES="192.168.1.20 192.168.1.21"

for node in $WORKER_NODES; do
  echo "=== Removing extension from $node ==="

  # Drain the node
  kubectl drain "$node" --ignore-daemonsets --delete-emptydir-data --timeout=300s

  # Remove config and upgrade
  talosctl -n "$node" patch machineconfig -p '[
    {
      "op": "remove",
      "path": "/machine/files/0"
    }
  ]' 2>/dev/null || true

  talosctl -n "$node" upgrade --image "$NEW_IMAGE"

  sleep 120

  # Uncordon
  kubectl uncordon "$node"

  echo "Extensions on $node:"
  talosctl -n "$node" get extensions

  echo "Done with $node"
  echo ""
done
```

## Special Considerations

### Removing Storage Extensions

If you are removing a storage extension like iSCSI tools, make sure to migrate any data first:

```bash
# 1. Identify PVCs using the storage backend
kubectl get pvc --all-namespaces

# 2. Migrate data to a different storage backend
# This is application-specific

# 3. Delete the old PVCs
kubectl delete pvc <pvc-name> -n <namespace>

# 4. Remove the storage class
kubectl delete storageclass <storageclass-name>

# 5. Uninstall the storage solution (e.g., Longhorn)
helm uninstall longhorn -n longhorn-system

# 6. Then remove the extension
```

### Removing Guest Agent Extensions

If you are switching virtualization platforms (for example, migrating from VMware to Proxmox), remove the old guest agent before adding the new one:

```bash
# Remove VMware tools, add QEMU guest agent
# Create a schematic with the new agent but not the old one
```

### Removing GPU Extensions

Remove Kubernetes-level GPU components first:

```bash
# 1. Remove GPU workloads
kubectl delete deployment my-gpu-app

# 2. Remove device plugin
kubectl delete daemonset nvidia-device-plugin -n kube-system

# 3. Remove containerd runtime configuration
talosctl -n 192.168.1.20 patch machineconfig -p '[
  {
    "op": "remove",
    "path": "/machine/files/0"
  }
]'

# 4. Remove kernel module configuration
talosctl -n 192.168.1.20 patch machineconfig -p '[
  {
    "op": "remove",
    "path": "/machine/kernel/modules"
  }
]'

# 5. Upgrade without NVIDIA extensions
```

## Troubleshooting

### Node Fails to Boot After Removal

If removing an extension causes boot issues:

```bash
# Talos will automatically roll back to the previous image
# Check from another node:
talosctl -n 192.168.1.11 get members

# If the node rolled back, check what went wrong
talosctl -n 192.168.1.10 dmesg
talosctl -n 192.168.1.10 logs machined
```

### Leftover Configuration

If extension-related configuration remains after removal:

```bash
# Check for any remaining config
talosctl -n 192.168.1.10 get machineconfig -o yaml | grep -i <extension-name>

# Clean up any remaining configuration
talosctl -n 192.168.1.10 patch machineconfig -p '<appropriate-patch>'
```

### Services Still Running

If you see references to the removed extension in service logs:

```bash
# This should not happen after a reboot, but check
talosctl -n 192.168.1.10 services

# If you see ghost services, a full reboot should clear them
talosctl -n 192.168.1.10 reboot
```

## Best Practices

1. **Remove dependencies first** - Uninstall any Kubernetes resources that depend on the extension before removing it.

2. **Test in staging** - Verify the removal process in a non-production environment first.

3. **One node at a time** - Follow a rolling update strategy.

4. **Keep backups** - Take etcd snapshots before removing extensions from control plane nodes.

5. **Clean up configuration** - Remove all extension-related machine config entries, not just the extension itself.

6. **Document changes** - Record what was removed, why, and when.

Removing system extensions from Talos Linux is a clean, atomic operation that leaves no remnants behind. By following a methodical approach - checking dependencies, creating a new image, cleaning up configuration, and verifying after removal - you can safely streamline your Talos nodes to include only the extensions they actually need.
