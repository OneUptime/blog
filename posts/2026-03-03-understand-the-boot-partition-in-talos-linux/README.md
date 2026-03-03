# How to Understand the BOOT Partition in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, BOOT Partition, Kernel, Boot Process, Disk Management, Kubernetes

Description: A detailed guide to understanding the BOOT partition in Talos Linux, including what it stores, how it supports A/B upgrades, and its role in the boot sequence.

---

The BOOT partition in Talos Linux is where the operating system's kernel and initramfs live. It is one of the most important partitions on a Talos node because it contains the actual code that runs when the system starts up. Understanding what the BOOT partition holds and how it works gives you insight into the Talos upgrade mechanism, boot troubleshooting, and the overall system design.

## What Is the BOOT Partition?

The BOOT partition is a dedicated filesystem partition that stores the Linux kernel and the initial RAM filesystem (initramfs) used by Talos Linux. When the bootloader (loaded from either the EFI or BIOS boot partition) starts, it reads the kernel and initramfs from the BOOT partition and loads them into memory. The kernel then takes over and starts the Talos operating system.

## BOOT Partition in the Disk Layout

Here is where the BOOT partition sits in the overall Talos disk layout:

```text
Talos Disk Layout:
  Partition 1 - EFI System Partition (UEFI) or BIOS boot (legacy)
  Partition 2 - BOOT partition (~1GB)
  Partition 3 - META partition (~1MB)
  Partition 4 - STATE partition (~100MB)
  Partition 5 - EPHEMERAL partition (remaining space)
```

The BOOT partition is the second partition on the disk, right after the firmware-specific boot partition. Its size is typically around 1GB, which provides enough room for multiple kernel versions as part of the A/B upgrade scheme.

## What the BOOT Partition Contains

The BOOT partition stores several key files:

**Linux Kernel** - The compiled Linux kernel binary that Talos uses. Talos builds its own kernel with a specific set of options and modules optimized for running Kubernetes.

**Initramfs** - The initial RAM filesystem, which is a compressed archive that gets loaded into memory during boot. The initramfs contains the Talos init system, which is responsible for:
- Discovering and mounting partitions
- Reading the machine configuration from the STATE partition
- Configuring networking
- Starting system services
- Launching the Kubernetes components

**Bootloader Configuration** - Files that tell the bootloader which kernel to load and with what parameters.

```bash
# You can check what version of Talos is running (and thus what kernel)
talosctl version --nodes 192.168.1.10

# Example output:
# Client:
#   Tag:         v1.7.0
# Server:
#   Node:        192.168.1.10
#   Tag:         v1.7.0
```

## The A/B Boot Scheme

One of the most important features of the BOOT partition is its support for A/B booting. This is the mechanism that makes Talos upgrades safe and reversible.

The BOOT partition maintains two sets of kernel and initramfs files - slot A and slot B. At any given time, one slot is active (the currently running version) and the other is inactive (either the previous version or the target of an upgrade).

Here is how an upgrade works with the A/B scheme:

```text
Before Upgrade:
  Slot A: v1.6.0 (active, currently running)
  Slot B: v1.5.0 (inactive, previous version)

During Upgrade:
  Slot A: v1.6.0 (still active)
  Slot B: v1.7.0 (new version written here)

After Reboot:
  Slot A: v1.6.0 (fallback)
  Slot B: v1.7.0 (trying this slot)

After Successful Boot:
  Slot A: v1.6.0 (inactive)
  Slot B: v1.7.0 (active, confirmed working)
```

If the new version in Slot B fails to boot, the bootloader automatically falls back to Slot A. This happens without any manual intervention and is one of the reasons Talos upgrades are considered safe.

```bash
# Trigger an upgrade - the new version goes into the inactive slot
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0

# The node reboots and tries the new version
# If successful, the new slot becomes active
# If it fails, it automatically rolls back
```

## How the Boot Process Uses the BOOT Partition

The full boot sequence involving the BOOT partition goes like this:

1. System firmware (UEFI or BIOS) initializes hardware
2. Firmware loads the bootloader from the EFI/BIOS partition
3. The bootloader reads the META partition to determine which boot slot to use
4. The bootloader loads the kernel and initramfs from the active slot on the BOOT partition
5. The kernel starts with the initramfs loaded into memory
6. The Talos init process in the initramfs discovers the disk layout
7. The init process reads the machine configuration from the STATE partition
8. Network, services, and Kubernetes components are started

