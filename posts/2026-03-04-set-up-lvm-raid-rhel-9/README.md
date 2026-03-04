# How to Set Up LVM RAID on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, LVM, RAID, Storage, Linux

Description: Learn how to create and manage LVM RAID volumes on RHEL, covering RAID 1, RAID 5, RAID 6, and RAID 10 configurations for data protection and performance.

---

LVM RAID combines the flexibility of logical volume management with the data protection of RAID technology. On RHEL, LVM supports RAID levels 1, 4, 5, 6, and 10, using the MD (multiple devices) RAID subsystem underneath. This guide covers how to set up and manage different LVM RAID configurations.

## Prerequisites

- A RHEL system with root or sudo access
- Multiple physical disks (the number depends on the RAID level)
- The `lvm2` package installed

## Understanding LVM RAID Levels

| RAID Level | Minimum Disks | Description |
|-----------|--------------|-------------|
| RAID 1    | 2            | Mirroring - data is duplicated on each disk |
| RAID 4    | 3            | Striping with a dedicated parity disk |
| RAID 5    | 3            | Striping with distributed parity |
| RAID 6    | 5            | Striping with double distributed parity |
| RAID 10   | 4            | Mirrored stripes combining performance and redundancy |

## Step 1: Prepare Physical Volumes

Initialize your disks:

```bash
sudo pvcreate /dev/sdb /dev/sdc /dev/sdd /dev/sde
```

Create a volume group:

```bash
sudo vgcreate vg_raid /dev/sdb /dev/sdc /dev/sdd /dev/sde
```

Verify:

```bash
sudo pvs
sudo vgdisplay vg_raid
```

## Step 2: Create a RAID 1 Volume

RAID 1 mirrors data across two or more disks:

```bash
sudo lvcreate --type raid1 -m 1 -L 20G -n lv_raid1 vg_raid
```

The `-m 1` flag specifies one mirror (two copies total). Verify:

```bash
sudo lvs -a -o name,segtype,devices,sync_percent vg_raid
```

## Step 3: Create a RAID 5 Volume

RAID 5 stripes data with distributed parity, requiring at least three disks:

```bash
sudo lvcreate --type raid5 -i 3 -L 30G -n lv_raid5 vg_raid
```

The `-i 3` specifies three stripe data devices. LVM automatically adds a parity device, so four disks are used in total.

Monitor the initial synchronization:

```bash
sudo lvs -o name,sync_percent vg_raid/lv_raid5
```

## Step 4: Create a RAID 6 Volume

RAID 6 provides double parity, surviving two simultaneous disk failures:

```bash
sudo lvcreate --type raid6 -i 3 -L 20G -n lv_raid6 vg_raid
```

With `-i 3`, this uses three data devices plus two parity devices (five disks total). You need at least five physical volumes.

## Step 5: Create a RAID 10 Volume

RAID 10 combines mirroring and striping:

```bash
sudo lvcreate --type raid10 -i 2 -m 1 -L 20G -n lv_raid10 vg_raid
```

This creates two stripes, each mirrored once, using four disks.

## Step 6: Format and Mount

Format the RAID logical volume:

```bash
sudo mkfs.xfs /dev/vg_raid/lv_raid5
sudo mkdir -p /data
sudo mount /dev/vg_raid/lv_raid5 /data
```

Add to `/etc/fstab`:

```bash
echo '/dev/vg_raid/lv_raid5 /data xfs defaults 0 0' | sudo tee -a /etc/fstab
```

## Step 7: Monitor RAID Health

Check the status of all RAID volumes:

```bash
sudo lvs -a -o lv_name,segtype,sync_percent,lv_health_status vg_raid
```

The `lv_health_status` field shows:
- Empty string: healthy
- `partial`: one or more devices missing
- `refresh needed`: metadata needs refresh
- `mismatches exist`: data inconsistency detected

For detailed information about each RAID image:

```bash
sudo lvs -a -o name,devices,lv_health_status vg_raid
```

## Step 8: Handle RAID Failures

### Replace a Failed Device

When a disk fails in a RAID volume:

```bash
# Check current state
sudo lvs -a -o name,devices,lv_health_status vg_raid

# Add a replacement disk
sudo pvcreate /dev/sdf
sudo vgextend vg_raid /dev/sdf

# Repair the RAID
sudo lvconvert --repair vg_raid/lv_raid5
```

### Remove a Failed Device After Repair

```bash
sudo vgreduce --removemissing vg_raid
```

## Step 9: Scrub RAID for Consistency

Periodically check data integrity by scrubbing the RAID:

```bash
sudo lvchange --syncaction check vg_raid/lv_raid5
```

Monitor scrub progress:

```bash
sudo lvs -o name,sync_percent,raid_sync_action vg_raid/lv_raid5
```

To repair any mismatches found:

```bash
sudo lvchange --syncaction repair vg_raid/lv_raid5
```

## Step 10: Convert Between RAID Levels

LVM supports online conversion between some RAID levels. Convert RAID 1 to RAID 5:

```bash
sudo lvconvert --type raid5 vg_raid/lv_raid1
```

Convert a linear volume to RAID 1:

```bash
sudo lvconvert --type raid1 -m 1 vg_raid/lv_linear
```

Not all conversions are supported directly. Check the `lvconvert` man page for supported transitions.

## Step 11: Extend a RAID Volume

Extending RAID volumes works similarly to regular volumes:

```bash
sudo lvextend -L +10G vg_raid/lv_raid5
sudo xfs_growfs /data
```

Ensure sufficient free space exists on enough physical volumes to maintain the RAID geometry.

## Performance Considerations

- **RAID 1**: Best read performance (reads from all mirrors), write performance similar to single disk
- **RAID 5**: Good read performance through striping, write penalty due to parity calculation
- **RAID 6**: Similar to RAID 5 but with additional write penalty for double parity
- **RAID 10**: Best overall performance for mixed workloads, uses more disk space

Choose the stripe size based on your workload:

```bash
sudo lvcreate --type raid5 -i 3 -I 64K -L 30G -n lv_raid5_tuned vg_raid
```

## Conclusion

LVM RAID on RHEL provides a flexible and powerful way to protect your data while maintaining the management advantages of LVM. Whether you need simple mirroring with RAID 1, space-efficient parity protection with RAID 5 or 6, or the combined performance and redundancy of RAID 10, LVM RAID delivers enterprise-grade storage protection with straightforward management commands.
