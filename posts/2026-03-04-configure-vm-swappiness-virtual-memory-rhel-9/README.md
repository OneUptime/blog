# How to Configure vm.swappiness and Other Virtual Memory Parameters on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Memory, Vm.swappiness, Virtual Memory, Performance, Linux, Tuning

Description: Learn how to configure vm.swappiness and other virtual memory parameters on RHEL to optimize memory behavior for your workload.

---

Virtual memory parameters on RHEL control how the kernel manages memory pages, swapping, and writeback behavior. Tuning these parameters can improve performance for databases, web servers, and memory-intensive applications.

## Prerequisites

- A RHEL system
- Root or sudo access

## Understanding vm.swappiness

The `vm.swappiness` parameter controls how aggressively the kernel swaps memory pages to disk. It accepts values from 0 to 200:

- **0** - Kernel avoids swapping as much as possible (still swaps to prevent OOM)
- **10** - Minimal swapping, good for servers with plenty of RAM
- **30** - Default on some systems
- **60** - Default on RHEL
- **100** - Kernel swaps aggressively

Check the current value:

```bash
sysctl vm.swappiness
```

## Setting vm.swappiness

Set temporarily:

```bash
sudo sysctl -w vm.swappiness=10
```

Set permanently:

```bash
echo "vm.swappiness=10" | sudo tee /etc/sysctl.d/swappiness.conf
sudo sysctl -p /etc/sysctl.d/swappiness.conf
```

### Recommended Values by Workload

- **Database servers** - `vm.swappiness=1` or `vm.swappiness=10`
- **Web servers** - `vm.swappiness=10`
- **General purpose** - `vm.swappiness=30`
- **Desktop** - `vm.swappiness=60` (default)

## Configuring vm.dirty_ratio

Controls the maximum percentage of system memory that can hold dirty (modified, not yet written) pages before the kernel forces synchronous writeback:

```bash
# View current value
sysctl vm.dirty_ratio

# Set to 15% (good for servers)
sudo sysctl -w vm.dirty_ratio=15
```

Lower values reduce the risk of data loss on crash but may reduce write performance.

## Configuring vm.dirty_background_ratio

Controls when background writeback begins:

```bash
# View current value
sysctl vm.dirty_background_ratio

# Set to 5%
sudo sysctl -w vm.dirty_background_ratio=5
```

This means the kernel starts writing dirty pages in the background when they reach 5% of memory.

## Configuring vm.dirty_expire_centisecs

How long dirty pages can stay in memory before they must be written (in centiseconds):

```bash
# Default is 3000 (30 seconds)
sysctl vm.dirty_expire_centisecs

# Set to 15 seconds
sudo sysctl -w vm.dirty_expire_centisecs=1500
```

## Configuring vm.dirty_writeback_centisecs

How often the kernel writeback thread wakes up:

```bash
# Default is 500 (5 seconds)
sysctl vm.dirty_writeback_centisecs

# Set to 3 seconds
sudo sysctl -w vm.dirty_writeback_centisecs=300
```

## Configuring vm.overcommit_memory

Controls the kernel's memory overcommit behavior:

- **0** - Heuristic overcommit (default)
- **1** - Always overcommit (never deny malloc)
- **2** - Strict overcommit (deny if total > swap + ratio*RAM)

```bash
sysctl vm.overcommit_memory
sudo sysctl -w vm.overcommit_memory=2
```

For strict mode, set the overcommit ratio:

```bash
# Allow commits up to swap + 80% of RAM
sudo sysctl -w vm.overcommit_ratio=80
```

## Configuring vm.min_free_kbytes

Minimum amount of free memory the kernel keeps:

```bash
# View current value
sysctl vm.min_free_kbytes

# Set to 128MB
sudo sysctl -w vm.min_free_kbytes=131072
```

Increase this on systems with high interrupt rates or DMA requirements.

## Configuring vm.vfs_cache_pressure

Controls how aggressively the kernel reclaims dentry and inode caches:

```bash
# Default is 100
sysctl vm.vfs_cache_pressure

# Reduce to keep more filesystem metadata in cache
sudo sysctl -w vm.vfs_cache_pressure=50

# Increase to reclaim caches more aggressively
sudo sysctl -w vm.vfs_cache_pressure=200
```

## Making All Settings Persistent

Save all virtual memory tuning:

```bash
cat << 'SYSCTL' | sudo tee /etc/sysctl.d/vm-tuning.conf
vm.swappiness=10
vm.dirty_ratio=15
vm.dirty_background_ratio=5
vm.dirty_expire_centisecs=1500
vm.dirty_writeback_centisecs=300
vm.vfs_cache_pressure=50
vm.min_free_kbytes=131072
SYSCTL
sudo sysctl -p /etc/sysctl.d/vm-tuning.conf
```

## Monitoring Virtual Memory

Watch virtual memory statistics:

```bash
vmstat 2 10
```

Key columns:

- **si** - Swap in (pages/s)
- **so** - Swap out (pages/s)
- **bi** - Block in (reads)
- **bo** - Block out (writes)
- **wa** - I/O wait percentage

If si and so are consistently high, the system needs more RAM or lower swappiness.

## Conclusion

Tuning virtual memory parameters on RHEL lets you balance performance and data safety. Start with vm.swappiness to control swap behavior, then adjust dirty page settings for your write patterns. Monitor with vmstat to validate your changes.
