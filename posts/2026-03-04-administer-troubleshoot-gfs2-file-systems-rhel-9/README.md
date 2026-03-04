# How to Administer and Troubleshoot GFS2 File Systems on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, GFS2, Cluster, Troubleshooting, Storage, Linux

Description: Learn how to perform common GFS2 administration tasks and troubleshoot issues on RHEL 9 cluster file systems.

---

Administering a GFS2 cluster file system on RHEL 9 involves monitoring file system health, managing journals, handling node failures, and resolving performance issues. Unlike local file systems, GFS2 operations must consider the distributed nature of the cluster and the impact on all nodes.

## Checking GFS2 File System Status

View mounted GFS2 file systems:

```bash
mount | grep gfs2
```

Check file system statistics:

```bash
gfs2_tool df /shared
```

View detailed superblock information:

```bash
sudo tunegfs2 -l /dev/shared_vg/gfs2_lv
```

## Monitoring GFS2 Performance

### Checking Lock Contention

Lock contention is the most common GFS2 performance issue. View lock statistics:

```bash
cat /sys/kernel/debug/gfs2/mycluster\:mygfs2/glstats
```

Or use glocktop for a real-time view:

```bash
sudo glocktop
```

High lock wait times indicate contention between nodes.

### Monitoring with DLM Statistics

```bash
cat /sys/kernel/debug/dlm/mygfs2
```

## Adding Journals

To add nodes beyond the original journal count:

```bash
# Add 2 more journals
sudo gfs2_jadd -j 2 /shared
```

Verify:

```bash
sudo tunegfs2 -l /dev/shared_vg/gfs2_lv | grep Journals
```

## Growing a GFS2 File System

First, extend the underlying logical volume:

```bash
sudo lvextend -L +20G /dev/shared_vg/gfs2_lv
```

Then grow the GFS2 file system (online, from one node):

```bash
sudo gfs2_grow /shared
```

Verify:

```bash
df -h /shared
```

## Repairing a GFS2 File System

GFS2 file system checks must be performed while the file system is unmounted from all nodes:

```bash
# Stop the GFS2 resource on all nodes
sudo pcs resource disable gfs2-mount-clone

# Run fsck from one node
sudo fsck.gfs2 -y /dev/shared_vg/gfs2_lv

# Re-enable the resource
sudo pcs resource enable gfs2-mount-clone
```

For a read-only check without unmounting:

```bash
sudo gfs2_tool freeze /shared
# Perform check
sudo gfs2_tool unfreeze /shared
```

## Handling Node Failures

When a node fails, the surviving nodes must recover its journal before I/O can continue. This happens automatically if fencing is configured correctly.

Monitor journal recovery:

```bash
journalctl -u dlm -f
```

Check which journals need recovery:

```bash
sudo tunegfs2 -l /dev/shared_vg/gfs2_lv
```

## Withdrawing a Node

If a node detects inconsistency, it may withdraw from the GFS2 file system. Check for withdrawal:

```bash
dmesg | grep -i "gfs2.*withdraw"
journalctl -k | grep -i withdraw
```

After fixing the issue, remount:

```bash
sudo umount /shared
sudo mount /dev/shared_vg/gfs2_lv /shared
```

Or restart the cluster resource:

```bash
sudo pcs resource cleanup gfs2-mount-clone
```

## Troubleshooting Slow Performance

### Lock Contention

Multiple nodes writing to the same directory causes lock contention. Solutions:

- Use per-node subdirectories
- Spread files across multiple directories
- Reduce the number of nodes with write access

### Journaling Overhead

GFS2 journals every metadata operation. Reduce metadata operations by:

- Using larger files instead of many small files
- Reducing directory size
- Using `noatime` mount option

### DLM Network Latency

DLM communication adds latency. Ensure:

```bash
# Low-latency network between nodes
ping -c 10 node2

# Dedicated network for cluster communication
# Configure in corosync.conf
```

## Freezing and Unfreezing

Freeze the file system for consistent backups:

```bash
# Freeze - blocks all new I/O
sudo gfs2_tool freeze /shared

# Take backup/snapshot
sudo lvcreate -s -L 5G -n backup_snap /dev/shared_vg/gfs2_lv

# Unfreeze
sudo gfs2_tool unfreeze /shared
```

## Quota Management

Enable quotas:

```bash
sudo tunegfs2 -o quota=on /dev/shared_vg/gfs2_lv
```

Set quotas:

```bash
# Set user quota (1 GB limit)
sudo gfs2_quota limit -u testuser -l 1 /shared

# Set group quota
sudo gfs2_quota limit -g developers -l 10 /shared

# View quotas
sudo gfs2_quota list /shared
```

## Monitoring GFS2 with Pacemaker

Check the cluster resource status:

```bash
sudo pcs status resources
```

View resource failures:

```bash
sudo pcs resource failcount show gfs2-mount-clone
```

Clear failures after resolution:

```bash
sudo pcs resource cleanup gfs2-mount-clone
```

## Common Error Messages

**"GFS2: fsid=...: fatal: I/O error"** - Check shared storage connectivity

**"GFS2: fsid=...: withdraw"** - File system detected corruption, node has disconnected

**"DLM: ... not member"** - Node was fenced or lost cluster membership

**"Waiting for journal recovery"** - A node failed and journals are being replayed

## Summary

GFS2 administration on RHEL 9 requires understanding the distributed nature of the file system. Monitor lock contention with glocktop, manage journals as nodes are added, and always ensure fencing is working correctly. Performance tuning focuses on reducing lock contention through workload distribution and proper file system design. Use Pacemaker to manage the GFS2 resource lifecycle and handle node failures automatically.
