# How to Replace a Failed Disk in an LVM Volume Group on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, LVM, Disk Replacement, Storage, Linux

Description: Learn how to safely replace a failed disk in an LVM volume group on RHEL without losing data, including steps for migrating physical extents and removing the faulty device.

---

Managing storage failures is one of the most critical tasks a Linux administrator faces. When a disk fails in an LVM volume group, you need to act quickly and methodically to preserve data integrity. This guide walks you through the complete process of replacing a failed disk in an LVM volume group on Red Hat Enterprise Linux 9.

## Prerequisites

Before you begin, ensure you have the following:

- A running RHEL system with root or sudo access
- An existing LVM volume group with a failed or failing disk
- A replacement disk of equal or greater size
- The `lvm2` package installed (it is included by default on RHEL)

## Step 1: Identify the Failed Disk

Start by examining the current state of your physical volumes to identify the failed disk.

```bash
sudo pvs
```

You might see output like this:

```bash
  PV         VG     Fmt  Attr PSize   PFree
  /dev/sda1  vg_data lvm2 a--  50.00g  10.00g
  /dev/sdb1  vg_data lvm2 a--  50.00g  50.00g
  /dev/sdc1  vg_data lvm2 ---  unknown unknown
```

A disk showing `unknown` size or missing attributes indicates a problem. You can also check for I/O errors in the system journal:

```bash
sudo journalctl -k | grep -i "error\|fail\|sdc"
```

Check the detailed status of all physical volumes:

```bash
sudo pvdisplay
```

## Step 2: Assess the Damage

Before proceeding, determine whether the failed disk is still partially readable. This affects your recovery strategy.

```bash
sudo pvck /dev/sdc1
```

If the disk is completely unresponsive, LVM may have already marked it as missing. Check with:

```bash
sudo vgdisplay vg_data
```

Look for lines indicating missing physical volumes or a reduced state.

## Step 3: Migrate Data Off the Failing Disk (If Possible)

If the disk is still partially functional, migrate its physical extents to another physical volume before removing it. This is the safest approach.

```bash
sudo pvmove /dev/sdc1
```

This command moves all physical extents from `/dev/sdc1` to other available physical volumes in the same volume group. If you want to target a specific destination:

```bash
sudo pvmove /dev/sdc1 /dev/sda1
```

Monitor the progress of the migration. This can take considerable time depending on the amount of data.

## Step 4: Add the Replacement Disk

Physically install the replacement disk or attach it if you are working in a virtual environment. Verify the system recognizes it:

```bash
sudo lsblk
```

Create a partition on the new disk if needed:

```bash
sudo fdisk /dev/sdd
```

Within fdisk, create a new partition and set its type to Linux LVM (type code `8e` for MBR or `8e00` for GPT using `gdisk`).

Initialize the partition as a physical volume:

```bash
sudo pvcreate /dev/sdd1
```

## Step 5: Add the New Physical Volume to the Volume Group

```bash
sudo vgextend vg_data /dev/sdd1
```

Verify the new physical volume is part of the volume group:

```bash
sudo pvs
```

## Step 6: Remove the Failed Disk from the Volume Group

If you successfully migrated data in Step 3, reduce the volume group:

```bash
sudo vgreduce vg_data /dev/sdc1
```

If the disk is completely failed and you cannot run `pvmove`, you need to force the removal:

```bash
sudo vgreduce --removemissing --force vg_data
```

This tells LVM to remove any physical volumes that are no longer accessible. Be aware that any data that was exclusively on the failed disk and not mirrored or migrated will be lost.

## Step 7: Remove the Physical Volume Label

After removing the disk from the volume group, clean up the physical volume metadata (only if the disk is still somewhat accessible):

```bash
sudo pvremove /dev/sdc1
```

## Step 8: Verify the Volume Group

Confirm that the volume group is healthy:

```bash
sudo vgdisplay vg_data
sudo pvs
sudo lvs
```

All logical volumes should be active and the volume group should show no missing physical volumes.

## Step 9: Rebuild Any Mirrors or RAID

If you were using LVM mirroring or RAID, you may need to repair the mirror configuration:

```bash
sudo lvconvert --repair vg_data/lv_mirror
```

Then verify the mirror status:

```bash
sudo lvs -a -o +devices
```

## Handling a Completely Unresponsive Disk

In situations where the disk has failed catastrophically and `pvmove` is not possible, follow this condensed procedure:

```bash
# Add the replacement disk
sudo pvcreate /dev/sdd1
sudo vgextend vg_data /dev/sdd1

# Remove the missing disk
sudo vgreduce --removemissing --force vg_data

# Check and repair logical volumes
sudo lvchange -ay vg_data
sudo lvs -a -o +devices
```

After the removal, any logical volumes that had extents on the failed disk may be in a partial state. You may need to restore from backups for data that was lost.

## Preventing Future Failures

To reduce the impact of future disk failures, consider these strategies:

- **Use LVM mirroring or RAID**: Distribute data across multiple disks so that a single disk failure does not cause data loss.
- **Monitor disk health**: Use `smartctl` from the `smartmontools` package to monitor disk SMART data.
- **Keep LVM metadata backups**: LVM automatically backs up metadata to `/etc/lvm/backup/` and `/etc/lvm/archive/`. Verify these are current.
- **Test your recovery procedures**: Regularly practice disk replacement in a test environment.

```bash
sudo dnf install smartmontools -y
sudo smartctl -a /dev/sda
```

## Conclusion

Replacing a failed disk in an LVM volume group on RHEL is a manageable process when you follow the correct sequence of steps. The key is to migrate data off the failing disk as early as possible, add the replacement disk, and then cleanly remove the failed device. By combining LVM with proper monitoring and redundancy strategies, you can minimize downtime and data loss when hardware failures occur.
