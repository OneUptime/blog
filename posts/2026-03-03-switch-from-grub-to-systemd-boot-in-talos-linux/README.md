# How to Switch from GRUB to systemd-boot in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GRUB, Systemd-boot, Boot Loader, Migration

Description: A step-by-step guide to migrating your Talos Linux nodes from GRUB to systemd-boot for improved boot performance and security.

---

If you have been running Talos Linux with GRUB on UEFI hardware, migrating to systemd-boot can bring tangible benefits: faster boot times, simpler configuration, and native UEFI Secure Boot support. Newer versions of Talos Linux default to systemd-boot for UEFI installations, but existing systems installed with older versions still use GRUB and need an explicit migration.

This guide walks through the process of switching from GRUB to systemd-boot on your Talos Linux nodes.

## Before You Start

There are a few important things to understand:

- This migration only applies to UEFI systems. If your hardware uses legacy BIOS, you must continue using GRUB since systemd-boot does not support BIOS boot.
- The migration involves a reinstallation of the boot loader, which carries some risk. Always start with non-critical nodes.
- Your machine configuration, cluster membership, and data are preserved during the migration.
- Plan for brief node downtime during the process.

## Prerequisites

Verify the following before proceeding:

- Your nodes are running on UEFI firmware (not legacy BIOS)
- You have `talosctl` configured to access your cluster
- You have a Talos Linux USB drive ready for recovery if needed
- Your cluster has enough capacity to handle nodes being temporarily offline

```bash
# Verify you can reach all nodes
talosctl health

# Confirm the node is UEFI-booted
talosctl dmesg --nodes <NODE_IP> | grep -i "EFI v"

# If you see EFI version information, the node is UEFI capable
```

## Step 1: Verify Current Boot Loader

Confirm that the node is currently using GRUB:

```bash
# Check for GRUB on the boot partition
talosctl ls /boot/grub/ --nodes <NODE_IP>

# You should see grub.cfg and other GRUB files
# If you see these, the node is running GRUB

# Also confirm there is no systemd-boot
talosctl ls /boot/EFI/systemd/ --nodes <NODE_IP>
# This should return empty or an error
```

## Step 2: Check Your Talos Version

The Talos Linux version determines whether systemd-boot is available. Versions 1.4 and later support systemd-boot on UEFI:

```bash
# Check the running Talos version
talosctl version --nodes <NODE_IP>

# Check the installed image version
talosctl get installedversions --nodes <NODE_IP> -o yaml
```

If you are running an older version, you will need to upgrade Talos first before the boot loader migration can happen.

## Step 3: Prepare the Machine Configuration

The migration happens through a combination of upgrading the Talos image and ensuring the configuration supports the new boot loader:

```yaml
# In your controlplane.yaml or worker.yaml
machine:
  install:
    disk: /dev/sda  # Your installation disk
    image: ghcr.io/siderolabs/installer:v1.9.0
    bootloader: true  # Ensure boot loader is updated
    wipe: false  # Preserve data
```

The key settings are:
- `bootloader: true` tells the installer to write a new boot loader
- `wipe: false` preserves your existing data and configuration

## Step 4: Perform the Migration on a Test Node

Start with a single worker node to validate the migration process:

```bash
# Cordon the worker node to prevent new workloads
kubectl cordon <NODE_NAME>

# Drain existing workloads
kubectl drain <NODE_NAME> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=120s

# Upgrade the node - this triggers the boot loader migration
talosctl upgrade --nodes <WORKER_IP> \
  --image ghcr.io/siderolabs/installer:v1.9.0
```

The upgrade process will:

1. Download the new installer image
2. Write the new kernel and initramfs
3. Install systemd-boot on the EFI System Partition
4. Remove the old GRUB files
5. Reboot the node

```bash
# Wait for the node to come back
talosctl health --nodes <WORKER_IP> --wait-timeout 5m

# Verify the boot loader changed
talosctl ls /boot/EFI/systemd/ --nodes <WORKER_IP>
# You should now see systemd-boot files

talosctl ls /boot/grub/ --nodes <WORKER_IP>
# This should be empty or missing
```

## Step 5: Verify the Migration

After the node reboots, confirm everything is working:

```bash
# Check node health
talosctl services --nodes <WORKER_IP>

# Verify the node is Ready in Kubernetes
kubectl get node <NODE_NAME>

# Check boot-related dmesg messages
talosctl dmesg --nodes <WORKER_IP> | grep -i "efi\|boot\|systemd"

# Uncordon the node
kubectl uncordon <NODE_NAME>
```

Run workloads on the migrated node to make sure everything functions normally. Give it at least a few hours of operation before proceeding to the next node.

