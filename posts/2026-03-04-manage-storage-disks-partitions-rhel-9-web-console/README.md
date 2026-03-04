# How to Manage Storage Disks and Partitions Using the RHEL Web Console

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Cockpit, Storage, Partitions, Linux

Description: Learn how to manage disks, create partitions, format filesystems, and configure mount points using the Cockpit web console on RHEL.

---

Storage management on Linux has always been a command-line affair. Tools like fdisk, parted, and mkfs work fine, but they require you to keep track of device names, partition numbers, and filesystem types in your head. Cockpit's storage page puts all of that in one visual layout where you can see every disk, partition, and mount point at a glance.

## Accessing the Storage Page

Log into Cockpit and click "Storage" in the left sidebar. The page shows:

- An overview of all physical and virtual disks
- Partition tables and individual partitions
- Filesystems with mount points and usage
- LVM volume groups and logical volumes
- NFS mounts
- RAID arrays

```mermaid
graph TD
    A[Storage Page] --> B[Drives]
    A --> C[Filesystems]
    A --> D[NFS Mounts]
    A --> E[RAID Devices]
    A --> F[VDO Devices]
    B --> G[/dev/sda]
    B --> H[/dev/sdb]
    G --> I[Partition 1]
    G --> J[Partition 2]
```

## Viewing Disk Information

Click on any drive to see its details: model, serial number, size, firmware version, and the current partition layout. This is the equivalent of:

```bash
# List all block devices with details
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT

# Get disk model and serial
sudo hdparm -I /dev/sda | grep -E "Model|Serial"

# Show partition table
sudo fdisk -l /dev/sda
```

Cockpit shows all of this on a single page with a visual partition map.

## Creating a New Partition Table

If you've added a new disk to the system, it may not have a partition table yet. In Cockpit, click on the drive, then click "Create partition table."

You'll be asked to choose between:

- **GPT** - the modern standard, supports disks larger than 2TB, up to 128 partitions
- **MBR (DOS)** - legacy format, limited to 2TB and 4 primary partitions

For RHEL systems, GPT is almost always the right choice.

The CLI equivalent:

```bash
# Create a GPT partition table on a new disk
sudo parted /dev/sdb mklabel gpt
```

## Creating a Partition

After the partition table exists, click "Create partition" to add a new one. Cockpit will ask for:

- **Size** - how large the partition should be
- **Type** - a regular partition or a special type
- **Filesystem** - ext4, xfs, or other options
- **Mount point** - where to mount it
- **Mount options** - at boot, read-only, etc.

Click "Create partition" and Cockpit handles the partitioning, formatting, and mounting in one step.

The equivalent command sequence:

```bash
# Create a partition using parted
sudo parted /dev/sdb mkpart primary xfs 0% 100%

# Format it with XFS (default RHEL filesystem)
sudo mkfs.xfs /dev/sdb1

# Create the mount point
sudo mkdir -p /data

# Mount it
sudo mount /dev/sdb1 /data

# Add to fstab for persistence
echo '/dev/sdb1 /data xfs defaults 0 0' | sudo tee -a /etc/fstab
```

Cockpit does all of that behind the scenes when you fill out the form.

## Formatting an Existing Partition

If you need to reformat a partition (destroying all data on it), click on the partition in Cockpit and select "Format." You'll choose the filesystem type and mount point.

Supported filesystems in Cockpit:

- **XFS** - the default for RHEL, great for large files and high-throughput workloads
- **ext4** - a solid general-purpose filesystem, supports shrinking unlike XFS
- **swap** - for swap partitions

From the command line:

```bash
# Unmount first
sudo umount /dev/sdb1

# Format with ext4
sudo mkfs.ext4 /dev/sdb1

# Or format with XFS (use -f to force if already formatted)
sudo mkfs.xfs -f /dev/sdb1
```

## Managing Mount Points

