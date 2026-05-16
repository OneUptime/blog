# How to Understand the EFI Partition in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, EFI, UEFI, Boot Process, Partition, Disk Management

Description: Learn what the EFI partition does in Talos Linux, how UEFI boot works, and how this partition fits into the overall Talos disk layout and boot sequence.

---

When you install Talos Linux on a system that uses UEFI firmware, one of the first partitions created on the disk is the EFI System Partition (ESP). This partition is a fundamental part of the boot process on modern hardware, and understanding its role helps you troubleshoot boot issues, plan disk layouts, and work with different hardware configurations.

## What Is the EFI Partition?

The EFI System Partition, often called the ESP, is a standardized partition that UEFI firmware uses to find and load the bootloader. It uses a FAT filesystem, usually FAT32 on disks. Most operating systems that support UEFI boot create or use an EFI partition.

In current Talos Linux installations, the EFI partition contains the `systemd-boot` bootloader and Talos Unified Kernel Images (UKIs). A UKI is an EFI binary that contains the kernel, initramfs, and kernel command line. Older GRUB-based or upgraded installations may also have a separate BOOT partition that stores GRUB configuration and Talos boot assets.

## EFI Partition in the Talos Disk Layout

Here is how the EFI partition fits into the overall Talos disk layout on a UEFI system:

```text
UEFI Talos Disk Layout:
  /dev/sda1 - EFI System Partition (ESP) - ~1GB, FAT32/vfat
  /dev/sda2 - META partition - metadata key-value store
  /dev/sda3 - STATE partition - machine configuration
  /dev/sda4 - EPHEMERAL partition - Kubernetes data
```

Talos places the EFI partition at the start of its default disk layout, but that placement is a Talos layout choice, not a UEFI specification requirement. It is formatted as a FAT filesystem and is typically around 1GB in size in current Talos releases, which leaves room for the bootloader and Talos UKIs.

## How UEFI Boot Works with Talos

The boot process on a UEFI system follows a specific sequence:

1. The system firmware (UEFI) initializes hardware and runs POST (Power-On Self-Test)
2. UEFI looks at the boot configuration stored in NVRAM for boot entries
3. UEFI locates the EFI System Partition on the configured boot disk
4. UEFI loads the configured EFI bootloader from the ESP; the fallback path for x86_64 systems is typically `EFI/BOOT/BOOTX64.EFI`
5. On current UEFI installations, `systemd-boot` loads the selected Talos UKI from the EFI partition
6. The kernel starts and Talos takes over from there

Talos uses an A/B image scheme for upgrades, which means it retains the previous Talos kernel and OS image after an upgrade. This is what enables the automatic rollback capability during upgrades. If the new version fails to boot, Talos can roll back to the previous working version.

## Checking the EFI Partition Status

You can inspect the disk layout on a running Talos node to verify the EFI partition exists and is properly configured:

```bash
# List all disks

talosctl get disks --nodes 192.168.1.10

# Check mount points to see what filesystems are mounted
talosctl mounts --nodes 192.168.1.10

# Get discovered disks, partitions, labels, and filesystems
talosctl get discoveredvolumes --nodes 192.168.1.10
```

The EFI partition should appear as the first partition on the system disk. If you are running on a UEFI system and the EFI partition is missing or corrupted, the node will not be able to boot.

## EFI vs BIOS Boot in Talos

Talos Linux supports both UEFI and legacy BIOS boot. The choice between them depends on your hardware:

| Feature | EFI/UEFI Boot | Legacy BIOS Boot |
|---------|---------------|-----------------|
| Partition type | EFI System Partition (FAT32) | BIOS boot partition |
| Partition table | GPT | GPT (with BIOS boot) or MBR |
| Boot method | UEFI firmware loads bootloader from ESP | BIOS loads from MBR/boot sector |
| Secure Boot | Supported | Not available |
| Modern hardware | Standard on all recent systems | Legacy option |

When generating Talos machine configurations, you do not need to explicitly specify whether to use EFI or BIOS boot. Current Talos installations use `systemd-boot` on UEFI systems and GRUB on legacy BIOS systems, while upgraded nodes can retain their existing bootloader.

```bash
# During installation, Talos auto-detects the boot mode
# No special flags needed for UEFI systems
talosctl gen config my-cluster https://192.168.1.100:6443
```

## EFI Partition and Secure Boot

