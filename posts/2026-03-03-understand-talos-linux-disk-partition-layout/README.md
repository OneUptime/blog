# How to Understand Talos Linux Disk Partition Layout

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Partitioning, Disk Layout, Storage, Linux

Description: A detailed look at the Talos Linux disk partition layout including system partitions, their purposes, and how they are organized.

---

If you are coming from traditional Linux administration, Talos Linux's disk layout might seem unfamiliar at first. There is no `/etc/fstab` to edit, no manual partitioning during installation, and no way to rearrange things after the fact through a shell. Talos manages its partition layout automatically based on the machine configuration. Understanding how this layout works is essential for planning storage, troubleshooting boot issues, and configuring additional volumes.

## The System Disk Layout

When Talos installs onto a disk, it creates a specific set of partitions. On current UEFI-based installations, Talos uses `systemd-boot` and the system disk typically looks like this:

```text
/dev/sda
  |- /dev/sda1  EFI       (~1 GB)   - EFI System Partition and Talos boot assets
  |- /dev/sda2  META      (~1 MB)   - Talos metadata
  |- /dev/sda3  STATE     (~100 MB) - Machine configuration storage
  |- /dev/sda4  EPHEMERAL (rest)    - Runtime data (mounted at /var)
```

Each of these partitions serves a specific purpose, and Talos maintains strict control over all of them.

## EFI System Partition

The EFI System Partition (ESP) is created on UEFI-based systems. It contains the UEFI bootloader that the firmware uses to start Talos. This partition is formatted as FAT32, as required by the UEFI specification.

```bash
# View the EFI partition details
talosctl get discoveredvolumes --nodes 192.168.1.10 -o yaml
```

Size: approximately 1 GB. This is enough for the bootloader and Talos boot assets. You should never need to resize or modify this partition.

## BIOS Boot Partition

On systems that use the GRUB bootloader, Talos may create a small BIOS boot partition. This is used by GRUB to store bootloader code when booting from a GPT-partitioned disk.

Size: 1 MB. This partition is meaningful for legacy BIOS booting and GRUB-based layouts. Current UEFI installations use `systemd-boot` by default, so they do not rely on this partition.

## BOOT Partition

The BOOT partition is used by GRUB-based Talos installations. It contains the GRUB configuration file and Talos boot assets such as `vmlinuz` and `initramfs`. Current UEFI installations use `systemd-boot` and store Talos UKIs in the EFI partition instead.

```bash
# Check the BOOT partition status
talosctl get discoveredvolumes --nodes 192.168.1.10 -o yaml
```

Size: approximately 1 GB when present. This provides room for Talos boot assets on GRUB-based systems.

The BOOT partition uses XFS on Talos GRUB-based layouts.

## META Partition

The META partition stores Talos-specific metadata, including:

- The node's UUID
- Upgrade status
- Boot attempt counters
- Other internal state

```bash
# Inspect META partition
talosctl get volumestatus META --nodes 192.168.1.10 -o yaml
```

Size: 1 MB. Despite its tiny size, this partition is critical for Talos operations. It maintains state that survives reboots and upgrades.

## STATE Partition

The STATE partition is where Talos stores the machine configuration. When you apply a config through `talosctl apply-config`, the configuration is written to this partition. It persists across reboots and upgrades.

```bash
# Check STATE partition details
talosctl get volumestatus STATE --nodes 192.168.1.10 -o yaml
```

Size: approximately 100 MB. The machine configuration itself is small (usually a few kilobytes), but the STATE partition also stores:

- The machine configuration
- Kubernetes PKI material (certificates and keys)
- Other persistent state that must survive reboots

The STATE partition can optionally be encrypted for security. This protects the machine configuration and secrets at rest.

## EPHEMERAL Partition

The EPHEMERAL partition is the largest partition on the system disk. It gets all the remaining space after the other system partitions are allocated. This is where Kubernetes runtime data lives.

```bash
# View EPHEMERAL partition details
talosctl get volumestatus EPHEMERAL --nodes 192.168.1.10 -o yaml
```

Mounted at: `/var`

Contains:
- Container images and layers (containerd storage)
- Pod data (kubelet working directory)
- Container logs
- emptyDir volumes
- etcd data (on control plane nodes)
- CNI state

