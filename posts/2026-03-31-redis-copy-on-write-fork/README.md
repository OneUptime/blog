# How Redis Copy-on-Write Works During Fork

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Internal, Fork, Persistence, Memory

Description: Understand how Redis uses OS copy-on-write semantics during BGSAVE and BGREWRITEAOF to create point-in-time snapshots without duplicating memory.

---

When Redis saves an RDB snapshot or rewrites the AOF file, it calls `fork()` to create a child process. The child sees the entire dataset but Redis relies on the operating system's copy-on-write (COW) mechanism to avoid immediately doubling memory usage.

## What Is Copy-on-Write?

After a `fork()`, the parent and child share the same physical memory pages. The OS marks all shared pages as read-only. When either process writes to a page, the OS:

1. Intercepts the write (page fault)
2. Copies the page for the writing process
3. Updates the page table to point each process to its own copy
4. Allows the write to proceed

The child sees a consistent snapshot of the data at the moment of fork, while the parent continues serving writes on its own private copies of modified pages.

## Redis Fork Calls

```text
BGSAVE          --> fork() --> child writes RDB file
BGREWRITEAOF    --> fork() --> child writes new AOF
Replication     --> fork() --> child sends RDB to replica
```

## Memory Behavior During Save

Before fork: parent uses 1GB RAM.

During fork while parent is busy:
- Child reads all pages to serialize data: pages stay shared (no copy)
- Parent writes a key: the page containing that key gets copied

```bash
redis-cli INFO | grep -E "used_memory_rss|rdb_changes_since_last_save"
```

In the worst case (parent modifies every page during save), memory can temporarily double.

## Monitoring COW Impact

```bash
redis-cli INFO persistence
# rdb_last_cow_size:4194304   (bytes copied by COW during last save)
# aof_last_cow_size:1048576
```

High `rdb_last_cow_size` means your parent was very write-active during the snapshot.

## Reducing COW Overhead

**Disable automatic saves and trigger them manually during low-write windows:**

```text
# redis.conf - disable automatic RDB snapshots
save ""
# Then use a cron job to run BGSAVE during quiet periods (e.g., 2am)
```

**Pause clients briefly before a manual save to reduce writes during the snapshot:**

```bash
CLIENT PAUSE 5000
BGSAVE
```

**Tune huge pages**: transparent huge pages (THP) increase COW granularity from 4KB to 2MB, causing much larger copies:

```bash
echo never > /sys/kernel/mm/transparent_hugepage/enabled
```

This is the single most impactful tuning for COW memory spikes.

## Why Fork Can Be Slow

On large datasets, `fork()` itself copies the page table, not the data. For a Redis instance using 50GB of RAM, the page table can be hundreds of megabytes:

```text
50GB dataset / 4KB page size = ~12.5 million pages
Each page table entry ~8 bytes = ~100MB page table to copy
```

This fork latency shows up as a pause in `redis-cli --latency`.

## Checking Fork Latency

```bash
redis-cli INFO stats | grep latest_fork_usec
# latest_fork_usec:3421   (3.4ms for last fork)
```

Values above 10ms are worth investigating on production systems.

## Summary

Redis copy-on-write lets a child process read a frozen snapshot of memory while the parent continues handling writes. The OS copies only the pages the parent modifies after the fork, keeping memory usage manageable. Disabling transparent huge pages and scheduling saves during quiet periods are the two most effective ways to reduce COW memory overhead.
