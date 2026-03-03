# How to Understand the BIOS Partition in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, BIOS, Boot Process, Partitions, Legacy Boot, Disk Management

Description: A guide to understanding the BIOS boot partition in Talos Linux, how legacy BIOS boot works, and when and why this partition is used instead of EFI.

---

While most modern servers and desktops ship with UEFI firmware, there is still a significant amount of hardware running legacy BIOS. Talos Linux supports both boot modes, and when running on a BIOS-based system, it creates a dedicated BIOS boot partition instead of an EFI System Partition. Understanding this partition helps you work with older hardware, troubleshoot boot issues, and make informed decisions about your cluster's infrastructure.

## What Is the BIOS Boot Partition?

The BIOS boot partition is a small, special-purpose partition used by the GRUB bootloader on systems that use GPT (GUID Partition Table) with legacy BIOS firmware. It exists because of a compatibility challenge: legacy BIOS expects to find bootloader code in the Master Boot Record (MBR), but GPT partition tables use the space that MBR bootloaders traditionally occupied.

The BIOS boot partition solves this by providing a dedicated space where GRUB can store its core bootloader code. The BIOS loads the initial boot code from the MBR, which then jumps to the BIOS boot partition to load the full GRUB bootloader, which in turn loads the Talos kernel.

## BIOS Partition in the Talos Disk Layout

On a system with legacy BIOS, Talos creates this disk layout:

```text
Legacy BIOS Talos Disk Layout:
  /dev/sda1 - BIOS boot partition - ~1MB
  /dev/sda2 - BOOT partition - kernel and initramfs
  /dev/sda3 - META partition - metadata key-value store
  /dev/sda4 - STATE partition - machine configuration
  /dev/sda5 - EPHEMERAL partition - Kubernetes data
```

