# How to Understand the BOOT Partition in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, BOOT Partition, Kernel, Boot Process, Disk Management, Kubernetes

Description: A detailed guide to understanding the BOOT partition in Talos Linux, including what it stores, how it supports A/B upgrades, and its role in the boot sequence.

---

The BOOT partition in Talos Linux is where GRUB-based installations store the operating system's kernel and initramfs. It is one of the most important partitions on a GRUB-booted Talos node because it contains the boot assets that run when the system starts up. On current UEFI installations, Talos uses `systemd-boot` with Unified Kernel Images (UKIs) stored in the EFI partition instead of a separate BOOT partition, so understanding the BOOT partition also means understanding which bootloader your node is using.

## What Is the BOOT Partition?

The BOOT partition is a dedicated filesystem partition used by GRUB-based Talos installations. It stores the Linux kernel, the initial RAM filesystem (initramfs), and GRUB configuration used by Talos Linux. When GRUB starts, it reads the kernel and initramfs from the BOOT partition and loads them into memory. The kernel then takes over and starts the Talos operating system.

For new UEFI installations starting with Talos 1.10, `systemd-boot` is the default bootloader. In that layout, the EFI partition contains the `systemd-boot` bootloader and Talos UKIs, which bundle the kernel, initramfs, and kernel command line into a single EFI binary.

## BOOT Partition in the Disk Layout

Here is where the BOOT partition sits in the overall Talos disk layout:

```text
Talos Disk Layout:
  Current UEFI systemd-boot layout:
    EFI partition (~1GB, bootloader and Talos UKIs)
    META partition (~1MB)
    STATE partition (~100MB)
    EPHEMERAL partition (remaining space)

  GRUB-based layout:
    BIOS partition (legacy BIOS bootloader support)
    EFI partition (UEFI GRUB support on upgraded older installs)
    BOOT partition (GRUB config, kernel, and initramfs)
    META partition
    STATE partition
    EPHEMERAL partition
```

On current UEFI installations, there is no separate BOOT partition: the EFI partition is roughly 1GB and contains the bootloader and Talos UKIs. On GRUB-based installations, the BOOT partition is the partition that holds GRUB's Talos boot assets.

## What the BOOT Partition Contains

The BOOT partition stores several key files:

**Linux Kernel** - The compiled Linux kernel binary that Talos uses. Talos builds its own kernel with a specific set of options and modules optimized for running Kubernetes.

**Initramfs** - The initial RAM filesystem, which is a compressed archive that gets loaded into memory during boot. The initramfs contains the Talos init system, which is responsible for:
- Discovering and mounting partitions
- Reading the machine configuration from the STATE partition
- Configuring networking
- Starting system services
- Launching the Kubernetes components

**Bootloader Configuration** - On GRUB-based installations, files that tell GRUB which kernel to load and with what parameters. On `systemd-boot` installations, the kernel, initramfs, and kernel command line are bundled into UKIs stored on the EFI partition.

```bash
# You can check what version of Talos is running

talosctl version --nodes 192.168.1.10

# Example output:
# Client:
#   Tag:         v1.13.0
# Server:
#   Node:        192.168.1.10
#   Tag:         v1.13.0
```

## The A/B Boot Scheme

One of the most important features of Talos boot assets is their support for A/B booting. This is the mechanism that makes Talos upgrades safe and reversible.

Talos uses an A/B image scheme that retains the previous Talos kernel and OS image following each upgrade. On a GRUB-based system this means the BOOT partition contains the boot assets used for the current and previous boot references. Conceptually, you can think of these as slot A and slot B: at any given time, one slot is active and the other is the previous version or the target of an upgrade.

Here is how an upgrade works with the A/B scheme:

```text
Before Upgrade:
  Slot A: v1.12.7 (active, currently running)
  Slot B: v1.12.6 (inactive, previous version)

During Upgrade:
  Slot A: v1.12.7 (still active)
  Slot B: v1.13.0 (new version written here as the next boot target)

After Reboot:
  Slot A: v1.12.7 (fallback)
  Slot B: v1.13.0 (trying this slot)

After Successful Boot:
  Slot A: v1.12.7 (inactive)
  Slot B: v1.13.0 (active, confirmed working)
```

If the new version in Slot B fails to boot, Talos rolls back to the previous kernel and OS image. This happens without any manual intervention and is one of the reasons Talos upgrades are considered safe.

```bash
# Trigger an upgrade - the new version goes into the inactive slot
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.13.0

# The node reboots and tries the new version
# If successful, the new slot becomes active
# If it fails, it automatically rolls back
```

## How the Boot Process Uses the BOOT Partition

The full boot sequence involving the BOOT partition goes like this:

1. System firmware (UEFI or BIOS) initializes hardware
2. Firmware loads the bootloader from the EFI/BIOS partition
3. The bootloader determines which Talos boot entry or boot reference to use
4. GRUB loads the kernel and initramfs from the selected boot assets on the BOOT partition, or `systemd-boot` loads the selected UKI from the EFI partition
5. The kernel starts with the initramfs loaded into memory
6. The Talos init process in the initramfs discovers the disk layout
7. The init process reads the machine configuration from the STATE partition
8. Network, services, and Kubernetes components are started

