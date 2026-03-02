# How to Partition a New Disk with gdisk (GPT) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Disk Management, Storage, GPT, System Administration

Description: Step-by-step guide to partitioning a new disk using gdisk on Ubuntu to create GPT partition tables, including creating, deleting, and managing partitions with proper alignment.

---

GPT (GUID Partition Table) is the modern partition table format that replaced the older MBR (DOS) layout. GPT supports disks larger than 2TB, allows up to 128 partitions without the primary/extended distinction, and stores a backup partition table at the end of the disk. `gdisk` is the command-line tool for creating and managing GPT partitions on Ubuntu.

## Why GPT Over MBR

MBR is limited to 4 primary partitions (or 3 primary + 1 extended with logical partitions inside), and it can't handle disks larger than 2TB. GPT has none of these restrictions. On any new disk, GPT is the right choice unless you specifically need to boot the disk on very old BIOS systems without GPT support.

## Prerequisites

Install gdisk if it's not already present:

```bash
sudo apt install gdisk
```

## Identifying the New Disk

Before partitioning, confirm which device corresponds to the new disk:

```bash
# List all block devices
lsblk

# More detail including model names
sudo fdisk -l 2>/dev/null | grep "^Disk /dev/"
```

For this tutorial, the new disk is `/dev/sdb`. Adjust for your actual device name. Double-check this - partitioning the wrong disk will destroy its data.

```bash
# Verify this is the correct unpartitioned disk
sudo fdisk -l /dev/sdb
```

Output for a fresh unpartitioned disk:

```
Disk /dev/sdb: 200 GiB, 214748364800 bytes, 419430400 sectors
Disk model: QEMU HARDDISK
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
```

No partition table listed - this confirms it's a clean disk.

## Launching gdisk

```bash
sudo gdisk /dev/sdb
```

gdisk prompts:

```
GPT fdisk (gdisk) version 1.0.8

Partition table scan:
  MBR: not present
  BSD: not present
  APM: not present
  GPT: not present

Creating new GPT entries in memory.

Command (? for help):
```

The `Creating new GPT entries in memory` message means gdisk will create a new GPT partition table when you write changes. Nothing is written to disk until you confirm.

## gdisk Key Commands

| Command | Action |
|---------|--------|
| `p` | Print current partition table |
| `n` | New partition |
| `d` | Delete partition |
| `t` | Change partition type |
| `i` | Show partition information |
| `v` | Verify disk |
| `w` | Write changes and exit |
| `q` | Quit without saving |
| `?` | Show all commands |

## Creating Partitions

### Example: Single partition using all available space

The simplest case - one partition covering the entire disk:

```
Command (? for help): n
Partition number (1-128, default 1): [Enter]
First sector (34-419430366, default = 2048) or {+-}size{KMGTP}: [Enter]
Last sector (2048-419430366, default = 419430366) or {+-}size{KMGTP}: [Enter]
Current type is 8300 (Linux filesystem)
Hex code or GUID (L to show codes, Enter = 8300): [Enter]
Changed type of partition to 'Linux filesystem'
```

Accepting defaults for first and last sector uses the entire disk with proper alignment (first sector 2048 provides 1MB of alignment space before the first partition, which is important for SSD performance).

### Example: Multiple partitions with specific sizes

Create three partitions: 1GB boot, 4GB swap, and the rest for data:

```
Command (? for help): n
Partition number (1-128, default 1): [Enter]
First sector (34-419430366, default = 2048): [Enter]
Last sector (2048-419430366, default = 419430366) or {+-}size{KMGTP}: +1G
Current type is 8300 (Linux filesystem)
Hex code or GUID (L to show codes, Enter = 8300): [Enter]

Command (? for help): n
Partition number (1-128, default 2): [Enter]
First sector (34-419430366, default = 2099200): [Enter]
Last sector (2099200-419430366, default = 419430366) or {+-}size{KMGTP}: +4G
Current type is 8300 (Linux filesystem)
Hex code or GUID (L to show codes, Enter = 8300): 8200
Changed type of partition to 'Linux swap'

Command (? for help): n
Partition number (1-128, default 3): [Enter]
First sector (34-419430366, default = 10487808): [Enter]
Last sector (10487808-419430366, default = 419430366): [Enter]
Current type is 8300 (Linux filesystem)
Hex code or GUID (L to show codes, Enter = 8300): [Enter]
```

