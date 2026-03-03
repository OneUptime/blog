# How to Check Which Boot Loader Talos Linux Is Using

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Boot Loader, GRUB, systemd-boot, Diagnostics

Description: Learn multiple methods to determine whether your Talos Linux installation is using GRUB or systemd-boot as its boot loader.

---

Talos Linux supports two boot loaders: GRUB and systemd-boot. Knowing which one your system is using matters when you are troubleshooting boot issues, planning upgrades, or considering a migration between boot loaders. Since Talos Linux does not provide interactive shell access, you cannot simply run the commands you might use on a traditional Linux system. Instead, you need to use the Talos API and inspect specific indicators.

This guide shows you several methods to identify your active boot loader.

## Why Does It Matter?

The boot loader your Talos installation uses affects several things:

- **Upgrade behavior**: The A/B upgrade scheme works slightly differently between GRUB and systemd-boot
- **Secure Boot**: systemd-boot has native UEFI Secure Boot support, while GRUB requires a shim
- **Troubleshooting**: Different boot loaders have different failure modes and recovery procedures
- **Migration planning**: If you want to switch from GRUB to systemd-boot, you need to know your starting point

## Method 1: Check the EFI System Partition

The most reliable way to determine your boot loader is to look at what is on the EFI System Partition:

```bash
# List the contents of the EFI directory
talosctl ls /boot/EFI/ --nodes <NODE_IP>

# For systemd-boot, you will see:
# /boot/EFI/systemd/
# /boot/EFI/Linux/
# /boot/EFI/BOOT/

# For GRUB, you will see:
# /boot/EFI/BOOT/ (containing grubx64.efi or similar)
```

If you see a `systemd` directory under `/boot/EFI/`, the system is using systemd-boot. If you see GRUB-related files, the system is using GRUB.

```bash
# Check for systemd-boot specifically
talosctl ls /boot/EFI/systemd/ --nodes <NODE_IP>

# If this returns files like systemd-bootx64.efi, you have systemd-boot

# Check for GRUB specifically
talosctl ls /boot/grub/ --nodes <NODE_IP>

# If this returns files like grub.cfg, you have GRUB
```

## Method 2: Inspect the Boot Partition Structure

The boot partition layout differs between the two boot loaders:

```bash
# List the boot partition contents
talosctl ls /boot/ --nodes <NODE_IP>
```

With GRUB, you will typically see:

```
/boot/
  ├── A/
  │   ├── vmlinuz
  │   └── initramfs.xz
  ├── B/
  │   ├── vmlinuz
  │   └── initramfs.xz
  └── grub/
      └── grub.cfg
```

With systemd-boot, the kernel and initramfs are bundled into Unified Kernel Images (UKI):

```
/boot/EFI/Linux/
  ├── talos-A.efi
  └── talos-B.efi
```

The key difference is that GRUB stores the kernel and initramfs as separate files, while systemd-boot uses unified EFI binaries.

## Method 3: Check Kernel Messages

The kernel log contains messages from the boot loader handoff:

```bash
# Search for boot loader references in dmesg
talosctl dmesg --nodes <NODE_IP> | grep -i "efi\|grub\|systemd-boot\|stub"
```

systemd-boot typically leaves traces like:

```
EFI stub: Loaded initrd from LINUX_EFI_INITRD_MEDIA_GUID device path
```

GRUB-based boots may show different EFI-related messages, or for legacy BIOS boots, you will not see EFI messages at all - which is a strong indicator of GRUB since systemd-boot requires UEFI.

```bash
# Check if the system booted via UEFI
talosctl dmesg --nodes <NODE_IP> | grep -i "EFI v"

# If you see EFI version info, the system is UEFI-booted
# If not, it is legacy BIOS, which means GRUB
```

## Method 4: Check the Installed Image Type

The Talos installer metadata can give you hints about the boot loader:

```bash
# View the installed version information
talosctl get installedversions --nodes <NODE_IP> -o yaml
```

The output includes information about the installed image, which can indicate whether it was installed with GRUB or systemd-boot support.

## Method 5: Examine the Disk Partition Table

The partition table format provides indirect evidence:

```bash
# Check the partition table
talosctl disks --nodes <NODE_IP>
```

- **GPT partition table with an EFI System Partition**: Could be either GRUB or systemd-boot (UEFI mode)
- **MBR partition table**: Almost certainly GRUB (legacy BIOS mode)

```bash
# For more detailed partition information
talosctl read /proc/partitions --nodes <NODE_IP>
```

## Method 6: Check the Kernel Command Line

The kernel command line sometimes contains boot loader-specific parameters:

```bash
# Read the kernel command line
talosctl read /proc/cmdline --nodes <NODE_IP>
```

