# How to Set Up LVM During Ubuntu Server Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LVM, Storage, Installation, Partitioning

Description: Learn how to configure LVM during Ubuntu Server installation and manage logical volumes post-install, including creating, resizing, and extending volumes as needs change.

---

LVM (Logical Volume Manager) is a storage abstraction layer that sits between physical disks and the filesystems. It transforms how you think about storage: instead of fixed partitions carved directly into a disk, you work with flexible logical volumes that can be resized, moved between disks, and snapshotted. Ubuntu Server's installer enables LVM by default in the guided installation, and understanding it deeply pays dividends when you need to expand a filesystem, add a disk to an existing pool, or recover from a disk-full situation.

## LVM Architecture

Three layers:

1. **Physical Volumes (PV)**: Raw block devices (disks or partitions) formatted with LVM metadata
2. **Volume Groups (VG)**: A storage pool made from one or more PVs. This is where extents (usually 4 MB chunks) are allocated from
3. **Logical Volumes (LV)**: Named, resizable chunks of the VG. Each LV gets a filesystem and a mount point

```text
Physical Storage
├── /dev/sda3 (PV) ─┐
├── /dev/sdb   (PV) ─┤── ubuntu-vg (VG)
└── /dev/sdc   (PV) ─┘
                         ├── lv-root  (LV) -> ext4 -> /
                         ├── lv-var   (LV) -> ext4 -> /var
                         ├── lv-home  (LV) -> ext4 -> /home
                         └── lv-swap  (LV) -> swap
```

## Enabling LVM During Installation

In the Ubuntu Server installer, on the storage screen:

1. Select "Use an entire disk"
2. Check "Set up this disk as an LVM group"
3. Optionally check "Encrypt the LVM volume group with LUKS"

The installer creates:
- An EFI partition (UEFI) or BIOS boot partition
- A `/boot` partition (plain ext4, not in LVM - the bootloader must read it)
- A remaining partition as an LVM PV
- A volume group named `ubuntu-vg`
- One logical volume `ubuntu-lv` for the root filesystem

By default, `ubuntu-lv` uses 100% of the VG. This is a problem you should fix - leaving space in the VG enables snapshots and expansion.

## Custom LVM Setup in the Installer

For production servers, use custom partitioning:

1. Select "Custom storage layout"
2. Initialize your disk with GPT
3. Create partitions:

```text
/dev/sda1  512 MB  fat32   /boot/efi
/dev/sda2  2 GB    ext4    /boot (not in LVM)
/dev/sda3  rest    LVM PV  (no filesystem, marked as PV)
```

4. Click "Create volume group" on the PV, name it `vg-main`
5. Create logical volumes with explicit sizes:

```text
Name: lv-root   Size: 30 GB   Format: ext4   Mount: /
Name: lv-var    Size: 20 GB   Format: ext4   Mount: /var
Name: lv-home   Size: 10 GB   Format: ext4   Mount: /home
Name: lv-swap   Size: 4 GB    Format: swap   Mount: none
# Leave 10-20 GB unallocated in the VG
```

The unallocated space is the key: it gives you room to expand any LV later, create snapshots, or add temporary volumes.

## Post-Installation LVM Management

### Basic LVM Commands

```bash
# Show all volume groups and their free space
sudo vgs
# VG      #PV #LV #SN Attr   VSize   VFree
# vg-main   1   4   0 wz--n- 100.00g 20.00g

# Show all logical volumes
sudo lvs
# LV      VG      Attr       LSize   Pool Origin Data%
# lv-home vg-main -wi-ao---- 10.00g
# lv-root vg-main -wi-ao---- 30.00g
# lv-swap vg-main -wi-ao----  4.00g
# lv-var  vg-main -wi-ao---- 20.00g

# Show all physical volumes
sudo pvs

# Show detailed volume group info
sudo vgdisplay vg-main

# Show detailed LV info
sudo lvdisplay /dev/vg-main/lv-root
```

### Extending a Logical Volume

When a filesystem runs low on space, extend it without unmounting:

```bash
# Check current usage
df -h /var
# /dev/mapper/vg--main-lv--var  20G  18G  1.1G  95% /var

# Extend the LV by 10 GB (uses VG's free space)
sudo lvextend -L +10G /dev/vg-main/lv-var

# Or extend to a specific total size
sudo lvextend -L 30G /dev/vg-main/lv-var

# Or use all available free space in the VG
sudo lvextend -l +100%FREE /dev/vg-main/lv-var

# Resize the filesystem to fill the LV (ext4 - can do this while mounted)
sudo resize2fs /dev/vg-main/lv-var

# For XFS filesystems (also online - while mounted)
sudo xfs_growfs /var

# Verify the expansion
df -h /var
```

The `lvextend` and `resize2fs` combination is one of LVM's most valuable features - you can expand a full filesystem without taking it offline.

### Reducing a Logical Volume

Shrinking is more dangerous and requires unmounting first (ext4 only - XFS cannot shrink):

```bash
# Unmount the filesystem
sudo umount /home

# Check and repair the filesystem first
sudo e2fsck -f /dev/vg-main/lv-home

# Shrink the filesystem first (to 8 GB)
sudo resize2fs /dev/vg-main/lv-home 8G

# Then shrink the LV (must be equal to or larger than the new filesystem size)
sudo lvreduce -L 8G /dev/vg-main/lv-home

# Remount
sudo mount /home

# Verify
df -h /home
```

