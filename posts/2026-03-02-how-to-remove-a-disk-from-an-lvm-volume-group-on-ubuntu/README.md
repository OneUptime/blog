# How to Remove a Disk from an LVM Volume Group on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LVM, Storage, Disk Management, Linux

Description: Safely remove a physical disk from an LVM Volume Group on Ubuntu by migrating data with pvmove and then cleanly detaching the Physical Volume.

---

Removing a disk from an LVM Volume Group is a deliberate process that requires migrating all data off the Physical Volume before it can be detached. This is necessary when decommissioning older drives, replacing a disk with a larger one, or reorganizing storage. The key tool is `pvmove`, which relocates extents from one PV to others in the same VG while the system runs.

## Prerequisites

Before removing a PV, the other PVs in the VG must have enough free space to absorb the extents from the disk being removed. If the VG doesn't have sufficient free space elsewhere, you'll need to add a new disk first.

Check current state:

```bash
# See all PVs and their usage
sudo pvs

# See VG free space
sudo vgs
```

Example output:
```text
  PV         VG       Fmt  Attr PSize    PFree
  /dev/sdb   data_vg  lvm2 a--  500.00g      0
  /dev/sdc   data_vg  lvm2 a--  500.00g  200.00g

  VG       #PV #LV #SN Attr   VSize    VFree
  data_vg    2   3   0 wz--n- 999.99g  200.00g
```

Here `/dev/sdb` is fully used (500GB allocated, 0 free), but `/dev/sdc` has 200GB free. You can only remove `/dev/sdb` if the extents on it total 200GB or less (since that's all the free space available on other PVs).

Check how much is actually allocated on the PV you want to remove:

```bash
sudo pvdisplay /dev/sdb | grep -E "Allocated|Total|Free"
```

```text
  Total PE              127999
  Free PE               0
  Allocated PE          127999
```

All 127999 PEs (500GB with 4MB PE size) are allocated. You need 500GB free elsewhere in the VG to move everything off.

## Step 1: Ensure Sufficient Free Space

If you don't have enough free space in the VG to absorb the PV you're removing, add a new disk first:

```bash
# Add a new disk to provide room for migration
sudo pvcreate /dev/sdd
sudo vgextend data_vg /dev/sdd

# Re-check free space
sudo vgs data_vg
```

## Step 2: Migrate Data with pvmove

`pvmove` relocates Physical Extents from the specified PV to free extents on other PVs in the same VG. Running LVs are not interrupted during this process.

### Basic pvmove (moves all extents from /dev/sdb)

```bash
sudo pvmove /dev/sdb
```

This moves all allocated extents off `/dev/sdb` to any available free space in the VG. The command can take a long time for large disks - plan accordingly.

Output during migration:
```text
  /dev/sdb: Moved: 2.35%
  /dev/sdb: Moved: 8.72%
  /dev/sdb: Moved: 15.10%
  ...
  /dev/sdb: Moved: 100.00%
```

### Move extents to a specific destination PV

```bash
# Move only to /dev/sdd (the newly added disk)
sudo pvmove /dev/sdb /dev/sdd
```

### Run pvmove in the background

For large migrations, run pvmove as a background process:

```bash
sudo pvmove -b /dev/sdb
```

Monitor background migration progress:

```bash
sudo lvs -a -o name,copy_percent,devices
# or
sudo watch -n 5 'sudo pvs'
```

The migration persists through LVM's internal journaling - if interrupted, it resumes where it left off when you run pvmove again.

### Resuming an interrupted pvmove

If the system reboots or pvmove is killed:

```bash
# Resume the migration - LVM will pick up from where it stopped
sudo pvmove
```

## Step 3: Verify the PV is Empty

After pvmove completes, confirm no extents remain on the PV:

```bash
sudo pvdisplay /dev/sdb
```

```text
  --- Physical volume ---
  PV Name               /dev/sdb
  VG Name               data_vg
  PV Size               500.00 GiB
  Allocatable           yes (but full)
  PE Size               4.00 MiB
  Total PE              127999
  Free PE               127999       <- All free now
  Allocated PE          0            <- Nothing allocated
```

Also check that no LV segments remain on this PV:

```bash
sudo pvs -o pv_name,lv_name,seg_start_pe,seg_pe_ranges /dev/sdb
```

If this shows no LV entries, the PV is clear.

## Step 4: Remove the PV from the Volume Group

With all data migrated off, remove the PV from the VG:

```bash
sudo vgreduce data_vg /dev/sdb
```

Output:
```text
  Removed "/dev/sdb" from volume group "data_vg"
```

Verify:

```bash
sudo vgs data_vg
```

The PV count should decrease by 1.

## Step 5: Uninitialize the Physical Volume

The PV still contains LVM metadata even after being removed from the VG. Clean this up:

```bash
sudo pvremove /dev/sdb
```

```text
  Labels on physical volume "/dev/sdb" successfully wiped.
```

After this, `/dev/sdb` is a plain disk with no LVM associations.

## Step 6: Wipe the Disk (Optional but Recommended)

If you're repurposing or decommissioning the drive:

```bash
# Remove any remaining partition table / filesystem signatures
sudo wipefs -a /dev/sdb

# For secure decommission, overwrite with zeros (time-consuming)
sudo dd if=/dev/zero of=/dev/sdb bs=4M status=progress
```

If the disk is being physically removed, you can now safely pull it.

## Handling pvmove Failure: Not Enough Space

```text
  Insufficient free space: 127999 extents needed, but only 51200 available
```

You need more free space in the VG. Either:

1. Add a new disk: `sudo pvcreate /dev/sdd && sudo vgextend data_vg /dev/sdd`
2. Shrink an existing LV to free up extents in the VG

## Moving a Specific LV Off a PV

If you only want to move a specific LV rather than all data from a PV:

```bash
# Move only the 'web_data' LV from /dev/sdb to anywhere else
sudo pvmove -n web_data /dev/sdb
```

This is useful for performance optimization - moving a heavily-used LV to a faster disk while leaving other LVs in place.

## Moving to a Specific Extent Range on Destination

For precise control (advanced):

```bash
# Move from /dev/sdb to specific PE range on /dev/sdd
sudo pvmove /dev/sdb:0-51199 /dev/sdd:0-51199
```

## Checking LV Layout After Migration

Verify your LVs are now distributed as expected:

```bash
# Show which PVs back each LV
sudo lvdisplay -m /dev/data_vg/db_data
```

This confirms the migration moved extents to the right places.

## Common Scenario: Replacing a Smaller Disk with a Larger One

1. Add the new larger disk to the VG: `sudo pvcreate /dev/sdd && sudo vgextend data_vg /dev/sdd`
2. Move all data off the old disk: `sudo pvmove /dev/sdb /dev/sdd`
3. Remove the old disk from the VG: `sudo vgreduce data_vg /dev/sdb`
4. Clean up: `sudo pvremove /dev/sdb`
5. Physically remove the old disk
6. Optionally extend LVs to use the extra space the new disk provides

The entire process can be done live with no service interruption, which is exactly the kind of operational flexibility that makes LVM worth learning.