Some things to look for:

- `BOOT_IMAGE=` prefix is often set by GRUB
- systemd-boot with UKI embeds the command line, which may look cleaner

## Method 7: Check the Machine Configuration

Your machine configuration can tell you what was intended:

```bash
# View the machine config
talosctl get machineconfig --nodes <NODE_IP> -o yaml | grep -A5 "install:"
```

Look at the install section. The Talos version and any specific boot-related configuration can indicate which boot loader was used during installation.

## A Script to Check Everything

Here is a script you can run to quickly determine the boot loader:

```bash
#!/bin/bash
# check-bootloader.sh - Determine Talos boot loader type
NODE=$1

if [ -z "$NODE" ]; then
  echo "Usage: $0 <node-ip>"
  exit 1
fi

echo "Checking boot loader for node: $NODE"
echo "---"

# Check for systemd-boot
echo "Checking for systemd-boot..."
if talosctl ls /boot/EFI/systemd/ --nodes $NODE 2>/dev/null | grep -q "efi"; then
  echo "RESULT: systemd-boot detected"
  echo "Files found in /boot/EFI/systemd/"
  talosctl ls /boot/EFI/systemd/ --nodes $NODE
  exit 0
fi

# Check for GRUB
echo "Checking for GRUB..."
if talosctl ls /boot/grub/ --nodes $NODE 2>/dev/null | grep -q "grub"; then
  echo "RESULT: GRUB detected"
  echo "Files found in /boot/grub/"
  talosctl ls /boot/grub/ --nodes $NODE
  exit 0
fi

# Check for UKI (Unified Kernel Images)
echo "Checking for Unified Kernel Images..."
if talosctl ls /boot/EFI/Linux/ --nodes $NODE 2>/dev/null | grep -q "efi"; then
  echo "RESULT: systemd-boot with UKI detected"
  talosctl ls /boot/EFI/Linux/ --nodes $NODE
  exit 0
fi

# Fallback - check if UEFI
echo "Checking boot mode..."
if talosctl dmesg --nodes $NODE | grep -qi "EFI v"; then
  echo "System is UEFI-booted but boot loader type could not be determined"
else
  echo "System appears to be BIOS-booted (likely GRUB)"
fi
```

Save this as a script and run it:

```bash
chmod +x check-bootloader.sh
./check-bootloader.sh 192.168.1.100
```

## Checking Multiple Nodes at Once

If you manage a cluster with many nodes, check them all at once:

```bash
# Check all nodes in your cluster
for node in $(kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}'); do
  echo "Node: $node"
  if talosctl ls /boot/EFI/systemd/ --nodes $node 2>/dev/null | grep -q "efi"; then
    echo "  Boot loader: systemd-boot"
  elif talosctl ls /boot/grub/ --nodes $node 2>/dev/null | grep -q "grub"; then
    echo "  Boot loader: GRUB"
  else
    echo "  Boot loader: Unknown"
  fi
  echo ""
done
```

## What to Do With This Information

Once you know which boot loader your nodes are using, you can:

### For GRUB Systems
- Plan a migration to systemd-boot if you are on UEFI
- Know to look for GRUB-specific error messages when troubleshooting
- Understand that Secure Boot requires additional shim configuration

### For systemd-boot Systems
- Take advantage of faster boot times
- Use native UEFI Secure Boot features
- Understand the UKI-based boot entry structure

### For Mixed Environments
If you have a mix of GRUB and systemd-boot nodes:

```bash
# Create an inventory of your boot loaders
echo "Node,BootLoader" > boot-inventory.csv
for node in <node1_ip> <node2_ip> <node3_ip>; do
  if talosctl ls /boot/EFI/systemd/ --nodes $node 2>/dev/null | grep -q "efi"; then
    echo "$node,systemd-boot" >> boot-inventory.csv
  else
    echo "$node,grub" >> boot-inventory.csv
  fi
done
cat boot-inventory.csv
```

This inventory helps you plan a consistent migration strategy.

## When the Boot Loader Changes

Talos Linux may change the boot loader during certain operations:

- **Fresh installation**: Uses the default for the current Talos version (newer versions prefer systemd-boot on UEFI)
- **Upgrade**: Generally preserves the existing boot loader
- **Reinstallation**: May switch to the new default

After any of these operations, re-check which boot loader is active to make sure your expectations match reality.

## Conclusion

Knowing which boot loader Talos Linux is using on each of your nodes is foundational knowledge for managing your cluster. The most reliable method is checking the EFI partition contents, but multiple approaches exist depending on your situation. Whether you are troubleshooting a boot failure, planning an upgrade, or standardizing your fleet, identifying the boot loader is always the first step.