Notice that the BIOS boot partition replaces the EFI System Partition in the layout. It is much smaller (typically 1MB compared to the ESP's 100MB) because it only needs to hold the GRUB core image, not a full FAT32 filesystem.

## How Legacy BIOS Boot Works with Talos

The boot sequence on a legacy BIOS system is different from UEFI:

1. The BIOS initializes hardware and runs POST
2. The BIOS reads the first sector (MBR) of the boot disk
3. The MBR code (stage 1 of GRUB) is loaded and executed
4. Stage 1 loads the core GRUB image from the BIOS boot partition
5. GRUB reads its configuration and loads the Talos kernel and initramfs from the BOOT partition
6. The kernel starts and Talos takes over

The critical difference from UEFI is that legacy BIOS does not understand GPT partition tables natively. It relies on a protective MBR at the start of the disk and the BIOS boot partition to bridge the gap between the old BIOS boot mechanism and the modern GPT partitioning scheme.

## When Does Talos Create a BIOS Partition?

Talos automatically detects the boot mode during installation. If the system firmware is legacy BIOS, Talos creates a BIOS boot partition. If the firmware is UEFI, it creates an EFI System Partition instead. You do not need to specify this in the machine configuration.

```bash
# Talos detects the boot mode automatically during installation
# No special configuration is needed
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --install-disk /dev/sda
```

However, if you are booting from a Talos ISO or PXE image, the boot mode depends on how the ISO/PXE was started. If the BIOS booted the ISO in legacy mode, the installation will use the BIOS boot partition layout.

## Checking the Boot Mode on a Running Node

If you need to determine whether a running Talos node is using BIOS or UEFI boot, you can check the disk layout:

```bash
# Inspect the disk partitions
talosctl get disks --nodes 192.168.1.10

# Check for the presence of EFI or BIOS boot partition
talosctl get blockdevices --nodes 192.168.1.10

# You can also check the kernel command line for hints
talosctl get kernelparams --nodes 192.168.1.10
```

If the first partition on the system disk is very small (around 1MB) and does not have a FAT32 filesystem, it is a BIOS boot partition. If the first partition is around 100MB with FAT32, it is an EFI System Partition.

## BIOS Boot Partition and GPT

You might wonder why Talos uses GPT on legacy BIOS systems instead of the traditional MBR partitioning. GPT offers several advantages:

- Supports disks larger than 2TB (MBR has a 2TB limit)
- Supports more than 4 primary partitions (MBR is limited to 4)
- Includes partition checksums for corruption detection
- Is the standard for modern systems and storage

The BIOS boot partition is specifically the mechanism that makes GPT work with legacy BIOS. Without it, GRUB would not have a place to store its core image on a GPT-partitioned disk.

## BIOS vs EFI: Choosing the Right Boot Mode

If you have the choice, UEFI is generally preferred over legacy BIOS for several reasons:

| Feature | BIOS Boot | UEFI Boot |
|---------|-----------|-----------|
| Secure Boot | Not supported | Supported |
| Boot speed | Slower | Faster |
| Partition support | GPT with BIOS boot partition | GPT natively |
| Disk size limit | None with GPT | None |
| Modern features | Limited | Full UEFI feature set |
| Hardware support | Older systems | All modern systems |

However, there are valid reasons to use BIOS boot:

- Your hardware only supports legacy BIOS (older servers, some embedded systems)
- You are running Talos in a virtual machine configured for BIOS boot
- You are working with a PXE boot environment that only supports BIOS mode

## Migrating from BIOS to UEFI

If you start with a BIOS-booted Talos node and later want to switch to UEFI (for example, after a firmware update that adds UEFI support), you cannot simply change the boot mode. The disk partition layout is different between the two modes.

To migrate, you would need to:

1. Drain the node's workloads
2. Update the system firmware to UEFI mode
3. Reinstall Talos, which will create the correct partition layout
4. Re-apply the machine configuration
5. Rejoin the node to the cluster

```bash
# Step 1: Drain the node
kubectl drain node-01 --ignore-daemonsets --delete-emptydir-data

# Step 2: Change firmware to UEFI (hardware/BIOS specific)

# Step 3: Boot from Talos ISO in UEFI mode and install
# The installation will detect UEFI and create an ESP

# Step 4: Apply machine configuration
talosctl apply-config --nodes 192.168.1.10 --file worker.yaml --insecure

# Step 5: Verify the node rejoins the cluster
kubectl get nodes --watch
```

This is a disruptive process, so plan it as you would any maintenance operation.

## Troubleshooting BIOS Boot Issues

When a Talos node will not boot on a legacy BIOS system, here are common issues and solutions:

**GRUB not found** - The BIOS loads the MBR but cannot find the GRUB core image. This usually means the BIOS boot partition is missing or corrupted. Reinstalling Talos will fix this.

**Wrong boot disk** - Legacy BIOS uses a boot order based on disk priority. Make sure the correct disk is set as the first boot device in the BIOS settings.

**Disk larger than 2TB with MBR** - If something went wrong during installation and the disk was partitioned with MBR instead of GPT, disks larger than 2TB will not be fully usable. Reinstalling Talos should create a proper GPT layout.

**PXE boot mode mismatch** - If you are PXE booting, make sure the PXE server is configured to serve the correct boot image for legacy BIOS. UEFI PXE and BIOS PXE use different boot files.

```bash
# Common PXE boot file paths
# BIOS:  pxelinux.0 or undionly.kpxe (iPXE)
# UEFI:  ipxe.efi or BOOTX64.EFI
```

**Virtual machine boot mode** - If running Talos in a VM, verify the VM's firmware setting matches what you expect:

```bash
# Proxmox: Check VM config for BIOS type
qm config 100 | grep bios
# Output: bios: seabios (legacy BIOS) or bios: ovmf (UEFI)

# VMware: Check for firmware type in VMX file
grep firmware /path/to/vm.vmx
# Output: firmware = "bios" or firmware = "efi"
```

## BIOS Boot Partition and Upgrades

During a Talos upgrade, the bootloader code in the BIOS boot partition may be updated along with the kernel and initramfs in the BOOT partition. This process is handled automatically by the Talos upgrade mechanism.

```bash
# Standard upgrade works the same regardless of boot mode
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

The upgrade process is aware of the boot mode and updates the appropriate boot components. You do not need to specify whether the node uses BIOS or UEFI boot when running an upgrade.

## Practical Recommendations

For new deployments, use UEFI whenever possible. The additional features (Secure Boot, faster boot times, better compatibility with modern tooling) make it the better choice for production Kubernetes clusters.

For existing BIOS-based deployments, Talos works perfectly fine. The BIOS boot partition is a stable, well-understood mechanism that has been used in Linux systems for many years. There is no functional disadvantage to running Talos on BIOS-based systems beyond the lack of Secure Boot support.

If you are managing a mixed fleet with both BIOS and UEFI systems, Talos handles both transparently. The same machine configuration works on both types of systems, since the boot mode is determined at installation time, not configuration time.

## Conclusion

The BIOS boot partition is a small but important piece of the Talos Linux disk layout on systems running legacy BIOS firmware. It bridges the gap between the old BIOS boot mechanism and the modern GPT partition table that Talos uses. While UEFI is the preferred boot mode for new deployments, understanding the BIOS boot partition helps you work with older hardware and troubleshoot boot issues in mixed environments.
