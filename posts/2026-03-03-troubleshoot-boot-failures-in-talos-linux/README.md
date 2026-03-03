# How to Troubleshoot Boot Failures in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Troubleshooting, Boot Failures, Kubernetes, Debugging

Description: A comprehensive troubleshooting guide for diagnosing and fixing boot failures in Talos Linux across different hardware and configurations.

---

Boot failures are among the most frustrating issues to deal with because the system is not running, so your usual diagnostic tools are not available. With Talos Linux, the situation is a bit different from traditional Linux because there is no SSH access even when things are working. Instead, you rely on the Talos API, console output, and a systematic approach to identifying what went wrong.

This guide covers the most common boot failure scenarios in Talos Linux and how to resolve them.

## Identifying the Failure Stage

The first step in troubleshooting any boot failure is figuring out where in the boot process things went wrong. The stages are:

1. **Firmware** - No display output at all, or firmware error messages
2. **Boot loader** - GRUB/systemd-boot errors or prompts
3. **Kernel** - Kernel panic or hardware initialization errors
4. **Talos init** - Talos starts but services fail
5. **Configuration** - Node boots but cannot join the cluster

Each stage has different symptoms and different diagnostic tools.

## Firmware-Level Failures

### Symptoms
- No display output at all after powering on
- Firmware beep codes
- Stuck at the manufacturer's logo screen

### Diagnosis and Fixes

```bash
# These issues are hardware/firmware related, not Talos-specific
# Check:
# 1. Power supply connections
# 2. RAM seating
# 3. Boot device is recognized in BIOS
# 4. Boot order includes the correct device
```

If the firmware does not recognize the boot device:
- Verify the disk is properly connected
- Try a different SATA port or NVMe slot
- Check that the disk is not failed (try it in another machine)
- Reset BIOS to defaults and reconfigure

## Boot Loader Failures

### GRUB Failures

**Symptom: "error: no such partition"**

This means GRUB cannot find the partition it needs.

```bash
# From the GRUB rescue prompt:
grub rescue> ls
# This shows available partitions

grub rescue> ls (hd0,1)/
# Try each partition to find the boot files

# If you find the boot partition:
grub rescue> set root=(hd0,2)
grub rescue> set prefix=(hd0,2)/grub
grub rescue> insmod normal
grub rescue> normal
```

**Symptom: "error: file not found"**

The GRUB configuration points to a kernel or initramfs that does not exist.

```bash
# From the GRUB prompt:
grub> ls /A/
grub> ls /B/

# Try booting manually from whichever slot has files:
grub> linux /A/vmlinuz talos.platform=metal
grub> initrd /A/initramfs
grub> boot
```

### systemd-boot Failures

**Symptom: No boot entries found**

```bash
# systemd-boot shows "No entries found" or goes to the EFI shell
# The boot entries are missing from the ESP

# Recovery: Boot from USB and reinstall
# This will recreate the boot entries
```

## Kernel Panics

### Symptoms
- Screen shows "Kernel panic - not syncing"
- System freezes during hardware initialization
- Repeated reboot loops

### Common Causes and Fixes

**Incorrect architecture image:**

```bash
# If you booted an ARM64 image on x86 hardware (or vice versa)
# the kernel will panic immediately
# Solution: Download the correct architecture image
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/metal-amd64.iso  # for x86
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/metal-arm64.raw.xz  # for ARM
```

**Hardware incompatibility:**

```bash
# If the kernel panics during hardware detection, you may need
# a custom image with specific drivers or kernel parameters

# Try adding kernel parameters to work around the issue:
# At the boot loader prompt, add:
# acpi=off           (disable ACPI if it causes issues)
# nomodeset          (disable kernel mode setting)
# pci=nomsi          (disable MSI interrupts)
```

**Corrupted initramfs:**

```bash
# If the initramfs is corrupted, the kernel cannot find init
# Solution: Reflash the boot media or reinstall

# If using USB: Re-flash with dd
sudo dd if=metal-amd64.iso of=/dev/sdX bs=4M status=progress conv=fsync
```

## Talos Init Failures

### Symptoms
- Talos logo appears on screen
- Console shows error messages from machined
- Node gets an IP but the Talos API is not responding

### Disk-Related Failures

```bash
# If Talos cannot find or mount its partitions:
# Boot from USB and check the disk

# From a USB boot, check disk status
talosctl disks --insecure --nodes <NODE_IP>

# Check for disk errors in dmesg
talosctl dmesg --insecure --nodes <NODE_IP> | grep -i "error\|fail\|i/o"
```

Common disk issues:
- The install disk specified in the config does not exist (wrong device path)
- The disk is too small for Talos partitions
- The disk has hardware errors

### Network Failures

```bash
# If Talos boots but cannot get an IP address:
# Check the console output for network errors

# From another machine, if the node has an IP:
talosctl get links --insecure --nodes <NODE_IP>
talosctl get addresses --insecure --nodes <NODE_IP>
```

