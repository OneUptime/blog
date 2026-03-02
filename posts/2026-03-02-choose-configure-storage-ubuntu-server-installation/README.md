# How to Choose and Configure Storage During Ubuntu Server Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, Partitioning, LVM, Installation

Description: A guide to making smart storage decisions during Ubuntu Server installation, covering partition schemes, LVM, filesystem choices, and how to plan for workload-specific storage needs.

---

Storage configuration is the most consequential decision you make during Ubuntu Server installation. Partition layout affects your ability to resize volumes later, recover from disk-full situations, separate concerns like logs from application data, and use different storage backends for different workloads. The Ubuntu installer makes decent default choices, but understanding the options lets you make choices appropriate for your specific use case.

## The Installer's Storage Options

The Ubuntu Server installer (subiquity) offers three approaches:

1. **Use an entire disk** - Automatically partitions the disk with recommended layout
2. **Use an entire disk with LVM** - Same, but wraps the data partition in a Logical Volume Manager volume group
3. **Custom storage layout** - Full manual control over partition table, filesystems, and mount points

## Understanding LVM

LVM (Logical Volume Manager) adds a virtualization layer between physical disks and filesystems. It is enabled by default in the guided installation and is almost always the right choice for servers.

LVM concepts:
- **Physical Volume (PV)**: A disk or partition formatted for LVM use
- **Volume Group (VG)**: A pool of storage created from one or more PVs
- **Logical Volume (LV)**: A flexible partition carved from the VG
- **Snapshot**: A point-in-time copy of an LV (very useful for backups)

Benefits of LVM:
- Resize logical volumes without downtime (can extend while mounted)
- Add disks to a volume group and immediately use the new space
- Create LVM snapshots for consistent backups
- Thin provisioning: allocate more space than physically exists

## Default Guided Layout (with LVM)

When you select "Use an entire disk with LVM", the installer creates:

```
Partition table: GPT (on UEFI) or MBR (on BIOS)
/dev/sda1  1 MB    BIOS boot (BIOS systems) or EFI partition (UEFI)
/dev/sda2  1 GB    ext4  -> /boot
/dev/sda3  rest    LVM PV
  └── ubuntu-vg (volume group)
      └── ubuntu-lv (logical volume, 100% of VG by default)
              ext4  -> /
```

The single root LV uses 100% of the VG by default - which means no spare capacity for LVM operations. A better approach is to leave 10-20% of the VG unallocated so you can:
- Extend the LV if the root partition fills up
- Create snapshots for backups
- Add new LVs for new workloads without adding physical disk

## Planning Your Partition Layout

Before touching the installer, know your workload:

### Web Server

Separate `/var/log` and `/var/www` to prevent logs from filling the OS disk:

```
/boot/efi   512 MB  fat32
/boot       1 GB    ext4
/           20 GB   ext4  (LV: lv-root)
/var        10 GB   ext4  (LV: lv-var)
/var/log    10 GB   ext4  (LV: lv-var-log)
/home       5 GB    ext4  (LV: lv-home)
swap        4 GB    swap
# Reserve 10-20 GB unallocated in VG
```

### Database Server

Databases benefit from separate partitions on different physical spindles (or NVMe devices):

```
/boot/efi   512 MB  fat32  (sda)
/boot       1 GB    ext4   (sda)
/           20 GB   ext4   (sda, LV)
/var/lib/postgresql  100+ GB  ext4 or xfs  (sdb, separate disk)
swap        8 GB    swap
```

### Container Host (Docker/K8s)

Docker stores container data in `/var/lib/docker`. Give it its own volume:

```
/boot/efi   512 MB  fat32
/boot       1 GB    ext4
/           30 GB   ext4  (LV)
/var/lib/docker  100+ GB  ext4  (LV on dedicated disk or large LV)
swap        4 GB    swap
```

## Manual Partitioning in the Installer

Choose "Custom storage layout" on the storage screen to get full control.

### Step 1: Initialize the Disk

Click on your disk, select "Reformat". Choose:
- GPT (for UEFI systems or disks over 2 TB)
- MS-DOS/MBR (for BIOS systems on disks under 2 TB)

### Step 2: Create Partitions

Click "Add GPT Partition" and create partitions in order:

**EFI System Partition (UEFI only)**:
- Size: 512 MB
- Format: fat32
- Mount: /boot/efi

**Boot Partition**:
- Size: 1 GB (or 2 GB if you want to hold multiple kernel versions)
- Format: ext4
- Mount: /boot

**LVM Physical Volume**:
- Size: Use remaining space (or specific size if you have multiple disks)
- Format: Leave as "Leave unformatted" and mark as LVM PV

### Step 3: Create Volume Group

After marking the partition as LVM PV, click "Create volume group". Name it (e.g., `ubuntu-vg`) and select the PV.

### Step 4: Create Logical Volumes

Click on the volume group and create logical volumes:

```
# Root filesystem
Name: lv-root
Size: 30 GB
Mount: /
Format: ext4

# Variable data
Name: lv-var
Size: 20 GB
Mount: /var
Format: ext4

# Swap
Name: lv-swap
Size: 8 GB
Format: swap
```