### Common partition type codes

```
8300  Linux filesystem (general purpose)
8200  Linux swap
ef00  EFI System Partition
8e00  Linux LVM
fd00  Linux RAID
0700  Microsoft basic data
```

Show all type codes within gdisk:

```
Command (? for help): L
```

## Reviewing Before Writing

Always check the partition table before committing:

```
Command (? for help): p
```

Output:

```
Disk /dev/sdb: 419430400 sectors, 200.0 GiB
Sector size (logical/physical): 512/512 bytes
Disk identifier (GUID): ...

Number  Start (sector)    End (sector)  Size       Code  Name
   1            2048         2099199   1024.0 MiB  8300  Linux filesystem
   2         2099200        10487807   4.0 GiB     8200  Linux swap
   3        10487808       419430366   194.0 GiB   8300  Linux filesystem
```

Run verification:

```
Command (? for help): v

No problems found. 0 partitions are in the GUID Partition Table.
```

## Writing the Partition Table

When satisfied with the layout:

```
Command (? for help): w

Final checks complete. About to write GPT data. THIS WILL OVERWRITE EXISTING
PARTITIONS!!

Do you want to proceed? (Y/N): Y
OK; writing new GUID partition table (GPT) to /dev/sdb.
The operation has completed successfully.
```

## Verifying the Result

After writing:

```bash
# Confirm partitions were created
lsblk /dev/sdb

# Show partition table details
sudo fdisk -l /dev/sdb

# Verify partition UUIDs
sudo blkid /dev/sdb1 /dev/sdb2 /dev/sdb3
```

Expected lsblk output:

```
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sdb      8:16   0  200G  0 disk
├─sdb1   8:17   0    1G  0 part
├─sdb2   8:18   0    4G  0 part
└─sdb3   8:19   0  195G  0 part
```

## Using sgdisk for Scripted Partitioning

For automated deployments, `sgdisk` (part of the gdisk package) supports non-interactive partitioning:

```bash
# Create a single partition spanning the whole disk
sudo sgdisk -n 1:0:0 -t 1:8300 /dev/sdb

# Create multiple partitions
sudo sgdisk \
    -n 1:2048:+1G -t 1:8300 -c 1:"boot" \
    -n 2:0:+4G   -t 2:8200 -c 2:"swap" \
    -n 3:0:0      -t 3:8300 -c 3:"data" \
    /dev/sdb

# Wipe existing partition table before creating new one
sudo sgdisk --zap-all /dev/sdb
sudo sgdisk -n 1:0:0 -t 1:8300 /dev/sdb
```

Options:
- `-n partition:start:end` - new partition (0 = default, 0:0 = use remaining space)
- `-t partition:type` - set partition type code
- `-c partition:name` - set partition name label
- `--zap-all` - destroy all partition table data

## Next Steps After Partitioning

After creating partitions, format them:

```bash
# Format as ext4
sudo mkfs.ext4 /dev/sdb1

# Format as swap
sudo mkswap /dev/sdb2
sudo swapon /dev/sdb2

# Format the data partition
sudo mkfs.ext4 /dev/sdb3
```

Mount and add to /etc/fstab for persistence:

```bash
# Get the UUID (preferred over device path in fstab)
sudo blkid -s UUID -o value /dev/sdb3

# Mount temporarily to test
sudo mkdir -p /data
sudo mount /dev/sdb3 /data

# Add to fstab using UUID
echo "UUID=$(sudo blkid -s UUID -o value /dev/sdb3)  /data  ext4  defaults  0  2" | sudo tee -a /etc/fstab
```

Proper partitioning with GPT provides a solid foundation. The key habits are: verify the device before touching it, use the default first sector for alignment, check with `p` before writing, and use UUIDs in fstab rather than device names which can change.