The EPHEMERAL partition is formatted as XFS by default. It is called "ephemeral" because it can be wiped during node reset without losing the machine configuration (which lives on STATE).

## GPT Partition Table

Talos uses GPT (GUID Partition Table) rather than the older MBR partitioning scheme. GPT supports larger disks (over 2TB), more partitions, and includes redundancy - the partition table is stored at both the beginning and end of the disk.

You can inspect the partition table through Talos:

```bash
# View all disk resources
talosctl get disks --nodes 192.168.1.10 -o yaml

# View discovered partition and filesystem details
talosctl get discoveredvolumes --nodes 192.168.1.10 -o yaml
```

## Partition Ordering and Stability

The order of Talos-managed system partitions is determined by Talos. You cannot rearrange them manually through the host OS. This design ensures consistency across nodes and simplifies upgrade logic.

On a current UEFI installation, the base partition layout is:

```text
Partition 1: EFI
Partition 2: META
Partition 3: STATE
Partition 4: EPHEMERAL
```

GRUB-based and older upgraded systems can also include BIOS and BOOT partitions. The consistency makes automation and troubleshooting more predictable, but the exact boot-related partitions depend on the bootloader and installation history.

## Additional Disks

Beyond the system disk, you can configure additional user volumes for workload storage. These volumes have a simpler layout because they do not need system partitions:

```yaml
apiVersion: v1alpha1
kind: UserVolumeConfig
name: data
provisioning:
  diskSelector:
    match: disk.dev_path == "/dev/sdb"
  minSize: 1GB
  grow: true
```

For a user volume, Talos provisions a matching disk or partition and mounts it at `/var/mnt/<volume-name>`. There is no EFI, BOOT, META, or STATE partition on non-system workload volumes.

## Viewing the Complete Layout

To get a full picture of all partitions across all disks:

```bash
# List all disks
talosctl get disks --nodes 192.168.1.10

# Get detailed partition info for each disk
talosctl get discoveredvolumes --nodes 192.168.1.10 -o yaml
```

You can also combine multiple node queries:

```bash
# Check partition layout across all nodes
talosctl get discoveredvolumes --nodes 192.168.1.10,192.168.1.11,192.168.1.12 -o yaml
```

## Control Plane vs Worker Partition Layout

Both control plane and worker nodes use the same base partition layout. The difference is in what runs on the EPHEMERAL partition:

**Control plane nodes** store etcd data, API server audit logs, and other control plane component data on EPHEMERAL.

**Worker nodes** store container images and workload pod data on EPHEMERAL.

The partition structure itself is identical. The difference is purely in how the space is used.

## What Happens During Upgrades

When you upgrade Talos, the node updates its boot assets before rebooting. On current UEFI installations these assets live in the EFI partition; on GRUB-based installations they live in the BOOT partition. The upgrade process:

1. Downloads the new Talos image
2. Writes the new boot assets
3. Updates META with upgrade status
4. Reboots the node
5. The new kernel boots and continues using the existing STATE and EPHEMERAL partitions

The EPHEMERAL partition is preserved during upgrades. Container images and pod data remain intact. The STATE partition is also preserved, maintaining the machine configuration.

## What Happens During Reset

Resetting a node is more destructive:

```bash
# Reset specific partitions
talosctl reset --nodes 192.168.1.10 --system-labels-to-wipe EPHEMERAL

# Full reset
talosctl reset --nodes 192.168.1.10 --system-labels-to-wipe STATE --system-labels-to-wipe EPHEMERAL
```

Resetting EPHEMERAL wipes container images, pod data, and Kubernetes state. Resetting STATE removes the machine configuration. A full reset returns the node to a clean state, ready for reconfiguration.

## Summary

The Talos Linux disk partition layout is purposeful and consistent. The core system partitions (EFI, META, STATE, EPHEMERAL), plus BIOS and BOOT on GRUB-based layouts, provide everything needed for a secure, upgradable Kubernetes node. Understanding what each partition does helps you plan storage, troubleshoot issues, and make informed decisions about encryption and backup strategies. Additional disks for workload storage use simpler layouts with the user volumes you define.
