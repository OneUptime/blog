# Redis Runbook: Performing Emergency Memory Cleanup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Runbook

Description: Step-by-step runbook for performing emergency memory cleanup in Redis when the server is near or at its maxmemory limit under production load.

---

When Redis approaches its memory limit and eviction is not configured, writes fail. This runbook covers how to safely free memory in an emergency without disrupting production more than necessary.

## Step 1: Assess the Situation

Check memory usage:

```bash
redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human|mem_fragmentation_ratio"
```

Test if writes are being rejected due to OOM:

```bash
redis-cli SET __oom_check__ test EX 10
```

A reply of `-OOM command not allowed when used memory > 'maxmemory'` confirms writes are failing due to memory limits.

Check eviction policy:

```bash
redis-cli CONFIG GET maxmemory-policy
```

If the policy is `noeviction`, Redis is rejecting writes. Change it to allow evictions as a temporary measure:

```bash
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## Step 2: Find the Largest Keys

Run bigkeys scan to identify memory hogs:

```bash
redis-cli --bigkeys -i 0.01
```

Use MEMORY USAGE for specific keys:

```bash
redis-cli MEMORY USAGE mylargekey SAMPLES 0
```

List keys by type and size using SCAN:

```bash
redis-cli --scan --pattern "*" | while read key; do
  echo "$key $(redis-cli MEMORY USAGE $key SAMPLES 0)"
done | sort -k2 -rn | head -20
```

## Step 3: Delete Large or Stale Keys

Delete a single key:

```bash
redis-cli DEL target-key
```

For large list, set, or sorted set keys, use UNLINK for async deletion to avoid blocking:

```bash
redis-cli UNLINK very-large-key
```

Delete keys matching a pattern safely with SCAN:

```bash
redis-cli --scan --pattern "cache:v1:*" | xargs redis-cli UNLINK
```

## Step 4: Expire Keys Instead of Deleting

If you do not want to delete keys permanently, set a short TTL to let Redis expire them over time:

```bash
redis-cli EXPIRE stale-session-key 60
```

Apply TTL to many keys with a script:

```bash
redis-cli --scan --pattern "session:*" | while read key; do
  redis-cli EXPIRE "$key" 300
done
```

## Step 5: Compact Memory with Active Defragmentation

After deleting many keys, fragmentation may remain. Enable active defrag:

```bash
redis-cli CONFIG SET activedefrag yes
redis-cli CONFIG SET active-defrag-ignore-bytes 100mb
redis-cli CONFIG SET active-defrag-threshold-lower 10
```

Monitor defrag progress:

```bash
redis-cli INFO memory | grep "active_defrag_running"
```

## Step 6: Restore Normal Configuration

Once memory is stable, restore the original eviction policy:

```bash
redis-cli CONFIG SET maxmemory-policy noeviction
```

Persist changes to `redis.conf` to survive restarts.

## Summary

Emergency memory cleanup in Redis involves quickly identifying large or stale keys, deleting or expiring them using non-blocking UNLINK, and enabling active defragmentation to reclaim fragmented memory. Temporarily enabling an eviction policy buys time while cleanup proceeds.
