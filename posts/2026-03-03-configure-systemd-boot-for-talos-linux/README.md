# How to Configure systemd-boot for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Systemd-boot, UEFI, Boot Loader, Kubernetes

Description: A guide to understanding and configuring systemd-boot as the boot loader for Talos Linux on UEFI systems.

---

systemd-boot (formerly gummiboot) is a lightweight UEFI boot manager that Talos Linux uses as its default boot loader on newer installations. It is simpler, faster, and more secure than GRUB for UEFI systems. Understanding how systemd-boot works in the context of Talos Linux helps you troubleshoot boot issues and optimize your node's startup.

This guide explains how systemd-boot is configured in Talos Linux and how you can customize it.

## What Is systemd-boot?

systemd-boot is a boot manager, not a full boot loader. The distinction matters:

- A boot loader can load kernels from various filesystems and supports complex configuration
- A boot manager reads boot entries from the EFI System Partition and presents them to the firmware

systemd-boot is intentionally simple. It reads boot entries from a standard location on the ESP, presents a menu if configured, and tells the UEFI firmware which kernel to load. This simplicity means fewer things can go wrong during boot.

## Why Talos Linux Uses systemd-boot

Talos Linux adopted systemd-boot for several reasons:

- **Speed**: systemd-boot adds almost no overhead to the boot process
- **Security**: Its small codebase has a smaller attack surface than GRUB
- **Simplicity**: Configuration is straightforward with plain text files
- **UEFI integration**: It works naturally with UEFI Secure Boot
- **A/B boot support**: Talos uses dual boot entries for safe upgrades

## How systemd-boot Is Laid Out in Talos

On a Talos Linux system, systemd-boot lives on the EFI System Partition. The layout looks like this:

```text
/boot/EFI/
  ├── BOOT/
  │   └── BOOTX64.EFI     # Fallback boot entry
  ├── systemd/
  │   └── systemd-bootx64.efi  # The boot manager itself
  └── Linux/
      ├── talos-A.efi      # Talos boot entry A
      └── talos-B.efi      # Talos boot entry B (for upgrades)
```

The A/B scheme is central to Talos Linux's upgrade strategy. When you upgrade, the new version is written to the inactive slot. If the upgrade fails, the system can fall back to the previous version.

## Viewing the Current Boot Configuration

You can inspect the boot configuration on a running Talos system:

```bash
# Check which boot entry is currently active
talosctl read /proc/cmdline

# View the boot loader entries
talosctl ls /boot/EFI/Linux/

# Check the EFI variables for boot information
talosctl dmesg | grep -i "efi\|boot"
```

## Understanding Boot Entries

systemd-boot uses Type 1 or Type 2 boot entries. Talos Linux typically uses Unified Kernel Images (Type 2), which bundle the kernel, initramfs, and command line into a single EFI binary:

```bash
# A unified kernel image contains:
# - The Linux kernel
# - The initramfs
# - The kernel command line
# - Optionally, the OS release information

# You can check the boot entry details
talosctl read /boot/EFI/Linux/ 2>/dev/null
```

The unified approach means there are fewer files to manage and fewer things that can get out of sync.

## Configuring systemd-boot Through Talos

You do not configure systemd-boot directly on a Talos system. Instead, you configure Talos, and it manages the boot loader. However, there are several machine configuration options that affect boot behavior:

### Setting Kernel Parameters

Extra kernel parameters are passed through the Talos machine configuration:

```yaml
# In your machine config (controlplane.yaml or worker.yaml)
machine:
  install:
    extraKernelArgs:
      - net.ifnames=0
      - console=ttyS0,115200
      - intel_iommu=on
      - iommu=pt
```

When Talos installs or upgrades, it generates the boot entry with these parameters included.

### Configuring the Boot Timeout

The boot timeout controls how long systemd-boot waits before automatically booting the default entry:

```bash
# Talos manages the timeout through the install configuration
# The default is 0 (no timeout - boot immediately)
```

For debugging, you might want a brief timeout so you can select a different boot entry:

```yaml
machine:
  install:
    bootloader: true  # Ensure the boot loader is installed/updated
```

## The A/B Upgrade Process

