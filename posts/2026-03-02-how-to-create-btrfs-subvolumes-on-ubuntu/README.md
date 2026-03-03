# How to Create Btrfs Subvolumes on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Btrfs, Storage, Linux, File System

Description: Create and manage Btrfs subvolumes on Ubuntu to organize storage with flexible mount points, per-subvolume snapshot policies, and independent space management.

---

Btrfs subvolumes are a core organizational concept that goes beyond simple directory structure. A subvolume is an independent filesystem namespace within a Btrfs volume - it has its own snapshot space, can be mounted independently, and can have different properties from other subvolumes. Understanding subvolumes is essential for getting the most out of Btrfs.

## What Is a Btrfs Subvolume?

A Btrfs subvolume looks like a directory but behaves more like a separate filesystem:

- Snapshots are taken per-subvolume, not of the entire Btrfs volume
- Subvolumes can be mounted independently with different mount options
- Subvolumes can be sent/received (replicated) to other Btrfs volumes
- Each subvolume has its own inode namespace

Contrast with a regular directory: a directory is just a path within a subvolume. Snapshots of a subvolume don't include content from nested subvolumes (they appear as empty directories).

## How Ubuntu Uses Btrfs Subvolumes

Ubuntu's Btrfs installation layout (if you chose Btrfs during install) uses a conventional layout:

```text
Btrfs volume (on /dev/sda1)
  @        -> mounted as /
  @home    -> mounted as /home
  @boot    -> mounted as /boot (sometimes)
```

This separation lets you snapshot root (`@`) for system snapshots without including home directories (`@home`), and vice versa.

## Viewing Existing Subvolumes

```bash
# List all subvolumes in the Btrfs filesystem mounted at /
sudo btrfs subvolume list /
```

```text
ID 256 gen 145 top level 5 path @
ID 257 gen 143 top level 5 path @home
ID 258 gen 67  top level 256 path @/var/lib/portables
```

Each subvolume has:
- **ID**: Unique numeric identifier
- **gen**: Generation number (increments on each change)
- **top level**: ID of the parent subvolume (5 = top-level volume)
- **path**: Path relative to the top-level Btrfs volume

## Creating Subvolumes

### Basic subvolume creation

```bash
# Mount the Btrfs volume (if not already mounted)
sudo mount /dev/sdb /data

# Create a subvolume
sudo btrfs subvolume create /data/web
sudo btrfs subvolume create /data/databases
sudo btrfs subvolume create /data/backups
```

The subvolumes appear as directories but are actually independent namespaces.

### Verify creation

```bash
sudo btrfs subvolume list /data
```

```text
ID 256 gen 12 top level 5 path web
ID 257 gen 12 top level 5 path databases
ID 258 gen 12 top level 5 path backups
```

### Create nested subvolumes

```bash
# Create a subvolume inside another subvolume
sudo btrfs subvolume create /data/databases/postgresql
sudo btrfs subvolume create /data/databases/mysql
```

When you snapshot `/data/databases`, the nested subvolumes (`postgresql`, `mysql`) appear as empty directories in the snapshot. They are not included in the parent's snapshot - they're independent subvolumes.

## Mounting Subvolumes Independently

One of the primary uses for subvolumes is mounting them at specific paths with specific options.

### Mount a specific subvolume by name

```bash
# Mount the 'web' subvolume at /var/www
sudo mount -o subvol=web /dev/sdb /var/www

# Mount 'databases' at /var/lib/db
sudo mount -o subvol=databases /dev/sdb /var/lib/db
```

### Mount a specific subvolume by ID

```bash
# Get the subvolume ID
sudo btrfs subvolume list /data | grep postgresql

# Mount by ID
sudo mount -o subvolid=258 /dev/sdb /var/lib/postgresql
```

### Mounting from the top-level volume

To access the top-level volume (the "root" of the Btrfs filesystem, not any subvolume):

```bash
sudo mount -o subvolid=5 /dev/sdb /mnt/btrfs_root
ls /mnt/btrfs_root
# Shows: web/  databases/  backups/  (and any other subvolumes)
```

This is how tools manage multiple subvolumes - they mount the top level and then interact with each subvolume's directory.

## Persistent Subvolume Mounts in /etc/fstab

```bash
# Get the UUID
sudo blkid /dev/sdb
```

Add entries to `/etc/fstab`:

```text
# /etc/fstab
# Main Btrfs device - mount the 'web' subvolume at /var/www
UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  /var/www          btrfs  subvol=web,compress=zstd:3,noatime      0  0

# Mount 'databases' subvolume with specific options for DB workload
UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  /var/lib/db       btrfs  subvol=databases,noatime,nodatacow       0  0

# Mount 'backups' subvolume
UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  /backup           btrfs  subvol=backups,compress=zstd:9,noatime   0  0
```

Note that all entries use the same UUID (same device) but mount different subvolumes. Each can have different mount options.