One significant advantage of UEFI boot is support for Secure Boot. Talos Linux supports Secure Boot on UEFI systems, which means the firmware verifies signed boot components before executing them. This adds a layer of security by preventing unauthorized code from running during the boot process.

When Secure Boot is enabled, the EFI partition must contain signed boot components. Sidero Labs provides SecureBoot images signed with the Sidero Labs SecureBoot key via Image Factory:

```bash
# Check if Secure Boot is enabled on a node
talosctl get securitystate --nodes 192.168.1.10

# The output will indicate whether Secure Boot is active
```

If you are deploying Talos on hardware with Secure Boot enabled, make sure you are using SecureBoot boot assets and an installer image with the proper signatures. Custom-built Talos images may need additional key generation, signing, and enrollment steps to work with Secure Boot.

## EFI Partition During Upgrades

When you upgrade Talos Linux, the upgrade process writes the new Talos boot assets and updates the boot reference. On current UEFI installations, those boot assets are UKIs on the EFI partition. On older GRUB-based installations, the upgrade may also update assets on the BOOT partition.

```bash
# Standard upgrade command
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.13.2
```

The upgrade process is designed to be safe. Talos writes the new boot files before updating the boot configuration, so if power is lost during the upgrade, the system should still be able to boot the previous version.

The A/B boot scheme mentioned earlier means Talos retains the previous kernel and OS image so it can roll back if the new version fails to boot. During an upgrade:

1. The new kernel and OS image are written while the previous version is retained
2. The boot reference is updated so the bootloader tries the new version on the next boot
3. The node reboots
4. If the new version boots successfully, the node continues running the upgraded version
5. If the new version fails to boot, Talos rolls back to the previous version

## Troubleshooting EFI Boot Issues

If a Talos node is not booting on a UEFI system, here are some things to investigate:

**Check UEFI boot order** - Access the system's UEFI setup (usually by pressing F2, Del, or F12 during POST) and verify that the correct disk is listed in the boot order. After a Talos installation, a new boot entry should appear.

**Verify the EFI partition exists** - If you are reinstalling or have changed disks, make sure the installation process completed successfully and created the EFI partition.

**Check for Secure Boot conflicts** - If Secure Boot is enabled and you are using a custom or unsigned Talos image, the firmware will refuse to load the bootloader. Either disable Secure Boot or use a signed image.

**NVRAM boot entries** - UEFI firmware stores boot entries in NVRAM. If these entries become corrupted or lost (which can happen after firmware updates), the system may not know where to find the bootloader. Many UEFI implementations can fall back to the default path (`EFI/BOOT/BOOTX64.EFI` on x86_64) on the ESP.

```bash
# If you can boot into a recovery environment, you can check EFI variables
# This is typically done from a live Linux USB, not from Talos itself
efibootmgr -v
```

**Virtual machine considerations** - When running Talos in virtual machines, make sure the VM is configured for UEFI boot if your configuration expects it. In tools like Proxmox, VMware, or libvirt, the BIOS type is a VM setting:

```bash
# Example: Creating a UEFI VM in Proxmox
qm create 100 --name talos-node --bios ovmf --efidisk0 local-lvm:1
```

## EFI Partition Size

The EFI partition created by current Talos releases is typically around 1GB. This is sufficient for the bootloader and Talos UKIs. Unlike the EPHEMERAL partition, which can fill up with container data, the EFI partition's contents are small and change mainly during installs or upgrades.

You should not need to resize the EFI partition under normal circumstances. If for some reason the partition is full (which would be unusual), a reinstallation of Talos would recreate it with the correct size.

## Working with Multiple Disks and EFI

If your system has multiple disks, the EFI partition is only created on the disk where Talos is installed. The other disks do not need EFI partitions. Make sure you specify the correct installation disk in your machine configuration:

```yaml
machine:
  install:
    disk: /dev/sda  # The EFI partition will be created on this disk
```

If you accidentally install Talos on the wrong disk, you will need to either reinstall on the correct disk or update your UEFI boot order to point to the right disk.

## Conclusion

The EFI partition is a small but critical component of the Talos Linux boot process on UEFI systems. It holds the bootloader that bridges the gap between the system firmware and the Talos operating system. Understanding its role in the boot sequence, its relationship to Secure Boot, and how it participates in the upgrade process will help you manage Talos nodes effectively and troubleshoot boot problems when they arise. For most day-to-day operations, the EFI partition works quietly in the background, but knowing it is there and what it does is valuable knowledge for any Talos administrator.