Leave unallocated space in the VG by not using 100% of available space.

## Filesystem Choices

### ext4 (Default, Recommended)

The default for most Ubuntu installs. Mature, well-tested, and supported by every Linux tool you will encounter. Good for general purpose use.

```bash
# Check filesystem info after installation
tune2fs -l /dev/ubuntu-vg/ubuntu-lv | grep -E "Filesystem|Block|Mount|Features"
```

### XFS

Better for workloads with large files and high concurrency (databases, media storage, Hadoop). Scales to 8 ExaByte. Cannot shrink (only grow).

```bash
# Format as XFS
sudo mkfs.xfs /dev/sdb1

# Check filesystem info
xfs_info /data
```

### Btrfs

A copy-on-write filesystem with built-in snapshots, checksums, and RAID functionality. Useful for home labs or workloads that benefit from native snapshots. Less battle-tested than ext4 for database workloads.

```bash
# Format as Btrfs
sudo mkfs.btrfs /dev/sdb1

# Create subvolumes (like separate partitions, but more flexible)
sudo btrfs subvolume create /data/db
sudo btrfs subvolume create /data/backups
```

### Choosing Filesystem by Workload

| Workload | Recommended FS |
|----------|---------------|
| General OS | ext4 |
| Database (PostgreSQL, MySQL) | ext4 or XFS |
| Large file storage | XFS |
| Home/media server | Btrfs or ext4 |
| High-write workloads | XFS |
| Container storage | ext4 or XFS |

## Swap Configuration

Swap is used when RAM fills up. The traditional rule of "swap = 2x RAM" dates from a time when RAM was scarce. Modern guidance:

| RAM | Swap |
|-----|------|
| 1-2 GB | 2x RAM |
| 4-8 GB | Equal to RAM |
| 16+ GB | 4-8 GB (or none for servers that should never swap) |

For servers running databases or applications sensitive to latency, swap can cause unpredictable performance spikes. Consider setting `vm.swappiness=10` to use swap only as a last resort:

```bash
# Set swappiness (lower = less aggressive swapping)
echo "vm.swappiness=10" | sudo tee /etc/sysctl.d/99-swappiness.conf
sudo sysctl --system
```

### Swap File vs Swap Partition

Ubuntu 24.04 often creates a swap file instead of a dedicated partition when using LVM. Swap files on ext4 work fine and are more flexible (easier to resize):

```bash
# Create a swap file
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Disk Selection for Multiple Disks

If your server has multiple disks, the installer will show all of them. For separate roles:

1. Use disk 1 (smallest, faster NVMe) for OS (`/boot`, `/`, `/var`)
2. Use disk 2 (larger, possibly SATA SSD or HDD) for data (`/data`, `/var/lib/docker`, database files)

Add the second disk as an LVM PV and extend an existing volume group, or create a second volume group:

```bash
# After installation: add a second disk to LVM
sudo pvcreate /dev/sdb
sudo vgextend ubuntu-vg /dev/sdb

# Create a new LV using the new space
sudo lvcreate -L 100G -n lv-data ubuntu-vg
sudo mkfs.ext4 /dev/ubuntu-vg/lv-data
sudo mount /dev/ubuntu-vg/lv-data /data
```

## Encryption at Rest

For sensitive data, enable LUKS full-disk encryption during installation. In the installer, after selecting your disk, choose "Use an entire disk with LVM" and check "Encrypt the LVM volume group with LUKS".

You will set a passphrase that must be entered at every boot. For unattended servers, this is typically managed via a TPM or a network-based key server (Clevis + Tang).

```bash
# After installation, verify encryption
sudo cryptsetup status /dev/mapper/dm-0
sudo lsblk -o NAME,TYPE,FSTYPE,MOUNTPOINT
```

## Post-Installation Storage Management

```bash
# Show volume groups and free space
sudo vgdisplay
sudo vgs

# Show logical volumes
sudo lvdisplay
sudo lvs

# Extend a logical volume (if VG has free space)
sudo lvextend -L +20G /dev/ubuntu-vg/lv-root
# Resize the filesystem to use the new space
sudo resize2fs /dev/ubuntu-vg/lv-root     # ext4
# or
sudo xfs_growfs /                          # XFS

# Check disk usage
df -h
```

## Common Mistakes to Avoid

1. **Using 100% of the VG for a single LV** - Leaves no room for snapshots or expansion without downtime
2. **Putting logs and OS on the same partition** - A runaway log fills the disk and takes down the OS
3. **No swap** - A server that runs out of memory with no swap will kill processes randomly
4. **Too-small /boot partition** - Kernel updates accumulate in /boot; 512 MB fills up with 3-4 kernels
5. **Using XFS for the root partition** - XFS cannot shrink, which is a problem if you ever need to reduce the root partition
6. **Skipping encryption for sensitive workloads** - Encryption at rest should be the default for any server handling personal data

Storage decisions during installation are among the hardest to change later. Taking an extra 10 minutes to plan and implement the right layout saves hours of disk management work down the road.
