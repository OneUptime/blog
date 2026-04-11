# How to Use BGSAVE in Redis to Trigger Background Saves

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, RDB, Backup, Command

Description: Learn how to use BGSAVE in Redis to trigger asynchronous RDB snapshot saves without blocking the server, and how to verify save completion.

---

## What Is BGSAVE

`BGSAVE` triggers an asynchronous RDB (Redis Database) snapshot save in the background. Redis forks a child process to write the in-memory dataset to disk as an RDB file while the parent process continues serving client requests without interruption.

```text
BGSAVE [SCHEDULE]
```

- No argument: start background save immediately
- `SCHEDULE`: schedule a save for after any currently running AOF rewrite completes

Returns `Background saving started` immediately (not after the save completes).

## Basic Usage

```bash
BGSAVE
# Background saving started

# Check if save is in progress
LASTSAVE  # Returns timestamp of last completed save
```

## Verify Save Status

```bash
# Check if background save is still running
INFO persistence
# Look for: rdb_bgsave_in_progress:1 (in progress) or 0 (done)
```

## Practical Example in Python

```python
import redis
import time

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def trigger_background_save():
    """Trigger BGSAVE and wait for completion."""
    # Get the last save time before starting
    last_save_before = client.lastsave()
    print(f"Last save before: {last_save_before}")

    # Trigger background save
    response = client.bgsave()
    print(f"BGSAVE response: {response}")

    # Wait for save to complete
    max_wait = 60  # seconds
    start = time.time()
    while time.time() - start < max_wait:
        info = client.info('persistence')
        in_progress = info.get('rdb_bgsave_in_progress', 0)

        if not in_progress:
            last_save_after = client.lastsave()
            if last_save_after > last_save_before:
                print(f"Save completed at: {last_save_after}")
                return True
        time.sleep(0.5)

    print("Timeout waiting for BGSAVE")
    return False

trigger_background_save()
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

async function backgroundSaveAndWait(timeoutMs = 30000) {
  // Record the last save time (lastSave returns a Date object in node-redis v4)
  const beforeSave = await client.lastSave();
  console.log(`Last save: ${beforeSave.toISOString()}`);

  // Trigger background save
  await client.bgSave();
  console.log('BGSAVE started');

  // Poll for completion
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const info = await client.info('persistence');
    const inProgress = info.includes('rdb_bgsave_in_progress:1');

    if (!inProgress) {
      const afterSave = await client.lastSave();
      if (afterSave > beforeSave) {
        console.log(`Save completed: ${afterSave.toISOString()}`);
        return true;
      }
    }

    await new Promise(r => setTimeout(r, 500));
  }

  throw new Error('BGSAVE did not complete within timeout');
}

await backgroundSaveAndWait();
```

## BGSAVE vs SAVE

| Command | Behavior | Use Case |
|---------|----------|----------|
| `BGSAVE` | Async, non-blocking, uses fork | Production saves |
| `SAVE` | Sync, blocks all clients | Emergency only |

Always prefer `BGSAVE` in production. `SAVE` should only be used when you need a guaranteed save before shutdown.

## Memory Impact of BGSAVE

`BGSAVE` uses `fork()` to create a child process. Due to Copy-on-Write (COW), memory usage can temporarily spike:

- The child process shares pages with the parent
- When the parent writes to a page, a copy is made (COW)
- In the worst case, memory doubles during a heavy-write period

```bash
# Monitor memory during BGSAVE
INFO persistence
# Look for: rdb_last_cow_size (bytes copied during last BGSAVE)
```

## Scheduling a Save

Use `BGSAVE SCHEDULE` when you want to ensure a save happens after current AOF rewrite:

```bash
BGSAVE SCHEDULE
# Background saving scheduled
```

## Checking Persistence Info

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_persistence_status():
    info = client.info('persistence')
    return {
        'rdb_last_save_time': info['rdb_last_save_time'],
        'rdb_last_bgsave_status': info['rdb_last_bgsave_status'],
        'rdb_bgsave_in_progress': bool(info['rdb_bgsave_in_progress']),
        'rdb_last_cow_size': info.get('rdb_last_cow_size', 0),
        'aof_enabled': bool(info['aof_enabled']),
    }

status = get_persistence_status()
print(f"Last save: {status['rdb_last_save_time']}")
print(f"Last save status: {status['rdb_last_bgsave_status']}")
print(f"In progress: {status['rdb_bgsave_in_progress']}")
print(f"Last COW size: {status['rdb_last_cow_size']:,} bytes")
```

## Automated Backup Script

```bash
#!/bin/bash
# redis_backup.sh - Trigger BGSAVE and copy RDB file

REDIS_CLI="redis-cli"
RDB_FILE="/var/lib/redis/dump.rdb"
BACKUP_DIR="/backup/redis"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Starting Redis backup..."

# Trigger background save
$REDIS_CLI BGSAVE

# Wait for completion
while true; do
    IN_PROGRESS=$($REDIS_CLI INFO persistence | grep rdb_bgsave_in_progress | cut -d: -f2 | tr -d '\r')
    if [ "$IN_PROGRESS" = "0" ]; then
        break
    fi
    echo "Save in progress..."
    sleep 1
done

# Copy the RDB file
mkdir -p "$BACKUP_DIR"
cp "$RDB_FILE" "$BACKUP_DIR/dump_$DATE.rdb"
echo "Backup saved to $BACKUP_DIR/dump_$DATE.rdb"
```

## Configuring Automatic Saves

In `redis.conf`, configure periodic saves without manual `BGSAVE`:

```text
# Save after 900 seconds if at least 1 key changed
save 900 1
# Save after 300 seconds if at least 10 keys changed
save 300 10
# Save after 60 seconds if at least 10000 keys changed
save 60 10000
```

View and update at runtime:

```bash
CONFIG GET save
CONFIG SET save "900 1 300 10 60 10000"
```

## Summary

`BGSAVE` triggers an asynchronous RDB snapshot by forking a child process, allowing the Redis server to continue serving requests without interruption. Use `LASTSAVE` and `INFO persistence` to check save completion. Always prefer `BGSAVE` over blocking `SAVE` in production, and be aware of potential temporary memory spikes due to Copy-on-Write forking behavior.