Steps 3 and 4 are where the boot assets are directly involved. On a GRUB-based installation, the selected kernel and initramfs come from the BOOT partition. On a current UEFI `systemd-boot` installation, the selected UKI comes from the EFI partition.

## BOOT Partition and Kernel Parameters

Talos passes specific kernel parameters during boot. These parameters configure the kernel's behavior and provide information to the Talos init system. You can view the current kernel parameters on a running node:

```bash
# View kernel command line parameters
talosctl get cmdline --nodes 192.168.1.10

# You can also check which bootloader mode the node used
talosctl get securitystate --nodes 192.168.1.10 -o yaml
```

On GRUB-based installations, custom kernel parameters can be set in the machine configuration and applied with an upgrade:

```yaml
machine:
  install:
    extraKernelArgs:
      - console=ttyS0
      - net.ifnames=0
      - talos.platform=metal
```

These parameters are written to the bootloader configuration on the BOOT partition and are applied every time the kernel boots.

On `systemd-boot` installations, `.machine.install.extraKernelArgs` is ignored because kernel arguments are embedded in the UKI. For those systems, customize kernel arguments when generating boot assets with Image Factory or `imager`, then install or upgrade to the generated asset.

## Troubleshooting BOOT Partition Issues

If a node is having trouble booting, the boot partition used by the node's bootloader is one of the first things to investigate. Here are common scenarios:

**Kernel panic during boot** - This can happen if the kernel, initramfs, or UKI is corrupted. A reinstall of Talos will rewrite the boot assets:

```bash
# If the node is accessible via talosctl
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.13.0

# If the node is completely unresponsive, boot from ISO and reinstall
```

**Boot loop after upgrade** - If the node keeps rebooting between the new and old version, it may be hitting the automatic rollback. Check the upgrade logs:

```bash
# After the node stabilizes on the old version, check events
talosctl dmesg --nodes 192.168.1.10

# Check the boot status
talosctl get bootedentries --nodes 192.168.1.10

# Confirm whether this node booted with a UKI
talosctl get securitystate --nodes 192.168.1.10 -o yaml
```

**Running out of space on the boot partition** - This is unlikely under normal circumstances since the Talos boot partitions are large enough for multiple boot assets. However, if you see errors related to boot partition space during upgrades, it could indicate corruption.

## BOOT Partition and Custom Talos Images

If you build custom Talos images with additional system extensions, the resulting boot assets can be larger than the stock versions. The boot partition used by your bootloader, either EFI for `systemd-boot` or BOOT for GRUB, is sized to accommodate Talos boot assets.

```yaml
# Image Factory schematic for a custom image with extensions
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/nvidia-container-toolkit
      - siderolabs/iscsi-tools
```

When you install or upgrade with a custom image, the custom boot assets are written to the boot partition used by the node's bootloader.

## BOOT Partition Encryption

Unlike the STATE and EPHEMERAL partitions, boot assets are not stored in an encrypted system volume. This is because the bootloader needs to read the kernel and initramfs, or the UKI, before any encryption keys are available. The early boot components are what set up encryption for the other partitions.

This means that someone with physical access to the disk could theoretically read the boot assets from the BOOT or EFI partition. However, these files do not normally contain secrets - they are the same binaries distributed publicly in Talos boot and installer images. The actual sensitive data (machine configuration, certificates, etcd data) is stored on STATE and EPHEMERAL, which are the system volumes Talos supports encrypting.

## BOOT Partition and Disk Performance

The boot partition is mainly read during the boot process and written during installs or upgrades. Once the kernel is loaded into memory, the BOOT partition is not part of the normal workload data path. This means its performance characteristics do not affect the running system's performance.

That said, a very slow read from the BOOT partition would make the boot process slower. If you are optimizing boot times (for example, in an edge computing scenario where fast failover is important), using a fast storage device for the system disk will help.

## Relationship Between BOOT and Other Partitions

On GRUB-based installations, the BOOT partition works in concert with the other Talos partitions:

- **EFI/BIOS partition**: Contains firmware-specific bootloader data; on `systemd-boot` installations, EFI also contains the Talos UKIs
- **META partition**: Stores Talos metadata and is used for early-boot metadata such as staged upgrade information
- **STATE partition**: Provides the machine configuration that the kernel uses after loading
- **EPHEMERAL partition**: Provides runtime storage for the Kubernetes workloads that start after boot

Each partition has a specific role, and the BOOT partition's role on GRUB-based systems is to be the bridge between the low-level bootloader and the full Talos operating system.

## Conclusion

On GRUB-based Talos installations, the BOOT partition holds the kernel and initramfs that form the foundation of a running Talos Linux node. On current UEFI installations, the same role is handled by UKIs stored on the EFI partition. Talos' A/B image design makes upgrades safe by allowing automatic rollback if a new version fails. While you rarely need to interact with the boot partition directly, understanding its structure helps you troubleshoot boot issues, plan upgrades, and appreciate the engineering that makes Talos Linux a reliable platform for Kubernetes.
