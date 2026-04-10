# How to Configure Redis Persistence for SSDs vs HDDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, Storage, Performance

Description: Tune Redis RDB and AOF persistence settings based on whether your storage is SSD or HDD to maximize durability without unnecessary performance overhead.

---

Redis persistence behavior should be tuned to match your storage hardware. SSDs handle frequent small writes efficiently, while HDDs are better served by batched sequential writes. The wrong configuration can cause unnecessary I/O load or poor durability on either storage type.

## Storage Characteristics for Redis

**SSDs:**
- High IOPS (thousands to millions per second)
- Low latency per operation (0.1-1 ms)
- Handle random writes well
- Write endurance is a consideration for `appendfsync always`

**HDDs:**
- Low IOPS (100-200 per second)
- High latency per operation (5-15 ms)
- Sequential writes are far faster than random writes
- No endurance concern for high write volume

## Recommended Configuration for SSD Storage

SSDs can handle frequent fsyncs and random writes without significant overhead:

```text
# redis.conf - SSD optimized

# RDB: more frequent saves are acceptable
save 300 100
save 60 10000

# AOF: everysec provides good durability without write overhead
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite no

# Compression: disable to reduce CPU overhead (SSD read is fast anyway)
rdbcompression no
rdbchecksum yes

# Auto-rewrite threshold: trigger earlier to keep AOF small
auto-aof-rewrite-percentage 50
auto-aof-rewrite-min-size 32mb
```

## Recommended Configuration for HDD Storage

HDDs are sensitive to random I/O. Reduce save frequency and batch writes:

```text
# redis.conf - HDD optimized

# RDB: less frequent saves to reduce random I/O from fork
save 900 1
save 600 1000

# AOF: skip fsync on rewrite to avoid competing I/O
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite yes

# Compression: enable to write smaller files sequentially
rdbcompression yes
rdbchecksum yes

# Auto-rewrite threshold: less frequent rewrites
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 128mb
```

## Setting the Persistence Directory

Point Redis to the correct storage volume:

```bash
# Check current dir
redis-cli CONFIG GET dir

# Change to SSD mount point
redis-cli CONFIG SET dir /mnt/ssd/redis/

# Or HDD mount
redis-cli CONFIG SET dir /mnt/hdd/redis/
```

Note: In Redis 7.0+, `dir` is a protected configuration parameter. Runtime changes via `CONFIG SET dir` require `enable-protected-configs yes` (or `local`) in `redis.conf`. Otherwise, set `dir` directly in the configuration file and restart Redis.

## Measuring I/O Impact

Monitor I/O during a BGSAVE or AOF rewrite:

```bash
iostat -xm 1 30 | grep -E "Device|sda|nvme"
```

```text
Device  r/s   w/s  rMB/s  wMB/s  await  util
nvme0n1 12.0  485.0  0.15  18.00   0.45   4.2%
sda      8.0  210.0  0.10   7.50   8.30  72.0%
```

High `await` and `util` on an HDD during saves indicates saturation. Reduce save frequency or enable `no-appendfsync-on-rewrite`.

## Handling Latency Spikes on HDD

On HDD systems, AOF fsync can block Redis for milliseconds. Check:

```bash
redis-cli INFO persistence | grep aof_delayed_fsync
redis-cli LATENCY LATEST
```

If `aof_delayed_fsync` is non-zero, the disk cannot keep up. Options:

1. Switch to `appendfsync no` to let the OS buffer writes
2. Use a faster disk or dedicated I/O path for the AOF file
3. Disable AOF and rely on RDB + replica for durability

## Separating RDB and AOF to Different Disks

If you have both HDD and SSD available:

```bash
# Store AOF on SSD (frequent small writes)
# Store RDB on HDD (large sequential writes, less frequent)

# Symlink approach (Redis < 7.0, single AOF file)
ln -s /mnt/ssd/redis/appendonly.aof /var/lib/redis/appendonly.aof

# Redis 7.0+ uses Multi Part AOF in a directory (default: appendonlydir)
ln -s /mnt/ssd/redis/appendonlydir /var/lib/redis/appendonlydir
```

Or configure two Redis instances with different `dir` settings where one handles AOF on SSD.

## NVMe-Specific Optimization

On NVMe storage, you can enable `appendfsync always` for near-zero data loss:

```text
# redis.conf - NVMe storage
appendfsync always
no-appendfsync-on-rewrite no
```

Benchmark to confirm acceptable throughput:

```bash
redis-benchmark -n 100000 -q SET key value
```

## Summary

Tune Redis persistence to your storage hardware: SSDs support frequent saves and fsyncs with low overhead, while HDDs require less frequent saves, enabled `no-appendfsync-on-rewrite`, and higher auto-rewrite thresholds to avoid I/O saturation. Measure `aof_delayed_fsync` and `iostat` utilization during saves to detect storage bottlenecks. NVMe storage unlocks `appendfsync always` for maximum durability at high throughput.