When you upgrade Talos Linux, systemd-boot's A/B scheme keeps things safe:

```bash
# Initiate an upgrade
talosctl upgrade --image ghcr.io/siderolabs/installer:v1.10.0
```

Here is what happens:

1. Talos downloads the new installer image
2. The new kernel and initramfs are written to the inactive boot slot (say, slot B)
3. systemd-boot is configured to boot from slot B on the next restart
4. The machine reboots
5. If slot B boots successfully, it becomes the active slot
6. If slot B fails to boot, the machine reverts to slot A

```bash
# Check which slot is currently active after an upgrade
talosctl get installedversions
```

## Secure Boot with systemd-boot

systemd-boot integrates naturally with UEFI Secure Boot. When Secure Boot is enabled, the firmware verifies the boot manager's signature before executing it.

Talos Linux ships with signed boot assets for Secure Boot. To use Secure Boot:

1. Enroll the Talos Linux signing keys in your UEFI firmware
2. Enable Secure Boot in the BIOS
3. Boot normally - systemd-boot and the kernel are signed and will pass verification

```yaml
# Secure Boot is automatically handled when enabled in firmware
# No special Talos configuration is needed
# The installer handles signing during installation
```

If you are using custom system extensions or kernels, they must also be signed for Secure Boot to work.

## Comparing systemd-boot and GRUB in Talos

| Feature | systemd-boot | GRUB |
|---------|-------------|------|
| UEFI support | Yes | Yes |
| Legacy BIOS | No | Yes |
| Secure Boot | Native | Requires shim |
| Configuration | Simple text files | Complex scripting |
| Boot speed | Very fast | Slightly slower |
| Filesystem support | ESP only (FAT32) | Many filesystems |
| Recovery options | A/B fallback | Menu-based |

For UEFI systems, systemd-boot is the better choice in most cases. GRUB is still needed for legacy BIOS systems.

## Troubleshooting systemd-boot Issues

### Machine Does Not Boot After Upgrade

If an upgrade leaves the system unbootable:

1. Wait for the automatic fallback to the previous version
2. If the fallback does not happen, use a Talos USB to boot into maintenance mode
3. Inspect the boot partition to understand what went wrong

```bash
# From a USB boot, check the installed system's ESP
talosctl read /dev/sda1  # Or wherever the ESP is
```

### Boot Entry Not Found

If systemd-boot cannot find a valid boot entry:

```bash
# Boot from USB and reinstall the boot loader
talosctl apply-config --insecure \
  --nodes <NODE_IP> \
  --file controlplane.yaml
```

The apply-config process will reinstall the boot loader and create fresh boot entries.

### Checking Boot Logs

systemd-boot logs its activity through EFI variables:

```bash
# View boot-related messages
talosctl dmesg | grep -i boot

# Check EFI runtime information
talosctl dmesg | grep -i efi
```

## Manual Recovery

In extreme cases where the system will not boot at all, you can use a Talos USB stick to recover:

```bash
# Boot from USB
# The node enters maintenance mode

# Identify the existing installation
talosctl disks --insecure --nodes <NODE_IP>

# Reinstall Talos to the existing disk
# This preserves the STATE partition (and thus configuration)
talosctl apply-config --insecure \
  --nodes <NODE_IP> \
  --file controlplane.yaml
```

The STATE partition contains your machine configuration in encrypted form. A reinstall will set up fresh boot entries while preserving your existing cluster membership.

## Best Practices

1. **Always keep a Talos USB handy**: If the boot loader breaks, a USB boot is your recovery path
2. **Do not modify the ESP manually**: Let Talos manage the boot partition through its configuration and upgrade mechanisms
3. **Test upgrades on non-critical nodes first**: The A/B scheme protects against failed upgrades, but testing first is still smart
4. **Monitor boot times**: Sudden increases in boot time can indicate hardware or firmware issues

## Conclusion

systemd-boot provides Talos Linux with a fast, reliable, and secure boot process for UEFI systems. Its simplicity aligns well with Talos Linux's philosophy of minimal, purpose-built components. While you rarely need to interact with the boot loader directly (Talos manages it for you), understanding how it works helps you diagnose problems faster and make informed decisions about your node configuration.
