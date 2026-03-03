# How to Wipe and Reinstall Talos Linux on a Node

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Reinstall, Node Management, Kubernetes, Bare Metal

Description: A complete guide to wiping and reinstalling Talos Linux on a node, covering fresh installations from ISO, disk imaging, and automated provisioning workflows.

---

Sometimes a partial reset is not enough. When you need to change the Talos version on a node that cannot be upgraded in place, switch from one disk layout to another, or simply want the confidence of a completely fresh installation, wiping the entire disk and reinstalling Talos Linux from scratch is the way to go.

This guide covers the full process of wiping a node's disks and performing a fresh Talos Linux installation, whether you are working with bare metal, virtual machines, or cloud instances.

## When to Wipe and Reinstall

A full wipe and reinstall is appropriate when:

- **Upgrading across too many versions**: While Talos supports in-place upgrades, jumping across many major versions may require a fresh install.
- **Changing disk layout**: If you need to repartition the system disk or switch from MBR to GPT, a reinstall is necessary.
- **Hardware changes**: After replacing the system disk or significantly changing the hardware configuration.
- **Switching boot modes**: Moving from legacy BIOS boot to UEFI or enabling Secure Boot.
- **Starting completely fresh**: When you want absolute certainty that no data from the previous installation remains.

## Preparation Steps

### Step 1: Remove from the Cluster

Before wiping, cleanly remove the node from the Kubernetes cluster:

```bash
# Get node name
NODE_NAME="worker-3"

# Drain workloads
kubectl drain "${NODE_NAME}" \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=300s

# For control plane nodes, remove etcd member first
# Execute from a different control plane node
talosctl etcd remove-member --nodes 10.0.0.11 <member-id>

# Delete the Kubernetes node object
kubectl delete node "${NODE_NAME}"
```

### Step 2: Back Up Any Important Data

If the node has local persistent volumes or other important data, back it up:

```bash
# Check for persistent volumes on the node
kubectl get pv -o json | jq '.items[] | select(.spec.nodeAffinity) | .metadata.name'

# If using local path provisioner, the data is on the node's disk
# Copy it off before wiping
talosctl copy --nodes 10.0.0.50 /var/local-path-provisioner/ /tmp/backup/
```

### Step 3: Note the Current Configuration

Save the current machine configuration for reference:

```bash
# Get the current machine config
talosctl get machineconfig --nodes 10.0.0.50 -o yaml > old-config-backup.yaml
```

## Method 1: Reinstall via Talos Reset and New Config

The simplest method - reset the node completely and reapply configuration:

```bash
# Full reset with all partitions wiped
talosctl reset --nodes 10.0.0.50 \
  --graceful=false \
  --reboot=true \
  --system-labels-to-wipe STATE \
  --system-labels-to-wipe EPHEMERAL \
  --user-disks-to-wipe /dev/sdb \
  --user-disks-to-wipe /dev/sdc

# Wait for the node to enter maintenance mode
sleep 60

# Apply fresh configuration with a new installer image
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file worker.yaml
```

This method preserves the BOOT partition (the Talos OS binaries). The installer image specified in the machine config determines what version gets installed to disk.

## Method 2: Reinstall from ISO

For a truly clean installation that replaces everything including the OS binaries:

### Step 2a: Create or Download the ISO

```bash
# Generate a custom ISO with Image Factory
SCHEMATIC_ID=$(curl -s -X POST \
  --data-binary @schematic.yaml \
  https://factory.talos.dev/schematics | jq -r '.id')

wget -O talos.iso \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-amd64.iso"
```

### Step 2b: Boot from the ISO

For physical servers, write the ISO to a USB drive or mount it through IPMI virtual media:

```bash
# Write to USB
sudo dd if=talos.iso of=/dev/sdX bs=4M status=progress conv=fsync

# Or mount via IPMI (example with ipmitool)
ipmitool -H 10.0.0.150 -U admin -P password \
  sol activate  # Access serial console to change boot order
```

For virtual machines, attach the ISO through the hypervisor's management interface.

### Step 2c: Apply Configuration

Once the node boots from the ISO and enters maintenance mode:

```bash
# Apply the machine configuration
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file worker.yaml

# The installer will write Talos to the system disk
# This completely replaces any existing installation
```

## Method 3: Disk Image Installation

For large-scale deployments, you can write a disk image directly:

```bash
# Download the raw disk image
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-amd64.raw.xz"

# Decompress
xz -d metal-amd64.raw.xz

# Write directly to the target disk
# This must be done from a live environment or PXE boot
sudo dd if=metal-amd64.raw of=/dev/sda bs=4M status=progress conv=fsync

# Reboot into the new installation
sudo reboot
```

