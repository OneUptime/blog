# How to Configure Redis auto-aof-rewrite Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AOF, Configuration, Performance

Description: Configure auto-aof-rewrite-percentage and auto-aof-rewrite-min-size to automatically compact your AOF file and keep it from growing unbounded.

---

As Redis appends write commands to the AOF file, it grows over time. Rewrites compact the file by replacing the full command history with the minimal set of commands needed to reconstruct the current dataset. Redis can trigger this automatically using the `auto-aof-rewrite-percentage` and `auto-aof-rewrite-min-size` directives.

## How Auto-Rewrite Works

Redis tracks the AOF file size when it last performed a rewrite. When the current size grows by more than `auto-aof-rewrite-percentage` percent compared to that baseline, AND the file is larger than `auto-aof-rewrite-min-size`, Redis triggers a background rewrite.

## Default Configuration

```text
# redis.conf
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

With these defaults, Redis rewrites when:

- The AOF file has grown 100% (doubled) since the last rewrite, AND
- The file is at least 64 MB

## Tuning the Settings

For a dataset that changes frequently and you want more aggressive compaction:

```text
# Rewrite when file grows 50% and is at least 32 MB
auto-aof-rewrite-percentage 50
auto-aof-rewrite-min-size 32mb
```

For a large dataset where rewrites are expensive and you want them less frequent:

```text
# Rewrite when file doubles and is at least 256 MB
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 256mb
```

Change at runtime:

```bash
redis-cli CONFIG SET auto-aof-rewrite-percentage 75
redis-cli CONFIG SET auto-aof-rewrite-min-size 128mb
redis-cli CONFIG GET auto-aof-rewrite-percentage
redis-cli CONFIG GET auto-aof-rewrite-min-size
```

## Disabling Auto-Rewrite

To prevent automatic rewrites (for example, to control timing manually):

```bash
redis-cli CONFIG SET auto-aof-rewrite-percentage 0
```

Setting the percentage to 0 disables the auto-rewrite trigger. You can then trigger rewrites manually at off-peak times:

```bash
redis-cli BGREWRITEAOF
```

## Monitoring Rewrite Status

Check current AOF file sizes and rewrite status:

```bash
redis-cli INFO persistence
```

```text
aof_enabled:1
aof_current_size:134217728
aof_base_size:67108864
aof_rewrite_scheduled:0
aof_rewrite_buffer_length:0
```

Calculate the current growth ratio manually:

- `aof_current_size` = 128 MB
- `aof_base_size` = 64 MB
- Growth ratio = (128 - 64) / 64 * 100 = 100%

With `auto-aof-rewrite-percentage 100`, a rewrite would trigger at this point.

## Impact on Performance

During a background rewrite, Redis forks a child process. The child writes a new AOF file while the parent continues serving requests. New write commands during the rewrite are buffered in `aof_rewrite_buffer_length`. When the child completes, the buffer is appended and the file atomically replaces the old one.

Monitor memory usage during rewrites:

```bash
redis-cli INFO memory | grep rss
watch -n1 "redis-cli INFO memory | grep rss_human"
```

Use `no-appendfsync-on-rewrite yes` to reduce I/O pressure during rewrites at the cost of slightly reduced durability:

```text
# redis.conf
no-appendfsync-on-rewrite yes
```

## Summary

`auto-aof-rewrite-percentage` and `auto-aof-rewrite-min-size` together determine when Redis automatically compacts the AOF file. Lower the percentage for more frequent compaction; raise the minimum size to avoid rewrites on small files. Set the percentage to 0 to disable auto-rewrite and trigger `BGREWRITEAOF` manually during scheduled maintenance windows.
