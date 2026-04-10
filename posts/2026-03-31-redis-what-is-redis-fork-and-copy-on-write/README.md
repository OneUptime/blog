# What Is Redis Fork and Copy-on-Write

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Persistence

Description: Understand how Redis uses UNIX fork and copy-on-write for RDB snapshots and AOF rewrites - and the memory implications for production deployments.

---

Redis uses UNIX `fork()` for background persistence operations like BGSAVE and BGREWRITEAOF. The fork-and-copy-on-write (COW) mechanism is elegant but has important memory implications that every Redis operator needs to understand.

## What Is Fork?

`fork()` is a UNIX system call that creates a child process by duplicating the parent process. The child gets an exact copy of the parent's memory space. Redis uses this to take a point-in-time snapshot without stopping the parent from serving requests.

```bash
redis-cli BGSAVE        # Triggers fork for RDB snapshot
redis-cli BGREWRITEAOF  # Triggers fork for AOF compaction
```

Check if a fork is in progress:

```bash
redis-cli INFO persistence | grep "rdb_bgsave_in_progress"
redis-cli INFO stats | grep "latest_fork_usec"
```

## What Is Copy-on-Write?

At the moment of `fork()`, the parent and child share the same physical memory pages. The OS marks them as copy-on-write. When either process writes to a page, the OS creates a separate copy of that page for the writing process.

This means:
- At fork time, memory usage does not immediately double
- As the parent continues serving writes, modified pages are copied
- The total memory overhead depends on the number of memory pages modified during the snapshot (COW copies entire pages, typically 4KB each, even if only one byte changes)

## Memory Impact

If your Redis server is write-heavy during a BGSAVE, many pages will be copied, potentially nearly doubling memory usage. Monitor this:

```bash
redis-cli INFO memory | grep -E "used_memory_human|used_memory_rss_human"
```

`used_memory_rss` (Resident Set Size) reflects actual OS memory usage including COW copies. If it is significantly higher than `used_memory`, COW overhead is significant.

## Fork Time

The fork call itself copies the page table, which is proportional to the memory size. Large datasets can cause fork to take hundreds of milliseconds:

```bash
redis-cli INFO stats | grep "latest_fork_usec"
```

Latency during fork can cause client timeouts. Transparent Huge Pages (THP) worsens COW overhead because each huge page (2MB) is copied in full even if only one byte changes, and THP memory compaction can cause additional latency spikes. Disable THP:

```bash
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag
```

## Diskless Replication as an Alternative

Redis supports diskless replication, which streams the RDB to replicas without writing it to disk, avoiding disk I/O during fork:

```bash
redis-cli CONFIG SET repl-diskless-sync yes
```

This does not eliminate the fork or COW overhead but helps when disk I/O is the bottleneck.

## Planning Memory for Fork

Rule of thumb: ensure free memory of at least 50% of Redis memory usage to accommodate COW overhead during BGSAVE under typical write load. For write-heavy workloads, plan for up to 100% free memory overhead.

## Summary

Redis fork and copy-on-write is the mechanism behind background persistence and replication. At fork time, the child process shares memory pages with the parent. As the parent writes, modified pages are copied separately. This can double memory usage under heavy write load. Monitoring fork time, disabling THP, and maintaining adequate memory headroom are essential for production stability.