Network issues during init:
- DHCP server not responding
- Wrong network interface name in configuration
- Cable disconnected or switch port down
- VLAN tagging mismatch

### Configuration Failures

```bash
# If the machine config is invalid or corrupted:
# Talos will boot but fail to apply configuration

# Check the machine status
talosctl get machinestatus --insecure --nodes <NODE_IP>

# View machined logs for configuration errors
talosctl logs machined --insecure --nodes <NODE_IP>
```

To fix a bad configuration:

```bash
# Apply a corrected configuration
talosctl apply-config --insecure \
  --nodes <NODE_IP> \
  --file corrected-controlplane.yaml
```

## Kubernetes Component Failures

### etcd Fails to Start

```bash
# Check etcd service status
talosctl service etcd --nodes <NODE_IP>

# View etcd logs
talosctl logs etcd --nodes <NODE_IP>

# Common issues:
# - Disk too slow for etcd (SD cards are problematic)
# - Insufficient memory
# - Clock skew between nodes
# - Previous etcd data corruption
```

To recover from etcd data corruption:

```bash
# WARNING: This destroys etcd data
# Only do this if you are starting fresh

# Reset the node
talosctl reset --nodes <NODE_IP> --graceful=false

# Reapply configuration
talosctl apply-config --insecure \
  --nodes <NODE_IP> \
  --file controlplane.yaml

# Bootstrap again (only on the first CP node)
talosctl bootstrap --nodes <NODE_IP>
```

### Kubelet Fails to Start

```bash
# Check kubelet status
talosctl service kubelet --nodes <NODE_IP>

# View kubelet logs
talosctl logs kubelet --nodes <NODE_IP>

# Common issues:
# - Cannot reach the API server
# - Certificate issues
# - Insufficient resources
```

## Recovery Procedures

### Using a Talos USB for Recovery

Always keep a Talos USB drive available. It is your primary recovery tool:

```bash
# Boot the failed machine from USB
# It enters maintenance mode

# Check the existing disk
talosctl disks --insecure --nodes <NODE_IP>

# Check existing partitions
talosctl ls /dev/ --insecure --nodes <NODE_IP>

# Reinstall while preserving state
talosctl apply-config --insecure \
  --nodes <NODE_IP> \
  --file controlplane.yaml
```

### Resetting a Node

If recovery is not possible, you can reset the node completely:

```bash
# Full reset - removes all data including cluster membership
talosctl reset --nodes <NODE_IP> \
  --system-labels-to-wipe EPHEMERAL \
  --system-labels-to-wipe STATE \
  --graceful=false

# Then reinstall from scratch
talosctl apply-config --insecure \
  --nodes <NODE_IP> \
  --file controlplane.yaml
```

### Recovering from Failed Upgrades

```bash
# If an upgrade failed and the node is stuck:

# Check if the fallback worked
talosctl get installedversions --nodes <NODE_IP>

# If the node is unreachable, boot from USB
# The previous boot slot should still have the working version

# Force a specific version
talosctl upgrade --nodes <NODE_IP> \
  --image ghcr.io/siderolabs/installer:v1.9.0 \
  --force
```

## Diagnostic Commands Reference

Here is a quick reference of commands for diagnosing boot issues:

```bash
# System information
talosctl version --nodes <NODE_IP>
talosctl dmesg --nodes <NODE_IP>
talosctl get machinestatus --nodes <NODE_IP>

# Service status
talosctl services --nodes <NODE_IP>
talosctl service <service-name> --nodes <NODE_IP>
talosctl logs <service-name> --nodes <NODE_IP>

# Hardware and disk information
talosctl disks --nodes <NODE_IP>
talosctl mounts --nodes <NODE_IP>

# Network diagnostics
talosctl get links --nodes <NODE_IP>
talosctl get addresses --nodes <NODE_IP>
talosctl get routes --nodes <NODE_IP>

# Cluster health
talosctl health --nodes <NODE_IP>
```

## Prevention Strategies

The best way to handle boot failures is to prevent them:

1. **Test upgrades on non-production nodes first**
2. **Use the A/B boot scheme** - it is enabled by default, do not disable it
3. **Monitor disk health** - failing disks cause boot failures
4. **Keep configuration backups** - store your machine configs in version control
5. **Maintain a recovery USB** - always have a current Talos USB ready
6. **Document your hardware** - know the disk paths, network interface names, and BIOS settings for each machine

## Conclusion

Boot failures in Talos Linux can be intimidating, but they follow predictable patterns. By systematically identifying the failure stage and using the right diagnostic tools, most issues can be resolved quickly. The key tools in your toolkit are the Talos USB recovery drive, the `talosctl` command for API-based diagnostics, and physical console access for pre-boot issues. With these tools and a methodical approach, you can get failed nodes back online efficiently.
