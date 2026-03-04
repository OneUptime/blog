# How to Troubleshoot VDO Volume Recovery on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, Troubleshooting, Recovery, Storage, Linux

Description: Learn how to troubleshoot and recover VDO volumes on RHEL 9, including handling read-only volumes, corrupted indexes, degraded performance, and data recovery procedures.

---

VDO volumes can encounter issues due to hardware failures, unclean shutdowns, or resource exhaustion. Understanding how to diagnose and recover from these problems is essential for maintaining reliable storage. This guide covers common VDO issues and their resolution on RHEL 9.

## Prerequisites

- A RHEL 9 system with root or sudo access
- Familiarity with LVM and VDO concepts
- The `lvm2` and `kmod-kvdo` packages installed

## Issue 1: VDO Volume in Read-Only Mode

### Symptoms

Writes fail with I/O errors. Applications report "Read-only file system."

### Diagnosis

```bash
sudo lvs -o name,vdo_operating_mode vg_vdo
```

If the operating mode shows `read-only`, the volume has entered a protected state.

Check the system journal:

```bash
sudo journalctl -k | grep -i vdo
```

### Common Causes

1. **Physical space exhaustion**: The VDO volume ran out of physical blocks
2. **Metadata corruption**: An unclean shutdown corrupted VDO metadata
3. **Underlying device error**: The physical disk reported I/O errors

### Recovery

For physical space exhaustion, add more storage:

```bash
# Add a new disk
sudo pvcreate /dev/sdc
sudo vgextend vg_vdo /dev/sdc

# Extend the VDO volume
sudo lvextend --size +100G vg_vdo/lv_vdo
```

After adding space, the volume should return to read-write mode. If not:

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

Remount the filesystem:

```bash
sudo umount /vdo-data
sudo mount /dev/vg_vdo/lv_vdo /vdo-data
```

## Issue 2: Corrupted UDS Index

### Symptoms

- Deduplication effectiveness drops suddenly
- VDO index state shows `error`
- Journal messages about index errors

### Diagnosis

```bash
sudo lvs -o name,vdo_index_state vg_vdo
```

```bash
sudo journalctl -k | grep -i "uds\|index"
```

### Recovery

Rebuild the UDS index:

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange --rebuild-full vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

The `--rebuild-full` option creates a new, empty deduplication index. Existing data is not affected, but deduplication of already-stored data will not occur until the same blocks are written again.

After rebuilding, verify:

```bash
sudo lvs -o name,vdo_index_state vg_vdo
```

The index state should show `online`.

## Issue 3: VDO Volume Not Activating

### Symptoms

```
ERROR: Cannot activate VDO volume
```

### Diagnosis

```bash
sudo lvs -o name,lv_attr,vdo_operating_mode vg_vdo
sudo journalctl -u lvm2-pvscan@* --since "1 hour ago"
```

### Recovery

Try manual activation:

```bash
sudo lvchange -ay vg_vdo/lv_vdo
```

If that fails, check for VDO kernel module:

```bash
lsmod | grep kvdo
sudo modprobe kvdo
sudo lvchange -ay vg_vdo/lv_vdo
```

If the module is not available:

```bash
sudo dnf install kmod-kvdo -y
sudo modprobe kvdo
```

## Issue 4: Degraded Performance

### Symptoms

I/O operations are significantly slower than expected.

### Diagnosis

Check VDO statistics:

```bash
sudo vdostats --verbose /dev/mapper/vg_vdo-vpool
```

Look for:
- High `dedupe advice timeouts` (UDS index is overloaded)
- High `journal blocks committed` relative to data (write amplification)
- Low `saving percent` (minimal deduplication happening)

Check system resources:

```bash
# CPU usage
top -H -p $(pgrep -d',' kvdo)

# Memory usage
free -h

# I/O latency
iostat -x 1
```

### Recovery

Increase VDO resources:

```bash
# More CPU threads
sudo lvchange --vdosettings 'cpu_threads=4,bio_threads=4' vg_vdo/lv_vdo

# Larger block map cache
sudo lvchange --vdosettings 'block_map_cache_size_mb=512' vg_vdo/lv_vdo
```

If deduplication is causing overhead without benefit:

```bash
sudo lvchange --deduplication n vg_vdo/lv_vdo
```

## Issue 5: Filesystem Corruption on VDO Volume

### Symptoms

XFS errors, mount failures, or data inconsistencies.

### Diagnosis

```bash
sudo umount /vdo-data
sudo xfs_repair -n /dev/vg_vdo/lv_vdo
```

### Recovery

Repair the filesystem:

```bash
sudo xfs_repair /dev/vg_vdo/lv_vdo
```

If the log is dirty:

```bash
sudo xfs_repair -L /dev/vg_vdo/lv_vdo
```

After repair:

```bash
sudo mount /dev/vg_vdo/lv_vdo /vdo-data
```

## Issue 6: VDO Volume After Unclean Shutdown

### Symptoms

After a power loss or system crash, VDO volumes may need recovery.

### Diagnosis

```bash
sudo lvs -o name,vdo_operating_mode vg_vdo
sudo journalctl -b | grep -i vdo
```

### Recovery

VDO automatically recovers its metadata journal on activation:

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

Check the operating mode:

```bash
sudo lvs -o name,vdo_operating_mode vg_vdo
```

If it shows `recovering`, wait for recovery to complete. Monitor:

```bash
sudo journalctl -f | grep -i vdo
```

## Issue 7: Cannot Remove or Resize VDO Volume

### Symptoms

LVM operations fail with VDO-related errors.

### Diagnosis

Check if the volume is mounted:

```bash
mount | grep vg_vdo
```

Check device mapper state:

```bash
sudo dmsetup ls | grep vdo
sudo dmsetup status
```

### Recovery

Unmount and deactivate properly:

```bash
sudo umount /vdo-data
sudo lvchange -an vg_vdo/lv_vdo
```

If that fails:

```bash
sudo fuser -mv /vdo-data
# Kill processes if necessary
sudo umount -f /vdo-data
sudo lvchange -an vg_vdo/lv_vdo
```

## Issue 8: VDO Metadata Full

### Symptoms

VDO reports metadata space exhaustion even though data space is available.

### Diagnosis

```bash
sudo vdostats --verbose /dev/mapper/vg_vdo-vpool | grep -i "overhead\|metadata"
```

### Recovery

Grow the physical size of the VDO volume, which also increases metadata capacity:

```bash
sudo lvextend --size +50G vg_vdo/lv_vdo
```

## Collecting Diagnostic Information

When contacting support, gather this information:

```bash
# System info
cat /etc/redhat-release
uname -r
rpm -q lvm2 kmod-kvdo

# VDO state
sudo lvs -a -o +vdo_operating_mode,vdo_compression_state,vdo_index_state
sudo vdostats --all

# LVM state
sudo pvs
sudo vgs
sudo lvs -a

# Journal entries
sudo journalctl -k | grep -i vdo > /tmp/vdo-kernel.log
sudo journalctl -u lvm2* > /tmp/vdo-lvm.log

# Device mapper state
sudo dmsetup ls
sudo dmsetup table
```

## Prevention

- **Monitor physical usage**: Set alerts before volumes fill up.
- **Use UPS**: Prevent unclean shutdowns that can damage metadata.
- **Regular backups**: VDO recovery does not guarantee all data is recoverable.
- **Keep packages updated**: VDO bug fixes are delivered through package updates.
- **Test recovery procedures**: Practice recovery in a test environment.

## Conclusion

Most VDO issues on RHEL 9 stem from physical space exhaustion, unclean shutdowns, or resource constraints. The recovery procedures are well-defined: add space for exhaustion, rebuild the index for corruption, and retune settings for performance issues. By maintaining proper monitoring and keeping backups, you can minimize the impact of VDO problems and recover quickly when they occur.
