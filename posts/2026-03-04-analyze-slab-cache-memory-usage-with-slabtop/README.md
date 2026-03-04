# How to Analyze Slab Cache Memory Usage with slabtop on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Memory, Kernel, Linux

Description: Learn how to analyze Slab Cache Memory Usage with slabtop on RHEL with step-by-step instructions, configuration examples, and best practices.

---

The slab cache is a kernel memory allocation mechanism that maintains pools of frequently used objects (like inodes, dentries, and buffer heads) for fast allocation and deallocation. slabtop shows real-time slab cache usage, helping you identify kernel memory consumption patterns.

## Prerequisites

- RHEL
- Root or sudo access

## Step 1: View Slab Cache with slabtop

```bash
sudo slabtop
```

This shows a top-like view of slab caches sorted by size. Key columns:
- `OBJS` - Number of objects
- `ACTIVE` - Active objects
- `USE` - Utilization percentage
- `OBJ SIZE` - Size of each object
- `CACHE SIZE` - Total cache size

Press `q` to quit.

## Step 2: One-Shot Slab Report

```bash
sudo slabtop -o | head -30
```

The `-o` flag prints once and exits.

## Step 3: Sort by Different Criteria

```bash
sudo slabtop -s c    # Sort by cache size
sudo slabtop -s a    # Sort by active objects
sudo slabtop -s o    # Sort by number of objects
```

## Step 4: View Detailed Slab Info

```bash
cat /proc/slabinfo | head -20
```

Or for a specific cache:

```bash
grep dentry /proc/slabinfo
```

## Step 5: Understand Common Slab Caches

| Cache | Description |
|-------|-------------|
| `dentry` | Directory entry cache |
| `inode_cache` | Inode cache |
| `ext4_inode_cache` | ext4 filesystem inodes |
| `buffer_head` | Block I/O buffer headers |
| `radix_tree_node` | Page cache tree nodes |
| `kmalloc-*` | General kernel allocations |

## Step 6: Check Total Slab Memory

```bash
grep Slab /proc/meminfo
```

```
Slab:            512000 kB
SReclaimable:    400000 kB
SUnreclaim:      112000 kB
```

- `SReclaimable` - Can be freed under memory pressure (dentries, inodes)
- `SUnreclaim` - Cannot be freed (kernel data structures in use)

## Step 7: Drop Slab Caches

If reclaimable slab caches are consuming too much memory:

```bash
echo 2 | sudo tee /proc/sys/vm/drop_caches
```

Values:
- `1` - Free page cache
- `2` - Free dentries and inodes
- `3` - Free both

This is safe but temporary. The caches will rebuild as the system runs.

## Step 8: Tune Vfs Cache Pressure

Control how aggressively the kernel reclaims slab caches:

```bash
cat /proc/sys/vm/vfs_cache_pressure
```

Default is 100. Higher values reclaim more aggressively:

```bash
sudo sysctl -w vm.vfs_cache_pressure=150
```

Lower values keep caches longer:

```bash
sudo sysctl -w vm.vfs_cache_pressure=50
```

## Conclusion

slabtop and /proc/slabinfo provide visibility into kernel memory allocation on RHEL. Large slab caches for dentries and inodes are normal on file servers. If slab memory grows excessively, tune vfs_cache_pressure or investigate which subsystem is creating the allocations.