Test:

```bash
sudo mount -a
df -h
```

## nodatacow for Database Subvolumes

Btrfs's copy-on-write behavior is great for most files but conflicts with database write patterns. Databases do their own internal journaling and checksumming; Btrfs CoW adds overhead without benefit.

Disable CoW for database subvolumes:

```bash
# The nodatacow option must be set when the directory is empty
# (or when the subvolume is first created)
sudo mount -o nodatacow /dev/sdb /var/lib/db
```

Or in fstab: `subvol=databases,nodatacow,noatime`

When `nodatacow` is set, checksumming is also disabled for that subvolume (checksumming requires CoW). This is the accepted tradeoff for database workloads where the database itself handles integrity.

## Subvolume Properties

Check properties of a subvolume:

```bash
sudo btrfs subvolume show /data/web
```

```text
        Name:           web
        UUID:           xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        Parent UUID:    -
        Received UUID:  -
        Creation time:  2026-03-02 01:00:00 +0000
        Subvolume ID:   256
        Generation:     145
        Gen at creation: 12
        Parent ID:      5
        Top level ID:   5
        Flags:          -
        Send transid:   0
        Send time:      2026-03-02 01:00:00 +0000
        Receive transid: 0
        Receive time:   -
        Snapshot(s):
```

## Moving Data Into a Subvolume

If you have existing data in a directory and want to move it into a subvolume:

```bash
# Strategy: create the subvolume alongside the directory, copy data, switch

# 1. Create the subvolume with a temporary name
sudo btrfs subvolume create /data/web_new

# 2. Copy existing data into the subvolume
sudo rsync -av /var/www/ /data/web_new/

# 3. Unmount old location if it was mounted
sudo umount /var/www 2>/dev/null || true

# 4. The subvolume can now be mounted at /var/www
sudo mount -o subvol=web_new /dev/sdb /var/www
```

## Deleting Subvolumes

```bash
sudo btrfs subvolume delete /data/web
```

```text
Delete subvolume (no-commit): '/data/web'
```

A subvolume must be empty of snapshots before deletion, unless you use the recursive delete option:

```bash
# Delete subvolume and all its snapshots
sudo btrfs subvolume delete /data/web_old
```

If deletion fails because of dependent snapshots:

```bash
# List snapshots of the subvolume
sudo btrfs subvolume list / | grep "web_old"

# Delete snapshots first
sudo btrfs subvolume delete /data/snapshots/web_old_snap1
sudo btrfs subvolume delete /data/web_old
```

## Quota Groups for Subvolumes

Btrfs quota groups (qgroups) let you track and limit space per subvolume:

```bash
# Enable quota support
sudo btrfs quota enable /data

# Show quotas
sudo btrfs qgroup show /data
```

```text
qgroupid         rfer         excl     max_rfer     max_excl
--------         ----         ----     --------     --------
0/5              1.23GiB      1.23GiB         none         none
0/256          450.12MiB    450.12MiB         none         none
0/257          750.34MiB    750.34MiB         none         none
```

### Set per-subvolume quota

```bash
# Limit 'web' subvolume to 200GB
sudo btrfs qgroup limit 200G /data/web

# Limit by ID
sudo btrfs qgroup limit 200G 0/256 /data
```

### Remove quota

```bash
sudo btrfs qgroup limit none /data/web
```

## Typical Subvolume Layout for a Server

A practical layout for a web server with Btrfs:

```bash
# Assuming Btrfs is on /dev/sdb, mounted at /mnt/btrfs

# Create subvolumes
sudo btrfs subvolume create /mnt/btrfs/@web          # /var/www
sudo btrfs subvolume create /mnt/btrfs/@databases    # /var/lib/postgresql
sudo btrfs subvolume create /mnt/btrfs/@logs         # /var/log
sudo btrfs subvolume create /mnt/btrfs/@backups      # /backup
sudo btrfs subvolume create /mnt/btrfs/@snapshots    # snapshot storage location
```

```text
# /etc/fstab entries
UUID=xxxx  /var/www           btrfs  subvol=@web,compress=zstd:3,noatime     0 0
UUID=xxxx  /var/lib/postgresql btrfs subvol=@databases,nodatacow,noatime     0 0
UUID=xxxx  /var/log           btrfs  subvol=@logs,compress=zstd:3,noatime    0 0
UUID=xxxx  /backup            btrfs  subvol=@backups,compress=zstd:9,noatime 0 0
UUID=xxxx  /mnt/snapshots     btrfs  subvol=@snapshots,noatime               0 0
```

This structure supports:
- Independent snapshots per service
- Different mount options per workload
- Clear organization for backup and restore operations

Subvolumes are the building block for Btrfs snapshots. Once your subvolume layout is established, taking snapshots and rolling back is straightforward - see the companion guide on Btrfs snapshots.
