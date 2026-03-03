# How to Understand LVM Concepts: PV, VG, LV Explained for Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LVM, Storage, Linux, Disk Management

Description: A thorough explanation of LVM concepts including Physical Volumes, Volume Groups, and Logical Volumes, with practical Ubuntu examples for sysadmins.

---

LVM - the Logical Volume Manager - is one of those tools that looks intimidating until you understand the three-layer abstraction it introduces. Once you grasp the relationship between Physical Volumes, Volume Groups, and Logical Volumes, everything else makes sense. This guide explains each concept with concrete examples you can follow on Ubuntu.

## Why LVM Exists

Traditional disk partitioning has a fundamental limitation: partitions are tied to specific physical locations on specific disks. If `/var` fills up and lives on a fixed partition, you can't easily resize it without downtime and data migration.

LVM solves this by adding an abstraction layer between physical storage and the filesystems that use it. You can:

- Resize filesystems without unmounting them (in many cases)
- Span a single filesystem across multiple physical disks
- Add new disks to an existing storage pool on the fly
- Take point-in-time snapshots of volumes
- Move data between disks while the system is live

## The Three Layers of LVM

### Physical Volume (PV)

A Physical Volume is a raw storage device that has been initialized for use by LVM. It can be:

- A whole disk (`/dev/sdb`)
- A disk partition (`/dev/sdb1`)
- A RAID array device (`/dev/md0`)
- A LUKS encrypted device (`/dev/mapper/encrypted_data`)

When you initialize a PV, LVM writes metadata to it that identifies it as an LVM component and records the Volume Group it belongs to (once assigned). The storage on a PV is divided into fixed-size chunks called **Physical Extents (PEs)**. The default PE size is 4MB.

```bash
# Initialize a disk as a Physical Volume
sudo pvcreate /dev/sdb

# View Physical Volume details
sudo pvdisplay /dev/sdb
```

Output from `pvdisplay`:
```text
  --- Physical volume ---
  PV Name               /dev/sdb
  VG Name               data_vg
  PV Size               500.00 GiB / not usable 4.00 MiB
  Allocatable           yes
  PE Size               4.00 MiB
  Total PE              127999
  Free PE               65536
  Allocated PE          62463
  PV UUID               abc123-def4-5678-...
```

### Volume Group (VG)

A Volume Group is a pool of storage assembled from one or more Physical Volumes. You can think of it as a virtual disk that LVM manages.

Key points about VGs:
- A VG combines the storage from all its member PVs into one contiguous address space
- You can add PVs to a VG at any time to expand the pool
- All PVs in a VG use the same Physical Extent size
- Logical Volumes are carved out from VG space

```bash
# Create a Volume Group from one or more PVs
sudo vgcreate data_vg /dev/sdb

# Create a VG spanning multiple disks
sudo vgcreate data_vg /dev/sdb /dev/sdc

# View Volume Group details
sudo vgdisplay data_vg
```

Output from `vgdisplay`:
```text
  --- Volume group ---
  VG Name               data_vg
  System ID
  Format                lvm2
  VG Size               999.99 GiB
  PE Size               4.00 MiB
  Total PE              255998
  Alloc PE / Size       0 / 0
  Free  PE / Size       255998 / 999.99 GiB
  VG UUID               xyz789-abc1-2345-...
```

### Logical Volume (LV)

A Logical Volume is what you actually format with a filesystem and mount. It's carved out of the free space in a Volume Group. This is the equivalent of a traditional partition, but with much more flexibility.

```bash
# Create a 100GB Logical Volume
sudo lvcreate -L 100G -n web_data data_vg

# Create an LV using all free space in the VG
sudo lvcreate -l 100%FREE -n remaining_space data_vg

# View Logical Volume details
sudo lvdisplay /dev/data_vg/web_data
```

Output from `lvdisplay`:
```text
  --- Logical volume ---
  LV Path                /dev/data_vg/web_data
  LV Name                web_data
  VG Name                data_vg
  LV UUID                lmn456-opq7-8901-...
  LV Size                100.00 GiB
  Current LE             25600
  Segments               1
  Allocation             inherit
  Read ahead sectors     auto
  Block device           253:0
```

