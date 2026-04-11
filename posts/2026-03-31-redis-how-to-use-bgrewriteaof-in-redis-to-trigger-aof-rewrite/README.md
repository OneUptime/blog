# How to Use BGREWRITEAOF in Redis to Trigger AOF Rewrite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AOF, Persistence, Command, Administration

Description: Learn how to use BGREWRITEAOF in Redis to compact the Append Only File by rewriting it in the background, reducing disk usage while maintaining data integrity.

---

## What Is BGREWRITEAOF

Redis's Append Only File (AOF) records every write command to disk for durability. Over time, the AOF file grows large with redundant commands (e.g., many increments that could be replaced by a single SET). `BGREWRITEAOF` rewrites the AOF file in the background, creating a compact version that produces the same dataset with fewer commands.

```text
BGREWRITEAOF
```

Returns `Background append only file rewriting started` immediately.

## Prerequisites - Enabling AOF

First ensure AOF is enabled:

```bash
CONFIG GET appendonly
# 1) "appendonly"
# 2) "yes"

# Enable at runtime
CONFIG SET appendonly yes
```

Or in `redis.conf`:

```text
appendonly yes
appendfilename "appendonly.aof"
```

## Basic Usage

```bash
BGREWRITEAOF
# Background append only file rewriting started

# Check if rewrite is in progress
INFO persistence
# Look for: aof_rewrite_in_progress:1
```

## How the Rewrite Works

1. Redis forks a child process
2. The child reads the in-memory dataset and writes a new, compact AOF
3. While the child writes, new incoming commands are buffered
4. When the child finishes, Redis atomically replaces the old AOF with the new one
5. The buffer of new commands is appended to the new AOF

The result is a shorter file containing just the minimal set of commands to reconstruct the current dataset.

## Practical Example in Python

```python
import redis
import time

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def trigger_aof_rewrite():
    """Trigger AOF rewrite and wait for completion."""
    info_before = client.info('persistence')
    print(f"AOF current size: {info_before.get('aof_current_size', 0):,} bytes")
    print(f"AOF base size: {info_before.get('aof_base_size', 0):,} bytes")

    # Trigger rewrite
    client.bgrewriteaof()
    print("AOF rewrite started")

    # Wait for completion
    max_wait = 120
    start = time.time()
    while time.time() - start < max_wait:
        info = client.info('persistence')
        in_progress = info.get('aof_rewrite_in_progress', 0)

        if not in_progress:
            info_after = client.info('persistence')
            print(f"Rewrite complete!")
            print(f"New AOF size: {info_after.get('aof_current_size', 0):,} bytes")
            return True

        time.sleep(1)

    print("Timeout waiting for AOF rewrite")
    return False

trigger_aof_rewrite()
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

(async () => {
  const client = createClient();
  await client.connect();

  async function rewriteAOF() {
    // Check AOF status first
    const infoBefore = await client.info('persistence');
    console.log('Starting AOF rewrite...');

    // Trigger the rewrite
    await client.bgRewriteAof();
    console.log('BGREWRITEAOF started');

    // Poll for completion
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(r => setTimeout(r, 1000));
      const info = await client.info('persistence');
      const inProgress = info.includes('aof_rewrite_in_progress:1');

      if (!inProgress) {
        console.log('AOF rewrite completed');
        return;
      }

      attempts++;
      console.log(`Rewrite in progress (${attempts}s elapsed)`);
    }

    throw new Error('AOF rewrite timed out');
  }

  await rewriteAOF();
})();
```

## Checking AOF Status

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_aof_status():
    info = client.info('persistence')
    return {
        'aof_enabled': bool(info.get('aof_enabled', 0)),
        'aof_rewrite_in_progress': bool(info.get('aof_rewrite_in_progress', 0)),
        'aof_rewrite_scheduled': bool(info.get('aof_rewrite_scheduled', 0)),
        'aof_last_rewrite_time_sec': info.get('aof_last_rewrite_time_sec', -1),
        'aof_current_rewrite_time_sec': info.get('aof_current_rewrite_time_sec', -1),
        'aof_last_bgrewrite_status': info.get('aof_last_bgrewrite_status', 'unknown'),
        'aof_current_size': info.get('aof_current_size', 0),
        'aof_base_size': info.get('aof_base_size', 0),
    }

status = get_aof_status()
for key, value in status.items():
    print(f"{key}: {value}")
```

## Automatic AOF Rewriting

Configure Redis to rewrite the AOF automatically when it grows too large:

```text
# Rewrite when AOF is 100% larger than last rewrite
auto-aof-rewrite-percentage 100

# Minimum size before auto-rewrite triggers (avoid rewrites on tiny files)
auto-aof-rewrite-min-size 64mb
```

View and update at runtime:

```bash
CONFIG GET auto-aof-rewrite-percentage
CONFIG GET auto-aof-rewrite-min-size

CONFIG SET auto-aof-rewrite-percentage 75
CONFIG SET auto-aof-rewrite-min-size 128mb
```

## BGREWRITEAOF vs BGSAVE

| Feature | BGREWRITEAOF | BGSAVE |
|---------|-------------|--------|
| Output | Compacted AOF file | RDB snapshot |
| Purpose | Shrink AOF | Create point-in-time backup |
| Required | AOF enabled | Always available |
| Frequency | As needed / auto | Periodic or manual |

## Memory Impact

Like `BGSAVE`, `BGREWRITEAOF` uses `fork()`, which can cause temporary memory spikes due to Copy-on-Write. Check memory stats after rewriting:

```bash
INFO persistence
# Look for: aof_rewrite_buffer_length (buffer size during rewrite)
```

## Manual Rewrite Trigger Script

```bash
#!/bin/bash
# trigger_aof_rewrite.sh

echo "Checking AOF status..."
AOF_ENABLED=$(redis-cli CONFIG GET appendonly | tail -1)

if [ "$AOF_ENABLED" != "yes" ]; then
    echo "AOF is not enabled, skipping rewrite"
    exit 1
fi

CURRENT_SIZE=$(redis-cli INFO persistence | grep aof_current_size | cut -d: -f2 | tr -d '\r\n')
echo "Current AOF size: $CURRENT_SIZE bytes"

echo "Triggering BGREWRITEAOF..."
redis-cli BGREWRITEAOF

# Wait for completion
while true; do
    IN_PROGRESS=$(redis-cli INFO persistence | grep aof_rewrite_in_progress | cut -d: -f2 | tr -d '\r\n')
    if [ "$IN_PROGRESS" = "0" ]; then
        break
    fi
    echo "Rewrite in progress..."
    sleep 2
done

NEW_SIZE=$(redis-cli INFO persistence | grep aof_current_size | cut -d: -f2 | tr -d '\r\n')
echo "New AOF size: $NEW_SIZE bytes"
echo "Rewrite complete!"
```

## Summary

`BGREWRITEAOF` compacts the Redis Append Only File by rewriting it in the background using a fork, creating a minimal representation of the current dataset. Use it manually when the AOF file grows significantly, or configure `auto-aof-rewrite-percentage` for automatic rewrites. Monitor progress via `INFO persistence` and be aware of temporary memory pressure during the rewrite due to Copy-on-Write forking.