## Step 6: Migrate Worker Nodes

Once you are confident the migration works, proceed with the remaining worker nodes. Do them one at a time to maintain cluster capacity:

```bash
# For each worker node
for worker in <WORKER2_IP> <WORKER3_IP>; do
  echo "Migrating node: $worker"

  # Get the node name
  NODE_NAME=$(kubectl get nodes -o wide | grep $worker | awk '{print $1}')

  # Cordon and drain
  kubectl cordon $NODE_NAME
  kubectl drain $NODE_NAME --ignore-daemonsets --delete-emptydir-data --timeout=120s

  # Upgrade
  talosctl upgrade --nodes $worker \
    --image ghcr.io/siderolabs/installer:v1.9.0

  # Wait for recovery
  echo "Waiting for node to come back..."
  sleep 60
  talosctl health --nodes $worker --wait-timeout 5m

  # Uncordon
  kubectl uncordon $NODE_NAME

  echo "Node $worker migrated successfully"
  echo "Waiting 5 minutes before next node..."
  sleep 300
done
```

## Step 7: Migrate Control Plane Nodes

Control plane nodes require extra care because they run etcd:

```bash
# Check etcd health before starting
talosctl etcd status --nodes <CP1_IP>

# Migrate one control plane node at a time
# Start with a non-leader node

# Check which node is the etcd leader
talosctl etcd status --nodes <CP1_IP>
# Note the leader - migrate non-leaders first
```

For each control plane node:

```bash
# Upgrade the control plane node
talosctl upgrade --nodes <CP_IP> \
  --image ghcr.io/siderolabs/installer:v1.9.0

# Wait for the node to rejoin
talosctl health --wait-timeout 10m

# Verify etcd is healthy
talosctl etcd status --nodes <CP_IP>

# Verify Kubernetes API is working
kubectl get nodes
```

Wait for etcd to fully recover and sync before moving to the next control plane node. This is critical for maintaining cluster availability.

## Handling Migration Failures

If a node fails to boot after the migration:

### Recovery Option 1: Wait for Fallback

The A/B boot scheme should automatically fall back to the previous GRUB-based boot. Wait a few minutes and see if the node comes back.

```bash
# Check if the node recovered
talosctl version --nodes <NODE_IP>
```

### Recovery Option 2: USB Recovery

If the fallback does not work, boot from a Talos USB drive:

```bash
# Boot from USB
# The node enters maintenance mode

# Reinstall with explicit boot loader choice
talosctl apply-config --insecure \
  --nodes <NODE_IP> \
  --file controlplane.yaml
```

### Recovery Option 3: Revert to GRUB

If systemd-boot does not work on your hardware, you can revert:

```bash
# This is an uncommon scenario but possible
# Boot from USB and reinstall with a Talos version
# that defaults to GRUB for your configuration
```

## Verifying the Entire Cluster

After migrating all nodes, verify the entire cluster:

```bash
# Check boot loader on every node
for node in <CP1_IP> <CP2_IP> <CP3_IP> <W1_IP> <W2_IP>; do
  echo -n "Node $node: "
  if talosctl ls /boot/EFI/systemd/ --nodes $node 2>/dev/null | grep -q "efi"; then
    echo "systemd-boot"
  elif talosctl ls /boot/grub/ --nodes $node 2>/dev/null | grep -q "grub"; then
    echo "GRUB (migration may not have completed)"
  else
    echo "Unknown"
  fi
done

# Full cluster health check
talosctl health

# Verify all workloads are running
kubectl get pods -A | grep -v Running | grep -v Completed
```

## Performance Comparison After Migration

After migration, you should notice slightly faster boot times. You can measure this:

```bash
# Check boot time from kernel messages
talosctl dmesg --nodes <NODE_IP> | head -5
# Note the first timestamp

talosctl dmesg --nodes <NODE_IP> | grep "Kubernetes API server"
# Note when the API server started
```

Typical improvements are 1-3 seconds, which is more noticeable during node reboots and upgrades.

## Post-Migration Cleanup

After all nodes are migrated:

1. Update your documentation to reflect the new boot loader
2. Update any recovery procedures that referenced GRUB
3. Consider enabling UEFI Secure Boot now that you are on systemd-boot
4. Update your Talos USB recovery drives to the latest version

## Conclusion

Migrating from GRUB to systemd-boot in Talos Linux is a straightforward process that primarily happens during a Talos upgrade. The key is to take it slowly, start with non-critical nodes, and verify each migration before moving on. The benefits - faster boot, simpler architecture, and better Secure Boot support - make the effort worthwhile for production clusters running on UEFI hardware.
