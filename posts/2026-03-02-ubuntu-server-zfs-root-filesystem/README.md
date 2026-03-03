# How to Set Up Ubuntu Server with ZFS Root File System

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ZFS, Filesystem, Storage

Description: Complete guide to installing Ubuntu Server with ZFS as the root filesystem using zsys, covering pool configuration, snapshots, and boot environment management.

---

ZFS is one of the most capable filesystems available on Linux, originally developed by Sun Microsystems and ported to Linux via OpenZFS. On Ubuntu, Canonical has invested significantly in ZFS support, including a tool called `zsys` that integrates ZFS boot environments with the system. Setting up Ubuntu with a ZFS root gives you features unavailable in any other filesystem: copy-on-write, end-to-end checksumming, built-in RAID-Z, compression, and bootable snapshots.

## ZFS on Ubuntu: Installation Options

Ubuntu offers ZFS root support in two ways:

1. **Ubuntu Desktop installer**: Has a checkbox for ZFS root (easiest for desktops)
2. **Manual server setup**: More control over pool configuration

For Ubuntu Server, the typical path is the manual approach since the Subiquity server installer has limited ZFS support. This post covers the manual installation.

## Preparing for Manual ZFS Installation

You need a Live USB to bootstrap the installation. Boot from an Ubuntu Server or Ubuntu Desktop live ISO.

```bash
# From the live environment, install ZFS tools
sudo apt install -y zfsutils-linux debootstrap

# Identify your target disk(s)
lsblk
```

## Partitioning the Target Disk

ZFS on UEFI systems needs a small EFI partition. The rest goes to ZFS:

```bash
# Wipe and repartition the target disk
# Replace /dev/sda with your actual disk
export DISK=/dev/sda

# Clear existing partition table
sudo sgdisk --zap-all $DISK

# Create EFI partition (1GB)
sudo sgdisk -n1:1M:+1G -t1:EF00 $DISK

# Create a separate /boot partition (2GB) - keep as ext4 for GRUB compatibility
sudo sgdisk -n2:0:+2G -t2:8300 $DISK

# Create the ZFS partition (remaining space)
sudo sgdisk -n3:0:0 -t3:BF00 $DISK

# Inform kernel of new partitions
sudo partprobe $DISK

# Verify
lsblk $DISK
```

## Creating the ZFS Pool

```bash
# Create the root pool on the third partition
# ashift=12 is correct for 4K sector drives (most modern drives)
# For NVMe, use ashift=12 or ashift=13 depending on the drive
sudo zpool create \
  -o ashift=12 \
  -o autotrim=on \
  -O acltype=posixacl \
  -O canmount=off \
  -O compression=lz4 \
  -O dnodesize=auto \
  -O normalization=formD \
  -O relatime=on \
  -O xattr=sa \
  -O mountpoint=/ \
  -R /mnt \
  rpool ${DISK}3
```

These options set up the pool for Linux use:
- `acltype=posixacl` - Enable POSIX ACLs
- `compression=lz4` - Transparent compression with minimal CPU overhead
- `xattr=sa` - Store extended attributes in inodes (performance improvement)
- `relatime=on` - Reduce atime update frequency
- `-R /mnt` - Alternate root for installation

## Creating ZFS Datasets

ZFS datasets are the equivalent of subvolumes in Btrfs. A well-structured dataset layout allows selective snapshotting:

```bash
# Create the root dataset container
sudo zfs create -o canmount=off -o mountpoint=none rpool/ROOT

# Create the actual root filesystem
sudo zfs create -o canmount=noauto -o mountpoint=/ rpool/ROOT/ubuntu

# Mount it at the alternate root
sudo zfs mount rpool/ROOT/ubuntu

# Create datasets for subdirectories that should not be included in root snapshots
sudo zfs create                                 rpool/home
sudo zfs create -o mountpoint=/root            rpool/home/root
sudo zfs create -o canmount=off                rpool/var
sudo zfs create -o canmount=off                rpool/var/lib
sudo zfs create                                rpool/var/log
sudo zfs create                                rpool/var/spool
sudo zfs create -o com.sun:auto-snapshot=false rpool/var/cache
sudo zfs create -o com.sun:auto-snapshot=false rpool/var/tmp
sudo zfs create                                rpool/srv
sudo zfs create -o canmount=off               rpool/usr
sudo zfs create                               rpool/usr/local

# Set permissions on var/tmp
chmod 1777 /mnt/var/tmp
```

## Formatting and Mounting the EFI and Boot Partitions

```bash
# Format EFI partition
sudo mkfs.vfat -F32 -n EFI ${DISK}1

# Format boot partition
sudo mkfs.ext4 -L boot ${DISK}2

# Create mount points and mount
sudo mkdir -p /mnt/boot/efi
sudo mount ${DISK}2 /mnt/boot
sudo mount ${DISK}1 /mnt/boot/efi
```

## Installing Ubuntu into the ZFS Pool

Use debootstrap to install a minimal Ubuntu system:

```bash
# Install Ubuntu into the mounted ZFS pool
sudo debootstrap --arch=amd64 noble /mnt

# Copy fstab mounts
sudo cp /etc/fstab /mnt/etc/fstab

# Update fstab to remove the ZFS entries (ZFS mounts itself via /etc/zfs)
# and add the boot and EFI partitions
sudo nano /mnt/etc/fstab
```

```text
# /etc/fstab - ZFS root system
# Note: ZFS datasets are managed by zfs-mount-generator, not fstab
UUID=<efi-uuid>   /boot/efi  vfat  umask=0077  0  1
UUID=<boot-uuid>  /boot      ext4  defaults     0  2
```

## Configuring the Chroot Environment

```bash
# Bind mount virtual filesystems for chroot
sudo mount --bind /dev /mnt/dev
sudo mount --bind /dev/pts /mnt/dev/pts
sudo mount --bind /proc /mnt/proc
sudo mount --bind /sys /mnt/sys
sudo mount --bind /sys/firmware/efi/efivars /mnt/sys/firmware/efi/efivars

# Set the ZFS cache file so zpool.cache is available in initramfs
sudo cp /etc/zfs/zpool.cache /mnt/etc/zfs/

# Chroot
sudo chroot /mnt /bin/bash

# Set hostname
echo "ubuntu-zfs-server" > /etc/hostname

# Configure /etc/hosts
cat > /etc/hosts << 'EOF'
127.0.0.1 localhost
127.0.1.1 ubuntu-zfs-server
::1       localhost ip6-localhost ip6-loopback
EOF
```

## Inside the Chroot: Installing Required Packages

```bash
# Inside chroot
# Configure apt sources
apt update

# Install ZFS tools and kernel
apt install -y linux-image-generic linux-headers-generic zfsutils-linux zfs-initramfs zsys

# Install GRUB for UEFI
apt install -y grub-efi-amd64 grub-efi-amd64-signed shim-signed

# Install essential tools
apt install -y openssh-server vim curl wget net-tools

# Set root password
passwd root

# Create a user
adduser deploy
usermod -aG sudo deploy
```

## Configuring ZFS for Boot

```bash
# Set the bootfs property so the pool knows which dataset to boot
zpool set bootfs=rpool/ROOT/ubuntu rpool

# Install GRUB
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu

# Update GRUB config
update-grub

# Rebuild initramfs with ZFS support
update-initramfs -u -k all

# Enable ZFS services
systemctl enable zfs-import-cache
systemctl enable zfs-mount
systemctl enable zfs-import.target
systemctl enable zfs-zed
```

## Taking Snapshots with ZFS

After the system is running, ZFS snapshots are trivial:

```bash
# Take a snapshot before an upgrade
sudo zfs snapshot -r rpool/ROOT/ubuntu@before-upgrade-$(date +%Y%m%d)

# List snapshots
sudo zfs list -t snapshot

# Check snapshot disk usage
sudo zfs list -t snapshot -o name,used,referenced
```

## Rolling Back

If an upgrade breaks the system:

```bash
# Rollback to the pre-upgrade snapshot (destructive - discards changes since snapshot)
sudo zfs rollback rpool/ROOT/ubuntu@before-upgrade-20240315

# For GRUB-based boot environment rollback:
# Ubuntu's zsys creates GRUB entries for snapshots automatically
# At boot, select the snapshot from the GRUB menu
```

## Using zsys for Automated Snapshot Management

If you installed the `zsys` package, it automates snapshot management:

```bash
# Check zsys status
zsysctl show

# List managed boot environments
zsysctl show

# State is managed automatically on apt operations - zsys hooks into apt
# to snapshot before installs and upgrades
```

## ZFS Maintenance Commands

```bash
# Check pool health
sudo zpool status

# Run a scrub (data integrity check)
sudo zpool scrub rpool

# Check scrub progress
sudo zpool status rpool | grep -A3 scan

# Show compression ratio
sudo zfs get compressratio rpool/ROOT/ubuntu

# Show pool I/O statistics
sudo zpool iostat -v rpool 5

# Import a pool from a drive (for recovery or migration)
sudo zpool import -d /dev/disk/by-id -R /mnt rpool
```

## Performance Tuning

ZFS has tunable parameters via the ARC (Adaptive Replacement Cache):

```bash
# Check current ARC size
cat /proc/spl/kstat/zfs/arcstats | grep "^size"

# Limit ARC to 8GB (useful on shared-use servers)
echo "options zfs zfs_arc_max=$((8 * 1024 * 1024 * 1024))" | sudo tee /etc/modprobe.d/zfs.conf

# Apply without reboot
echo $((8 * 1024 * 1024 * 1024)) | sudo tee /sys/module/zfs/parameters/zfs_arc_max
```

For database workloads, disable record size compression or increase record size:

```bash
# Set larger record size for a specific dataset (e.g., PostgreSQL)
sudo zfs set recordsize=128K rpool/var/lib/postgresql
```

ZFS provides enterprise storage features at no cost. The setup process is more involved than a standard ext4 install, but the operational benefits - reliable snapshots, automatic checksum verification, and flexible storage management - make it the right choice for systems where data integrity and rollback capability matter.
