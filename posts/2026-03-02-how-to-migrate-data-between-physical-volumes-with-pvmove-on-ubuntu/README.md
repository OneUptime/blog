# How to Migrate Data Between Physical Volumes with pvmove on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LVM, Pvmove, Storage, Disk Management

Description: Use pvmove on Ubuntu to migrate LVM data between Physical Volumes online without service interruption, covering full disk and targeted LV migration scenarios.

---

`pvmove` is one of LVM's most practical features. It relocates Physical Extents from one Physical Volume to another while filesystems remain mounted and services keep running. You'd use it when replacing a failing disk, moving data to faster storage, or balancing utilization across drives in a Volume Group.

## When to Use pvmove

- **Disk replacement**: Move data off an old or failing disk before removing it from the VG
- **Performance optimization**: Move a heavily-read LV to an SSD while leaving archive data on HDD
- **Storage rebalancing**: Redistribute extents more evenly across PVs
- **Disk decommission**: Empty a PV so it can be removed from the VG with `vgreduce`

## Prerequisites

Confirm the Volume Group has enough free space on the destination PV(s) to accommodate what you're moving:

```bash
sudo pvs
```

```text
  PV         VG       Fmt  Attr PSize    PFree
  /dev/sdb   data_vg  lvm2 a--  500.00g      0
  /dev/sdc   data_vg  lvm2 a--  500.00g  300.00g
  /dev/sdd   data_vg  lvm2 a--  500.00g  500.00g
```

To move all 500GB from `/dev/sdb`, you need at least 500GB free across other PVs. Here, `/dev/sdc` has 300GB and `/dev/sdd` has 500GB free - 800GB total, which is enough.

## Basic pvmove: Move All Extents from a PV

```bash
# Move everything off /dev/sdb to anywhere with free space in data_vg
sudo pvmove /dev/sdb
```

LVM displays progress as it migrates:

```text
  /dev/sdb: Moved: 0.22%
  /dev/sdb: Moved: 1.47%
  /dev/sdb: Moved: 5.93%
  ...
  /dev/sdb: Moved: 100.00%
```

This can take a significant amount of time for large disks - roughly 5-15 minutes per 100GB on spinning disks, faster on SSDs. Services remain available throughout.

## Specifying a Destination PV

Direct extents to a specific PV rather than letting LVM choose:

```bash
# Move everything from /dev/sdb specifically to /dev/sdd
sudo pvmove /dev/sdb /dev/sdd
```

This is useful when the destination matters - for example, moving to an SSD for performance.

## Moving a Specific LV

Move only the extents belonging to a particular Logical Volume:

```bash
# Move only the 'web_data' LV from /dev/sdb
sudo pvmove -n web_data /dev/sdb

# Move 'web_data' from /dev/sdb to /dev/sdd specifically
sudo pvmove -n web_data /dev/sdb /dev/sdd
```

This leaves other LVs' extents on `/dev/sdb` untouched.

## Moving Specific Extent Ranges

For very precise control, specify exactly which Physical Extents to move:

```bash
# Move PEs 0 through 2047 from /dev/sdb (the first 8GB with 4MB PE size)
sudo pvmove /dev/sdb:0-2047

# Move that range to a specific range on /dev/sdd
sudo pvmove /dev/sdb:0-2047 /dev/sdd:0-2047
```

Find which extents are in use on a PV:

```bash
sudo pvdisplay -m /dev/sdb
```

## Running pvmove in the Background

For long migrations, background mode is recommended:

```bash
# Start background migration
sudo pvmove -b /dev/sdb
```

pvmove exits and returns the shell prompt, while the migration continues. Monitor it:

```bash
# Check progress every 30 seconds
watch -n 30 'sudo pvs'
```

```text
Every 30.0s: sudo pvs

  PV         VG       Fmt  Attr PSize    PFree
  /dev/sdb   data_vg  lvm2 a--  500.00g  125.00g
  /dev/sdc   data_vg  lvm2 a--  500.00g   75.00g
  /dev/sdd   data_vg  lvm2 a--  500.00g  250.00g
```

Watch `/dev/sdb` PFree grow as extents move off it.

Alternatively:

```bash
# See LV copy percentages during pvmove
sudo lvs -a -o lv_name,copy_percent
```

## Pausing and Resuming pvmove

pvmove creates a temporary "mirror" LV internally to track the migration state. You can abort and resume:

```bash
# Abort the current pvmove (data already moved stays moved, not rolled back)
sudo pvmove --abort

# To resume, simply run pvmove again on the same source PV
sudo pvmove /dev/sdb
```

If the system reboots during a pvmove:

```bash
# On reboot, the mirror LV may exist in a partial state
sudo lvs -a | grep pvmove

# Resume migration - LVM picks up where it left off
sudo pvmove
```

## Verifying Data Placement After Migration

Check that extents moved where you expected:

```bash
# See segment layout for each LV
sudo lvs -o lv_name,devices,seg_pe_ranges --noheadings

# Detailed per-LV segment info
sudo lvdisplay -m /dev/data_vg/web_data
```

```text
  --- Segments ---
  Logical extents 0 to 51199:
    Type                linear
    Physical volume     /dev/sdd       <- Now on sdd, not sdb
    Physical extents    0 to 51199
```

Confirm nothing remains on the source PV:

```bash
sudo pvdisplay /dev/sdb | grep "Allocated PE"
```

Should show `Allocated PE 0`.

## Performance Considerations

pvmove affects I/O performance on both source and destination disks during the migration. For production systems:

- Run migrations during off-peak hours when possible
- Monitor I/O wait: `iostat -x 2` during migration
- Use `ionice` to lower pvmove's I/O priority:

```bash
# Run pvmove with idle I/O priority
sudo ionice -c 3 pvmove /dev/sdb
```

```bash
# Check I/O utilization during migration
iostat -x 2 5
```

For background pvmove:

```bash
# The background pvmove process - find its PID and renice it
sudo pvmove -b /dev/sdb
pgrep -a pvmove
# Get PID, then:
sudo ionice -c 3 -p <PID>
```

## Full Disk Replacement Workflow

Here's the complete workflow for replacing `/dev/sdb` with a new larger disk `/dev/sde`:

```bash
# 1. Initialize the new disk
sudo pvcreate /dev/sde

# 2. Add it to the Volume Group
sudo vgextend data_vg /dev/sde

# 3. Verify free space
sudo pvs

# 4. Migrate all data from old disk to new disk
sudo pvmove /dev/sdb /dev/sde

# 5. Confirm migration complete
sudo pvdisplay /dev/sdb | grep "Allocated PE"
# Should show: Allocated PE   0

# 6. Remove old disk from VG
sudo vgreduce data_vg /dev/sdb

# 7. Clean up LVM metadata from the disk
sudo pvremove /dev/sdb

# 8. Physically remove /dev/sdb
# (or wipe and repurpose)
```

## Troubleshooting

### "No extents available for allocation"

Not enough free space on the destination PV. Either specify a different destination, or add more storage to the VG.

### pvmove seems stuck

Check that the LVM mirror helper is running:

```bash
sudo lvs -a | grep pvmove
sudo dmeventd -d  # Check dmeventd is active
```

Sometimes a system load spike can slow pvmove significantly. Check `iostat` and wait for load to drop.

### "pvmove in progress, use --abort to cancel"

A previous pvmove was interrupted. Either resume it (run pvmove with the same source) or abort it:

```bash
sudo pvmove --abort
```

pvmove is a workhorse for LVM storage management. Used consistently, it lets you keep storage organized and migrate to better hardware without service windows.