Steps 3 and 4 are where the BOOT partition is directly involved. The bootloader needs to know which slot to try, and it gets this information from the META partition. It then loads the corresponding kernel and initramfs from the BOOT partition.

## BOOT Partition and Kernel Parameters

Talos passes specific kernel parameters during boot. These parameters configure the kernel's behavior and provide information to the Talos init system. You can view the current kernel parameters on a running node:

```bash
# View kernel command line parameters
talosctl get kernelparams --nodes 192.168.1.10

# You can also add custom kernel parameters in the machine config
```

Custom kernel parameters can be set in the machine configuration:

```yaml
machine:
  install:
    extraKernelArgs:
      - console=ttyS0
      - net.ifnames=0
      - talos.platform=metal
```

These parameters are written to the bootloader configuration on the BOOT partition and are applied every time the kernel boots.

## Troubleshooting BOOT Partition Issues

If a node is having trouble booting, the BOOT partition is one of the first things to investigate. Here are common scenarios:

**Kernel panic during boot** - This can happen if the kernel or initramfs is corrupted. A reinstall of Talos will rewrite the BOOT partition:

```bash
# If the node is accessible via talosctl
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0

# If the node is completely unresponsive, boot from ISO and reinstall
```

**Boot loop after upgrade** - If the node keeps rebooting between the new and old version, it may be hitting the automatic rollback. Check the upgrade logs:

```bash
# After the node stabilizes on the old version, check events
talosctl dmesg --nodes 192.168.1.10

# Check the boot status
talosctl get bootassetstatus --nodes 192.168.1.10
```

**Running out of space on BOOT** - This is unlikely under normal circumstances since the BOOT partition is large enough for multiple kernel versions. However, if you see errors related to BOOT partition space during upgrades, it could indicate corruption.

## BOOT Partition and Custom Talos Images

If you build custom Talos images with additional system extensions, the kernel and initramfs in those images will be larger than the stock versions. The BOOT partition is sized to accommodate these larger images.

```bash
# Building a custom Talos image with extensions
# The resulting installer image contains the custom kernel and initramfs
docker run --rm -t -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  installer \
  --system-extension-image ghcr.io/siderolabs/nvidia-container-toolkit:535.54.03-v1.13.5 \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4
```

When you install or upgrade with a custom image, the custom kernel and initramfs are written to the BOOT partition just like the standard versions.

## BOOT Partition Encryption

Unlike the STATE and EPHEMERAL partitions, the BOOT partition is not encrypted. This is because the bootloader needs to read the kernel and initramfs before any encryption keys are available. The kernel and initramfs are the components that set up encryption for the other partitions.

This means that someone with physical access to the disk could theoretically read the kernel and initramfs from the BOOT partition. However, these files do not contain secrets - they are the same binaries distributed publicly in the Talos installer images. The actual sensitive data (machine configuration, certificates, etcd data) is stored on the encrypted STATE and EPHEMERAL partitions.

## BOOT Partition and Disk Performance

The BOOT partition is only read during the boot process and during upgrades. Once the kernel is loaded into memory, the BOOT partition is not accessed again during normal operation. This means its performance characteristics do not affect the running system's performance.

That said, a very slow read from the BOOT partition would make the boot process slower. If you are optimizing boot times (for example, in an edge computing scenario where fast failover is important), using a fast storage device for the system disk will help.

## Relationship Between BOOT and Other Partitions

The BOOT partition works in concert with the other Talos partitions:

- **EFI/BIOS partition**: Contains the bootloader that loads content from the BOOT partition
- **META partition**: Tells the bootloader which boot slot on the BOOT partition to use
- **STATE partition**: Provides the machine configuration that the kernel uses after loading
- **EPHEMERAL partition**: Provides runtime storage for the Kubernetes workloads that start after boot

Each partition has a specific role, and the BOOT partition's role is to be the bridge between the low-level bootloader and the full Talos operating system.

## Conclusion

The BOOT partition holds the kernel and initramfs that form the foundation of a running Talos Linux node. Its A/B boot slot design makes upgrades safe by allowing automatic rollback if a new version fails. While you rarely need to interact with the BOOT partition directly, understanding its structure helps you troubleshoot boot issues, plan upgrades, and appreciate the engineering that makes Talos Linux a reliable platform for Kubernetes.
