# How to Administer and Troubleshoot GFS2 File Systems on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GFS2, Cluster, Troubleshooting, Storage, Linux

Description: Learn how to administer, maintain, and troubleshoot GFS2 cluster file systems on RHEL, including adding journals, checking filesystem health, and resolving common issues.

---

Managing GFS2 file systems requires cluster-aware operations. Many standard Linux filesystem tools do not apply directly to GFS2. This guide covers day-to-day administration and common troubleshooting scenarios.

## Checking GFS2 Status

```bash
# View mounted GFS2 filesystems and their usage
mount | grep gfs2
df -h /mnt/gfs2

# Check GFS2-specific information
sudo gfs2_tool df /mnt/gfs2

# View lock information
sudo dlm_tool ls
sudo dlm_tool lockdebug mycluster:gfs2data
```

## Adding Journals to a GFS2 File System

When adding a new node to the cluster, you need an additional journal:

```bash
# Add a journal to the GFS2 filesystem (run from one node)
sudo gfs2_jadd -j 1 /mnt/gfs2

# Verify the journal count
sudo tunegfs2 -l /dev/vg_shared/lv_gfs2 | grep journals
```

## Growing a GFS2 File System

```bash
# First extend the underlying LV
sudo lvextend -L +20G /dev/vg_shared/lv_gfs2

# Then grow the GFS2 filesystem (online, no unmount needed)
sudo gfs2_grow /mnt/gfs2

# Verify the new size
df -h /mnt/gfs2
```

## Running Filesystem Checks

GFS2 does not support online fsck. You must unmount the filesystem on all nodes first:

```bash
# Stop the filesystem resource on all nodes
sudo pcs resource disable gfs2-fs-clone

# Run the filesystem check
sudo fsck.gfs2 -y /dev/vg_shared/lv_gfs2

# Re-enable the resource
sudo pcs resource enable gfs2-fs-clone
```

## Troubleshooting Slow Performance

```bash
# Check for lock contention (common cause of GFS2 slowness)
cat /sys/kernel/debug/gfs2/mycluster:gfs2data/glstats | head -20

# Look for processes stuck waiting on GFS2 locks
cat /sys/kernel/debug/gfs2/mycluster:gfs2data/glocks | grep -c "Waiting"

# Check DLM status
sudo dlm_tool status
```

## Troubleshooting Mount Failures

```bash
# Check if DLM is running
sudo systemctl status dlm

# Verify the cluster is healthy
sudo pcs status

# Check kernel messages for GFS2 errors
sudo dmesg | grep -i gfs2

# Ensure the lock table name matches across all nodes
sudo tunegfs2 -l /dev/vg_shared/lv_gfs2 | grep "Lock Table"
```

## Withdrawing and Recovering a Node

If a node's GFS2 instance withdraws (enters read-only due to I/O errors):

```bash
# Check for withdraw messages
sudo dmesg | grep "GFS2.*withdraw"

# The node needs to be fenced or the filesystem unmounted and remounted
sudo umount /mnt/gfs2
sudo mount /dev/vg_shared/lv_gfs2 /mnt/gfs2
```

GFS2 performance degrades with heavy file creation in the same directory from multiple nodes. Distribute writes across subdirectories when possible to reduce lock contention.