Cockpit shows all mounted filesystems with their current usage. You can change mount options, unmount filesystems, or change mount points without editing fstab manually.

The Filesystems section shows:

- Device name
- Mount point
- Filesystem type
- Total size and used space

To check this from the CLI:

```bash
# Show all mounts with usage
df -hT

# Show fstab entries
cat /etc/fstab
```

When you change a mount point in Cockpit, it updates `/etc/fstab` automatically so the change persists across reboots.

## Resizing Partitions

Cockpit supports resizing partitions and their filesystems. Click on a partition and look for the "Resize" option. XFS filesystems can only be grown (not shrunk), while ext4 can be both grown and shrunk.

The process behind the scenes:

```bash
# Grow an XFS filesystem (after expanding the partition or LV)
sudo xfs_growfs /data

# Grow an ext4 filesystem
sudo resize2fs /dev/sdb1

# Shrink an ext4 filesystem (must unmount first)
sudo umount /dev/sdb1
sudo e2fsck -f /dev/sdb1
sudo resize2fs /dev/sdb1 50G
```

## Deleting Partitions

To remove a partition, click on it and select "Delete." Cockpit will unmount it first if necessary and remove the fstab entry. Make sure you've backed up any data before doing this.

The CLI equivalent:

```bash
# Unmount the partition
sudo umount /dev/sdb1

# Remove the fstab entry (manually edit the file)
sudo vi /etc/fstab

# Delete the partition
sudo parted /dev/sdb rm 1
```

## Working with Multiple Disks

When you have multiple disks, Cockpit's storage page gives you a clear picture of which partitions live on which physical drives. This is useful when planning storage layouts or troubleshooting I/O issues.

```mermaid
graph LR
    A[/dev/sda - 500GB] --> B[sda1 - /boot - 1GB]
    A --> C[sda2 - / - 499GB]
    D[/dev/sdb - 1TB] --> E[sdb1 - /data - 1TB]
    F[/dev/sdc - 2TB] --> G[sdc1 - /backup - 2TB]
```

## Checking Disk Health

Cockpit shows SMART data for disks that support it. Click on a drive and look for the health information. This tells you if the disk is reporting any issues.

From the command line:

```bash
# Install smartmontools if not present
sudo dnf install smartmontools -y

# Check disk health
sudo smartctl -a /dev/sda

# Quick health check
sudo smartctl -H /dev/sda
```

## Encrypting a Partition with LUKS

Cockpit supports creating encrypted partitions using LUKS. When creating a new partition or formatting an existing one, there's an option to encrypt the filesystem with a passphrase.

The manual process:

```bash
# Encrypt the partition
sudo cryptsetup luksFormat /dev/sdb1

# Open the encrypted partition
sudo cryptsetup luksOpen /dev/sdb1 encrypted_data

# Format the mapped device
sudo mkfs.xfs /dev/mapper/encrypted_data

# Mount it
sudo mount /dev/mapper/encrypted_data /secure-data
```

Cockpit handles all of this through its UI, including prompting for the passphrase on boot.

## Common Storage Tasks Quick Reference

| Task | Cockpit Action | CLI Command |
|------|---------------|-------------|
| List disks | Storage page | `lsblk` |
| Create partition | Click drive, Create Partition | `parted`, `mkfs` |
| Format partition | Click partition, Format | `mkfs.xfs /dev/sdX` |
| Mount filesystem | Click partition, set mount point | `mount`, edit `/etc/fstab` |
| Check usage | Filesystems section | `df -hT` |
| Resize | Click partition, Resize | `xfs_growfs` or `resize2fs` |

## Wrapping Up

Cockpit's storage management takes the pain out of disk operations. Creating partitions, formatting filesystems, setting mount points, and managing fstab entries all happen through a straightforward web interface. For routine storage tasks, it's faster and less error-prone than typing out partition commands. For complex setups involving LVM, RAID, or advanced configurations, Cockpit handles those too, which we'll cover in dedicated posts.
