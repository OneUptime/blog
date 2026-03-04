# How to Create and Manage LVM Mirrors for High Availability on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, LVM, Mirroring, High Availability, Storage, Linux

Description: Learn how to create and manage LVM mirrors on RHEL for high availability, ensuring your data survives disk failures through real-time mirroring across multiple physical volumes.

---

LVM mirroring provides data redundancy by maintaining identical copies of your logical volume data on separate physical disks. When one disk fails, the mirror ensures your data remains accessible from the surviving disk. This guide covers how to set up and manage LVM mirrors on RHEL for high availability storage.

## Prerequisites

- A RHEL system with root or sudo access
- At least two separate physical disks (or partitions on separate disks)
- The `lvm2` package installed

## Understanding LVM Mirrors

LVM supports two types of mirroring:

1. **Mirror segments (`mirror` type)**: The traditional LVM mirroring approach that uses a separate log device to track synchronization.
2. **RAID1 (`raid1` type)**: A newer approach that uses the MD RAID subsystem under the hood and is generally preferred for new deployments.

Both approaches maintain duplicate copies of data, but RAID1 offers better handling of transient failures and does not require a separate log device.

## Step 1: Prepare the Physical Volumes

Initialize your disks as physical volumes:

```bash
sudo pvcreate /dev/sdb /dev/sdc
```

Create a volume group with both physical volumes:

```bash
sudo vgcreate vg_mirror /dev/sdb /dev/sdc
```

Verify the setup:

```bash
sudo pvs
sudo vgdisplay vg_mirror
```

## Step 2: Create a RAID1 Mirrored Logical Volume

The recommended approach on RHEL is to use the RAID1 type:

```bash
sudo lvcreate --type raid1 -m 1 -L 10G -n lv_data vg_mirror
```

The `-m 1` flag specifies one mirror copy (meaning two total copies of the data). The `--type raid1` flag explicitly requests RAID1 mirroring.

Verify the mirror:

```bash
sudo lvs -a -o +devices,segtype
```

You should see the main logical volume and its associated image and metadata sub-volumes.

## Step 3: Create a Traditional Mirror (Alternative)

If you prefer the traditional mirror type:

```bash
sudo lvcreate --type mirror -m 1 -L 10G -n lv_legacy vg_mirror
```

This creates a mirror with a log device. The log tracks which regions are in sync. You can specify where the log resides:

```bash
sudo lvcreate --type mirror -m 1 --mirrorlog core -L 10G -n lv_corelog vg_mirror
```

The `--mirrorlog core` option keeps the log in memory rather than on disk, which avoids dedicating disk space to the log but means a full resync is needed after a crash.

## Step 4: Format and Mount the Mirror

```bash
sudo mkfs.xfs /dev/vg_mirror/lv_data
sudo mkdir -p /data
sudo mount /dev/vg_mirror/lv_data /data
```

Add to `/etc/fstab` for persistence:

```bash
echo '/dev/vg_mirror/lv_data /data xfs defaults 0 0' | sudo tee -a /etc/fstab
```

## Step 5: Monitor Mirror Synchronization

After creating a mirror, the initial synchronization takes time. Monitor progress:

```bash
sudo lvs -a -o +sync_percent
```

The `sync_percent` column shows `100.00` when synchronization is complete.

For more detailed status:

```bash
sudo lvs -a -o name,copy_percent,devices vg_mirror
```

## Step 6: Manage Mirror Failures

### Simulate a Disk Failure

To understand how mirrors behave during failures, you can test by removing a disk. First, check the current layout:

```bash
sudo lvs -a -o +devices vg_mirror
```

### Repair a Degraded Mirror

If a disk fails, the mirror enters a degraded state. Replace the failed disk and repair:

```bash
# Add a new physical volume
sudo pvcreate /dev/sdd
sudo vgextend vg_mirror /dev/sdd

# Repair the degraded mirror
sudo lvconvert --repair vg_mirror/lv_data
```

LVM will prompt you to confirm the replacement. After repair, verify:

```bash
sudo lvs -a -o +devices,sync_percent vg_mirror
```

## Step 7: Add and Remove Mirror Legs

### Add a Mirror Leg

To increase redundancy by adding another mirror copy:

```bash
sudo lvconvert -m 2 vg_mirror/lv_data
```

This changes from one mirror (two copies) to two mirrors (three copies).

### Remove a Mirror Leg

To reduce the number of mirror copies:

```bash
sudo lvconvert -m 0 vg_mirror/lv_data
```

Setting `-m 0` converts the logical volume back to a simple linear volume with no mirroring.

## Step 8: Control Mirror Placement

Ensure mirror copies reside on different physical disks by specifying physical volumes:

```bash
sudo lvcreate --type raid1 -m 1 -L 10G -n lv_placed vg_mirror /dev/sdb /dev/sdc
```

This explicitly places each mirror leg on a specific disk.

You can also use allocation policies:

```bash
sudo lvcreate --type raid1 -m 1 -L 10G -n lv_normal vg_mirror --alloc normal
```

The `normal` allocation policy ensures mirror legs go on different physical volumes when possible.

## Step 9: Convert an Existing Volume to a Mirror

You can add mirroring to an existing linear logical volume:

```bash
sudo lvconvert --type raid1 -m 1 vg_mirror/lv_existing
```

Monitor the synchronization:

```bash
sudo lvs -o +sync_percent vg_mirror/lv_existing
```

The conversion happens online without unmounting the filesystem.

## Step 10: Split a Mirror for Backups

You can temporarily split off a mirror leg for backup purposes:

```bash
sudo lvconvert --splitmirrors 1 --name lv_backup vg_mirror/lv_data
```

This creates a new logical volume `lv_backup` from one of the mirror legs. The original volume continues operating with reduced redundancy. After taking your backup, you can re-add a mirror leg:

```bash
sudo lvconvert -m 1 vg_mirror/lv_data
```

## Best Practices

- **Always use separate physical disks** for mirror legs. Mirroring across partitions on the same disk provides no protection against disk failure.
- **Monitor synchronization** after creating or repairing mirrors. The volume is not fully protected until sync is complete.
- **Use RAID1 type** instead of the legacy mirror type for new deployments.
- **Test failover procedures** in a non-production environment before relying on mirrors in production.
- **Keep spare disks** available for quick replacement when failures occur.

## Conclusion

LVM mirroring on RHEL provides a straightforward way to protect your data against disk failures. Whether you choose the modern RAID1 type or the traditional mirror type, LVM makes it easy to create, manage, and repair mirrored volumes. Combined with proper monitoring and tested recovery procedures, LVM mirrors deliver reliable high availability for your storage infrastructure.
