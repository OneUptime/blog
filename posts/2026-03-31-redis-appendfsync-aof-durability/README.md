# How to Configure Redis appendfsync for AOF Durability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AOF, Persistence, Durability

Description: Configure the appendfsync option in Redis to control how often AOF data is flushed to disk, choosing between maximum durability and maximum performance.

---

The Append-Only File (AOF) persistence mode in Redis logs every write command so the dataset can be reconstructed on restart. The `appendfsync` directive controls how often Redis calls `fsync()` to flush the AOF buffer to disk.

## The Three appendfsync Options

```text
# redis.conf
appendfsync always    # fsync after every write command
appendfsync everysec  # fsync once per second (default)
appendfsync no        # let the OS decide when to flush
```

### always

Every write command is immediately fsynced to disk before the client receives a reply. This provides the strongest durability guarantee - you lose at most one command on a crash - but at a severe performance cost. Throughput drops to the speed of your disk's fsync operation, typically a few hundred writes per second on HDDs or a few thousand on SSDs.

### everysec (Default)

Redis writes to the AOF buffer on every command and fsyncs once per second in the background. You lose at most one second of data on a crash. This is the recommended setting for most production workloads, balancing durability with performance.

### no

Redis writes to the AOF buffer but never calls fsync explicitly. The OS flushes data to disk on its own schedule (typically every 30 seconds on Linux). Offers the best write performance but risks losing up to 30+ seconds of data on a crash.

## Setting appendfsync

Enable AOF first, then set the sync policy:

```text
# redis.conf
appendonly yes
appendfsync everysec
```

Change at runtime without restart:

```bash
redis-cli CONFIG SET appendfsync everysec
redis-cli CONFIG GET appendfsync
```

## Measuring the Impact

Benchmark different settings to see the throughput difference on your hardware:

```bash
# Benchmark with everysec
redis-benchmark -n 100000 -q SET key value

# Change to always and re-benchmark
redis-cli CONFIG SET appendfsync always
redis-benchmark -n 100000 -q SET key value
```

Typical results on a standard SSD:

```text
appendfsync no:       ~200,000 ops/sec
appendfsync everysec: ~100,000 ops/sec
appendfsync always:   ~2,000-5,000 ops/sec
```

## Checking AOF Status

Verify AOF is working correctly:

```bash
redis-cli INFO persistence
```

```text
aof_enabled:1
aof_current_size:524288
aof_base_size:131072
aof_pending_rewrite:0
aof_buffer_length:0
aof_rewrite_buffer_length:0
aof_pending_bio_fsync:0
aof_delayed_fsync:0
```

A high `aof_delayed_fsync` value indicates the background fsync is lagging. This often happens when `no-appendfsync-on-rewrite yes` is set and an AOF rewrite is in progress.

## Interplay with no-appendfsync-on-rewrite

During an AOF rewrite, setting `no-appendfsync-on-rewrite yes` suspends fsync calls to reduce I/O contention:

```text
# redis.conf
no-appendfsync-on-rewrite yes
```

This can lose data if a crash occurs during the rewrite. For critical data, keep it set to `no` (the default):

```text
no-appendfsync-on-rewrite no
```

## Choosing the Right Setting

- `always` - Financial transactions, payment records, anything where zero data loss is required and throughput is not critical
- `everysec` - Most production applications, provides good durability with minimal performance impact
- `no` - High-throughput caching where the AOF file serves only as a warm-up aid and data loss is acceptable

## Summary

`appendfsync` controls the AOF flush frequency in Redis. Use `everysec` for the best balance between durability and performance in production. Use `always` only when you require the strongest possible durability guarantee and can accept reduced throughput. Monitor `aof_delayed_fsync` in `INFO persistence` to detect when fsync is falling behind under load.
