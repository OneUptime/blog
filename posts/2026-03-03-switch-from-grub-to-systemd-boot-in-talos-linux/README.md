# How to Switch from GRUB to systemd-boot in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GRUB, Systemd-boot, Boot Loader, Migration

Description: A step-by-step guide to migrating your Talos Linux nodes from GRUB to systemd-boot for improved boot performance and security.

---

If you have been running Talos Linux with GRUB on UEFI hardware, moving to systemd-boot can bring tangible benefits: faster boot times, simpler configuration, and native UEFI Secure Boot support. Talos Linux 1.10 and later default to systemd-boot for new UEFI installations, but upgrades from older GRUB-based installations retain the existing boot loader. Switching an existing node therefore requires reinstalling or reprovisioning the node with Talos 1.10 or later boot media, not just running a normal Talos upgrade.

This guide walks through the process of switching from GRUB to systemd-boot on your Talos Linux nodes.

## Before You Start

There are a few important things to understand:

- This migration only applies to UEFI systems. If your hardware uses legacy BIOS, you must continue using GRUB since systemd-boot does not support BIOS boot.
- The migration involves reinstalling or reprovisioning the node, which carries some risk. Always start with non-critical nodes.
- Your machine configuration and cluster identity can be reused, but local data should be backed up or drained before reinstalling.
- Plan for brief node downtime during the process.

## Prerequisites

Verify the following before proceeding:

- Your nodes are running on UEFI firmware (not legacy BIOS)
- You have `talosctl` configured to access your cluster
- You have Talos Linux 1.10 or later UEFI boot media ready for reinstall or recovery if needed
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
# Check whether the node booted with a UKI
talosctl get securitystate --nodes <NODE_IP> -o yaml

# bootedWithUKI: false indicates a GRUB-based boot
# bootedWithUKI: true indicates systemd-boot/UKI
```

## Step 2: Check Your Talos Version

The Talos Linux version determines whether systemd-boot is the default for new UEFI installations. Talos 1.10 and later use systemd-boot with UKIs for fresh UEFI installs:

```bash
# Check the running Talos version
talosctl version --nodes <NODE_IP>

# Check the installed image version
talosctl get installedversions --nodes <NODE_IP> -o yaml
```

If you are running an older version, plan to reinstall or reprovision the node with Talos 1.10 or later. A normal upgrade keeps the existing boot loader.

## Step 3: Prepare the Machine Configuration

Prepare the machine configuration you will apply after booting the node from Talos 1.10 or later UEFI media:

```yaml
# In your controlplane.yaml or worker.yaml
machine:
  install:
    disk: /dev/sda  # Your installation disk
    image: ghcr.io/siderolabs/installer:v1.12.1
    wipe: false  # Do not wipe the installation disk before installing
```

The key settings are:
- The Talos 1.10 or later UEFI installer writes the systemd-boot/UKI layout on a fresh UEFI installation
- `wipe: false` prevents a full disk wipe before installation, but you should still treat local data as at risk and back it up first

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

# Boot the node from Talos 1.10 or later UEFI media, then apply the worker config
talosctl apply-config --insecure \
  --nodes <WORKER_IP> \
  --file worker.yaml
```

The reinstall process will:

1. Boot Talos from UEFI media
2. Apply the existing worker machine configuration
3. Install Talos using the 1.10 or later installer image
4. Write systemd-boot and Talos UKIs to the EFI System Partition
5. Reboot the node from disk

```bash
# Wait for the node to come back
talosctl health --nodes <WORKER_IP> --wait-timeout 5m

# Verify the boot loader changed
talosctl get securitystate --nodes <WORKER_IP> -o yaml
# bootedWithUKI should now be true
```

## Step 5: Verify the Migration

After the node reboots, confirm everything is working:

```bash
# Check node health
talosctl service --nodes <WORKER_IP>

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

  # Boot the node from Talos 1.10 or later UEFI media, then apply the worker config
  talosctl apply-config --insecure \
    --nodes $worker \
    --file worker.yaml

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
# Boot the node from Talos 1.10 or later UEFI media, then apply its control plane config
talosctl apply-config --insecure \
  --nodes <CP_IP> \
  --file controlplane.yaml

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

### Recovery Option 1: Check the Boot Target

If the node does not boot from disk, check the firmware boot order and confirm it is booting the new UEFI disk entry instead of the USB media or the old GRUB entry.

```bash
# Check if the node recovered
talosctl version --nodes <NODE_IP>
```

### Recovery Option 2: USB Recovery

If the node still does not boot, boot from a Talos USB drive:

```bash
# Boot from USB
# The node enters maintenance mode

# Reapply the machine configuration from maintenance mode
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
  if talosctl get securitystate --nodes $node -o yaml 2>/dev/null | grep -q "bootedWithUKI: true"; then
    echo "systemd-boot"
  elif talosctl get securitystate --nodes $node -o yaml 2>/dev/null | grep -q "bootedWithUKI: false"; then
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
3. Consider a planned fresh Secure Boot installation if you want Secure Boot; Talos does not support upgrading a non-UKI GRUB installation directly into UKI/Secure Boot mode
4. Update your Talos USB recovery drives to the latest version

## Conclusion

Migrating from GRUB to systemd-boot in Talos Linux is a node-by-node reprovisioning process, not a standard Talos upgrade. The key is to take it slowly, start with non-critical nodes, and verify each migration before moving on. The benefits - faster boot, simpler architecture, and better Secure Boot support - make the effort worthwhile for production clusters running on UEFI hardware.