Always shrink the filesystem before shrinking the LV, and always check that `resize2fs` succeeds before `lvreduce`. Doing it in the wrong order corrupts data.

### Creating a New Logical Volume

```bash
# Create a new LV for a new database
sudo lvcreate -L 50G -n lv-pgdata vg-main

# Format it
sudo mkfs.ext4 /dev/vg-main/lv-pgdata

# Mount it
sudo mkdir -p /var/lib/postgresql
sudo mount /dev/vg-main/lv-pgdata /var/lib/postgresql

# Add to /etc/fstab for automatic mounting
echo "/dev/vg-main/lv-pgdata /var/lib/postgresql ext4 defaults 0 2" | sudo tee -a /etc/fstab

# Verify fstab
sudo findmnt --verify
```

### Adding a New Disk to an Existing Volume Group

When you run out of space in the VG, add another physical disk:

```bash
# Add a new disk (e.g., /dev/sdb was just attached)
sudo pvcreate /dev/sdb

# Extend the volume group to include the new PV
sudo vgextend vg-main /dev/sdb

# Verify the VG now has more space
sudo vgs

# Now you can extend LVs to use the new space
sudo lvextend -L +100G /dev/vg-main/lv-var
sudo resize2fs /dev/vg-main/lv-var
```

### Moving Data Between Physical Volumes

If you want to replace an aging disk without downtime:

```bash
# Add the new disk to the VG first
sudo pvcreate /dev/sdc
sudo vgextend vg-main /dev/sdc

# Move all data from the old disk to the new one (online, can take hours for large disks)
sudo pvmove /dev/sda3 /dev/sdc

# When pvmove finishes, remove the old PV from the VG
sudo vgreduce vg-main /dev/sda3

# Remove LVM metadata from the old disk
sudo pvremove /dev/sda3

# Now you can physically remove /dev/sda3
```

## LVM Snapshots

Snapshots create a point-in-time copy of a logical volume. This is invaluable for consistent backups:

```bash
# Create a snapshot of the root LV (must have free space in the VG)
sudo lvcreate -L 5G -s -n lv-root-snap /dev/vg-main/lv-root

# Mount the snapshot read-only for backup
sudo mkdir -p /mnt/root-snap
sudo mount -o ro /dev/vg-main/lv-root-snap /mnt/root-snap

# Backup the snapshot
sudo rsync -av /mnt/root-snap/ /backup/root-$(date +%Y%m%d)/

# Unmount and remove the snapshot when done
sudo umount /mnt/root-snap
sudo lvremove /dev/vg-main/lv-root-snap
```

Snapshots work via copy-on-write: the snapshot shares blocks with the origin LV until the origin changes, at which point the original block is copied to the snapshot. This makes snapshot creation nearly instant, but the snapshot grows over time as the origin changes.

For database backups, freeze the database, create the snapshot, unfreeze, then back up the snapshot:

```bash
# PostgreSQL consistent backup example
sudo -u postgres psql -c "SELECT pg_start_backup('lvm-snapshot');"
sudo lvcreate -L 5G -s -n lv-pgdata-snap /dev/vg-main/lv-pgdata
sudo -u postgres psql -c "SELECT pg_stop_backup();"

# Now back up the snapshot
sudo mount -o ro /dev/vg-main/lv-pgdata-snap /mnt/pgsnap
sudo rsync -av /mnt/pgsnap/ /backup/postgres-$(date +%Y%m%d)/
sudo umount /mnt/pgsnap
sudo lvremove /dev/vg-main/lv-pgdata-snap
```

## LVM Thin Provisioning

Thin provisioning allows creating LVs that are larger than the available physical space, useful when you know storage needs will grow but do not want to allocate all space upfront:

```bash
# Create a thin pool in the VG (10 GB physical pool)
sudo lvcreate -L 10G --thinpool thin-pool vg-main

# Create thin LVs that are "virtually" larger than the pool
sudo lvcreate -V 50G --thin -n lv-thin-01 vg-main/thin-pool
sudo lvcreate -V 50G --thin -n lv-thin-02 vg-main/thin-pool

# These LVs report 50 GB each but only use space as data is written
sudo mkfs.ext4 /dev/vg-main/lv-thin-01
sudo mount /dev/vg-main/lv-thin-01 /mnt/thin01

# Monitor pool usage
sudo lvs vg-main/thin-pool
```

Thin provisioning is used heavily by Docker (dm storage driver) and KVM to oversubscribe storage.

## Troubleshooting LVM

### VG Not Found After Reboot

```bash
# Scan for LVM components
sudo vgscan
sudo vgchange -ay    # Activate all volume groups
```

### LV Shows as "Not Available"

```bash
# Activate a specific LV
sudo lvchange -ay /dev/vg-main/lv-root
```

### Snapshot Full

When a snapshot fills up (from too much write activity to the origin), it becomes invalid:

```bash
# Check snapshot space usage
sudo lvs -o name,size,snap_percent vg-main

# If a snapshot is full, remove and recreate with more space
sudo lvremove /dev/vg-main/lv-root-snap
sudo lvcreate -L 15G -s -n lv-root-snap /dev/vg-main/lv-root
```

LVM is one of those tools that feels complex until you have used it a few times. Once it becomes familiar, you will want it on every server you manage. The ability to expand filesystems without downtime and take consistent snapshots for backups alone makes it worth enabling on every Ubuntu Server installation.
