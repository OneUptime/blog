# How to Troubleshoot Redis OOM (Out of Memory) Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Out of Memory, Troubleshooting, Memory Management, OOM

Description: Diagnose and resolve Redis OOM (Out of Memory) errors by understanding maxmemory policies, memory usage patterns, and eviction configuration.

---

## Understanding Redis OOM Errors

When Redis hits its `maxmemory` limit it either evicts keys or returns an error, depending on the `maxmemory-policy` setting. The most visible error is:

```text
OOM command not allowed when used memory > 'maxmemory'.
```

You may also see the Linux OOM killer terminate the Redis process if `maxmemory` is not set and the system runs out of physical RAM.

## Step 1 - Check Current Memory Usage

```bash
redis-cli INFO memory | grep -E 'used_memory_human|used_memory_peak_human|maxmemory_human|mem_fragmentation_ratio|maxmemory_policy'
```

Example output:

```text
used_memory_human:1.50G
used_memory_peak_human:2.10G
maxmemory_human:2.00G
mem_fragmentation_ratio:1.23
maxmemory_policy:noeviction
```

`maxmemory_policy:noeviction` means Redis returns OOM errors instead of evicting keys when the limit is reached.

## Step 2 - Change the Eviction Policy

If you want Redis to automatically free memory instead of returning errors, set an eviction policy:

```bash
# Evict least recently used keys first (good for cache workloads)
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Evict keys with TTLs first
redis-cli CONFIG SET maxmemory-policy volatile-lru

# Random eviction across all keys
redis-cli CONFIG SET maxmemory-policy allkeys-random
```

Persist the change in `redis.conf`:

```text
maxmemory-policy allkeys-lru
```

## Step 3 - Identify the Largest Keys

```bash
# Find the top memory consumers
redis-cli --bigkeys

# Or scan and estimate sizes manually
redis-cli --scan --pattern '*' | while read key; do
  bytes=$(redis-cli MEMORY USAGE "$key")
  echo "$bytes $key"
done | sort -n | tail -20
```

For large hashes, lists, or sets:

```bash
redis-cli OBJECT ENCODING mykey
redis-cli MEMORY USAGE mykey
redis-cli OBJECT FREQ mykey
redis-cli OBJECT IDLETIME mykey
```

## Step 4 - Increase maxmemory

If your dataset legitimately requires more memory, increase the limit:

```bash
# Set to 4GB at runtime
redis-cli CONFIG SET maxmemory 4gb

# Persist in redis.conf
grep -n maxmemory /etc/redis/redis.conf
```

When setting `maxmemory`, leave headroom for replication buffers, Lua scripts, and fragmentation. A safe rule of thumb: set `maxmemory` to 75-80% of available RAM.

## Step 5 - Enable Active Defragmentation

High fragmentation ratios (above 1.5) mean the operating system has allocated more resident memory (RSS) to Redis than the data actually requires. Enable active defragmentation to recover fragmented memory:

```bash
redis-cli CONFIG SET activedefrag yes
redis-cli CONFIG SET active-defrag-ignore-bytes 100mb
redis-cli CONFIG SET active-defrag-threshold-lower 10
```

## Step 6 - Set TTLs on Keys

If OOM is caused by keys that should expire but were inserted without TTL:

```bash
# Scan for keys without TTL
redis-cli --scan | while read key; do
  ttl=$(redis-cli TTL "$key")
  if [ "$ttl" -eq -1 ]; then
    echo "No TTL: $key"
  fi
done | head -50
```

Apply TTLs programmatically where appropriate:

```bash
redis-cli EXPIRE mykey 86400
```

## Step 7 - Monitor Memory Over Time

Set up monitoring with `INFO memory` stats:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379)

while True:
    info = r.info('memory')
    used = info['used_memory_human']
    peak = info['used_memory_peak_human']
    frag = info['mem_fragmentation_ratio']
    print(f"Used: {used}, Peak: {peak}, Fragmentation: {frag}")
    time.sleep(10)
```

## Step 8 - Prevent the Linux OOM Killer from Killing Redis

If `maxmemory` is not set, the Linux kernel OOM killer may terminate Redis. Set `maxmemory` and optionally lower the OOM score:

```bash
# Reduce likelihood of OOM killer targeting Redis
echo -1000 > /proc/$(pgrep redis-server)/oom_score_adj
```

Or set in the systemd unit file:

```text
[Service]
OOMScoreAdjust=-1000
```

## Summary

Redis OOM errors occur when the server reaches its `maxmemory` limit with policy set to `noeviction`. Fix the immediate error by switching to `allkeys-lru` or another eviction policy, then identify large keys using `--bigkeys` and apply TTLs where appropriate. Long-term, monitor memory usage trends, set `maxmemory` with adequate headroom, and enable active defragmentation to keep fragmentation ratios healthy.