This method overwrites the entire disk, including the partition table. It is the most thorough wipe possible.

## Method 4: PXE Network Boot Reinstall

For data center environments with PXE infrastructure:

```bash
# Configure your PXE server to serve Talos boot assets
# The boot assets are available from Image Factory:

# Kernel
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/kernel-amd64"

# Initramfs
wget "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/initramfs-amd64.xz"
```

Configure your PXE server (like Matchbox or a simple TFTP/HTTP server) to serve these files:

```text
# Example iPXE script
#!ipxe
kernel https://pxe.example.com/talos/kernel-amd64 \
  talos.platform=metal \
  init_on_alloc=1
initrd https://pxe.example.com/talos/initramfs-amd64.xz
boot
```

After PXE booting, the node enters maintenance mode and waits for a configuration:

```bash
# Apply config to the PXE-booted node
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file worker.yaml
```

## Post-Installation Verification

After reinstalling, verify everything is working:

```bash
# Check the node is running the expected version
talosctl version --nodes 10.0.0.50

# Verify the system disk layout
talosctl disks --nodes 10.0.0.50

# Check installed extensions
talosctl get extensions --nodes 10.0.0.50

# Verify Kubernetes node status
kubectl get node -o wide | grep 10.0.0.50

# Check system health
talosctl health --nodes 10.0.0.50
```

## Automating the Reinstall Process

For environments where you regularly reinstall nodes, automate the process:

```bash
#!/bin/bash
# reinstall-node.sh - automated node reinstall
set -euo pipefail

NODE_IP=$1
CONFIG_FILE=$2
TALOS_VERSION="${3:-v1.7.0}"

echo "=== Reinstalling Talos on ${NODE_IP} ==="

# Step 1: Remove from cluster
echo "Removing from cluster..."
NODE_NAME=$(kubectl get nodes -o wide 2>/dev/null | grep "${NODE_IP}" | awk '{print $1}' || true)
if [ -n "${NODE_NAME}" ]; then
  kubectl drain "${NODE_NAME}" --ignore-daemonsets --delete-emptydir-data --timeout=300s || true
  kubectl delete node "${NODE_NAME}" || true
fi

# Step 2: Reset the node
echo "Resetting node..."
talosctl reset --nodes "${NODE_IP}" \
  --graceful=false \
  --reboot=true \
  --system-labels-to-wipe STATE \
  --system-labels-to-wipe EPHEMERAL 2>/dev/null || true

# Step 3: Wait for maintenance mode
echo "Waiting for maintenance mode..."
for i in $(seq 1 30); do
  if talosctl version --nodes "${NODE_IP}" --insecure 2>/dev/null; then
    break
  fi
  sleep 10
done

# Step 4: Apply configuration
echo "Applying configuration..."
talosctl apply-config --insecure \
  --nodes "${NODE_IP}" \
  --file "${CONFIG_FILE}"

# Step 5: Wait for the node to join
echo "Waiting for node to join the cluster..."
for i in $(seq 1 60); do
  if kubectl get nodes | grep -q "${NODE_IP}"; then
    echo "Node has joined the cluster"
    break
  fi
  sleep 10
done

# Step 6: Health check
echo "Running health check..."
talosctl health --nodes "${NODE_IP}" --wait-timeout 10m

echo "=== Reinstall complete ==="
```

## Wiping Disks Securely

For decommissioning nodes that handled sensitive data, use secure wipe methods:

```bash
# Before resetting, securely wipe user data disks
# This must be done while the node is still running Talos

# Option 1: Use dd to zero-fill (slow but thorough)
talosctl -n 10.0.0.50 read /dev/zero | talosctl -n 10.0.0.50 write /dev/sdb

# Option 2: Include user disks in the reset with wipe
talosctl reset --nodes 10.0.0.50 \
  --graceful=false \
  --reboot=true \
  --user-disks-to-wipe /dev/sdb \
  --user-disks-to-wipe /dev/sdc
```

For truly sensitive environments, physical disk destruction may be required per your organization's data handling policies.

## Wrapping Up

Wiping and reinstalling Talos Linux is a clean, well-defined operation whether you are using ISO boot, PXE provisioning, or direct disk imaging. The immutable nature of Talos means that a fresh installation always produces a known, predictable state. Combined with Image Factory for custom images and version-controlled machine configurations, you can reinstall any node in your cluster with confidence that it will come back in exactly the state you expect. This makes hardware rotation, version upgrades, and disaster recovery straightforward operations rather than stressful events.