## The Extent System

Understanding extents clarifies how LVM works internally.

- **Physical Extent (PE)**: The smallest allocatable unit on a Physical Volume (default 4MB)
- **Logical Extent (LE)**: The smallest allocatable unit in a Logical Volume; maps 1:1 to PEs

When you create a 100GB LV with 4MB PEs, LVM allocates 25,600 Physical Extents from the Volume Group and maps them to 25,600 Logical Extents in the LV.

The power here is that those 25,600 PEs can come from different Physical Volumes. LVM keeps a map of which PE backs which LE. This is how a single LV can span multiple physical disks.

## How the Layers Relate

```text
Physical Storage
    /dev/sdb (500GB disk)   /dev/sdc (500GB disk)
         |                        |
         v                        v
    Physical Volume          Physical Volume
    (PV: /dev/sdb)          (PV: /dev/sdc)
         |                        |
         +----------+-------------+
                    |
                    v
              Volume Group
              (VG: data_vg, 1TB total)
                    |
         +----------+----------+
         |          |          |
         v          v          v
    Logical Vol  Logical Vol  Logical Vol
    (LV: web_data) (LV: db_data) (LV: backups)
    100GB          300GB          600GB
         |          |          |
         v          v          v
      ext4 FS    XFS FS     ext4 FS
      /var/www  /var/lib/db  /backups
```

## Common LVM Commands Reference

### Scanning and listing

```bash
# Scan for all LVM components
sudo lvmdiskscan

# List Physical Volumes (short format)
sudo pvs

# List Volume Groups (short format)
sudo vgs

# List Logical Volumes (short format)
sudo lvs

# Show everything with details
sudo pvdisplay
sudo vgdisplay
sudo lvdisplay
```

### Quick status output

```bash
# pvs output example:
  PV         VG       Fmt  Attr PSize    PFree
  /dev/sdb   data_vg  lvm2 a--  500.00g  150.00g
  /dev/sdc   data_vg  lvm2 a--  500.00g  350.00g

# vgs output example:
  VG       #PV #LV #SN Attr   VSize    VFree
  data_vg    2   3   0 wz--n- 999.99g  500.00g

# lvs output example:
  LV         VG       Attr       LSize   Pool Origin Data%
  web_data   data_vg  -wi-ao---- 100.00g
  db_data    data_vg  -wi-ao---- 300.00g
  backups    data_vg  -wi-ao---- 100.00g
```

## LVM Naming Conventions

LVM creates device paths under `/dev/`:

- `/dev/<vg_name>/<lv_name>` - symbolic link
- `/dev/mapper/<vg_name>-<lv_name>` - actual device node

Both paths point to the same device. You can use either in commands, `/etc/fstab`, and so on. Using the `/dev/<vg_name>/<lv_name>` form is generally more readable.

## LVM Metadata

LVM stores its configuration in metadata areas on each Physical Volume. This metadata describes the entire Volume Group structure - which PVs belong, which LVs exist, the extent mappings, and so on.

Every PV in a VG has a copy of this metadata. This redundancy means losing one PV doesn't necessarily destroy the configuration information for the whole VG (though it may lose data depending on how LVs were laid out).

## Getting Started with LVM on Ubuntu

Ubuntu's installer offers LVM as an option during setup. If you chose it, your system likely already has an LVM configuration you can examine:

```bash
# Check if your system uses LVM
sudo vgs
sudo lvs
```

A common Ubuntu LVM layout from the installer:

```text
VG: ubuntu-vg
  LV: ubuntu-lv    (root filesystem, /dev/ubuntu-vg/ubuntu-lv)
```

The installer often leaves free space in the VG for you to allocate later - check with `vgs` to see if `VFree` shows available space.

Understanding these three concepts - PV, VG, LV - gives you the foundation to resize volumes, add disks, take snapshots, and migrate data, all of which build on this same abstraction.
