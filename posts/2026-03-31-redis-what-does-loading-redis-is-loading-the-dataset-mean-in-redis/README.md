# What Does 'LOADING Redis is loading the dataset' Mean in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Error, LOADING, Startup, RDB, AOF, Troubleshooting

Description: Understand why Redis returns the LOADING error during startup while loading RDB or AOF files, how long it takes, and how to minimize downtime during Redis restarts.

---

## What Is the LOADING Error

When Redis starts up and is in the process of loading its dataset from disk (RDB snapshot or AOF log), all commands return:

```text
(error) LOADING Redis is loading the dataset in memory
```

This is not a permanent error - it is a transient state. Redis is initializing and will start serving requests once the dataset is fully loaded into memory.

## When Does This Occur

The LOADING state occurs:

1. Redis has RDB persistence enabled (`save` directives in `redis.conf`) and is loading `dump.rdb` at startup
2. Redis has AOF persistence enabled (`appendonly yes`) and is replaying the `appendonly.aof` file
3. Both RDB and AOF are enabled - Redis prioritizes loading from the AOF file since it is guaranteed to be the most complete
4. A replica is loading a full sync from the primary

The duration depends on dataset size and disk I/O speed. A 10 GB RDB file on an SSD might load in 30-60 seconds. On a spinning disk, it could take several minutes.

## How to Check Loading Progress

While Redis is loading, you can still query its progress using `redis-cli INFO`:

```bash
redis-cli INFO all | grep -E "(loading|rdb|aof)"
```

During loading, the output includes:

```text
loading:1
loading_start_time:1743417600
loading_total_bytes:10737418240
loading_rdb_used_mem:8589934592
loading_loaded_bytes:2147483648
loading_loaded_perc:20.00
loading_eta_seconds:120
```

- `loading_loaded_perc` shows progress as a percentage
- `loading_eta_seconds` estimates time remaining

## How to Monitor During Startup

Script to wait for Redis to finish loading:

```bash
#!/bin/bash
MAX_WAIT=300
WAITED=0
while true; do
  STATUS=$(redis-cli PING 2>&1)
  if [ "$STATUS" = "PONG" ]; then
    echo "Redis is ready"
    break
  fi
  if echo "$STATUS" | grep -q "LOADING"; then
    PROGRESS=$(redis-cli INFO all 2>/dev/null | grep loading_loaded_perc | cut -d: -f2)
    echo "Loading dataset... ${PROGRESS}% complete"
  fi
  sleep 5
  WAITED=$((WAITED + 5))
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "Timeout waiting for Redis to load"
    exit 1
  fi
done
```

## In Application Code

Handle the LOADING error with retries:

```python
import redis
import time

def get_redis_client(host='localhost', port=6379, max_retries=60, retry_delay=5):
    r = redis.Redis(host=host, port=port)
    for attempt in range(max_retries):
        try:
            r.ping()
            return r
        except redis.exceptions.BusyLoadingError:
            elapsed = attempt * retry_delay
            print(f"Redis is loading dataset... waiting ({elapsed}s elapsed)")
            time.sleep(retry_delay)
        except redis.exceptions.ConnectionError as e:
            print(f"Cannot connect to Redis: {e}")
            time.sleep(retry_delay)
    raise RuntimeError("Redis did not become ready in time")
```

In Node.js with ioredis:

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  retryStrategy: (times) => {
    if (times > 60) return null; // Stop retrying
    return Math.min(times * 500, 5000); // Retry up to 5s apart
  },
  enableReadyCheck: true, // ioredis waits for LOADING to clear
});

redis.on('ready', () => console.log('Redis is ready'));
redis.on('error', (err) => console.error('Redis error:', err));
```

Note: ioredis with `enableReadyCheck: true` (the default) automatically queues commands until Redis finishes loading.

## How to Reduce Loading Time

### 1. Use Faster Storage

Move the Redis data directory to NVMe SSD:

```text
# In redis.conf
dir /mnt/nvme/redis
```

### 2. Use RDB with Compression

Enable RDB compression to reduce file size and disk I/O during loading:

```text
# In redis.conf
rdbcompression yes
```

### 3. Prefer RDB over AOF for Faster Startup

AOF replay is generally slower than RDB loading. If you use both, Redis 4.0+ uses an RDB preamble in AOF for faster loading:

```text
# In redis.conf
aof-use-rdb-preamble yes
```

### 4. Use Redis Replicas with Rolling Restarts

Instead of restarting the primary Redis, restart replicas one at a time and promote a replica to primary. This avoids downtime since replicas load from the primary, not from disk.

### 5. Pre-warm with diskless replication

For replicas, use diskless replication to avoid writing the RDB to disk on the replica:

```text
# In redis.conf on replicas
repl-diskless-load on-empty-db
```

## Kubernetes and Health Checks

In Kubernetes, configure readiness probes to wait for the LOADING state to clear:

```yaml
readinessProbe:
  exec:
    command:
      - redis-cli
      - ping
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 60
```

Or use a custom script that handles the LOADING error message and waits.

## Summary

The "LOADING" error is a transient state at Redis startup while it loads the RDB or AOF dataset into memory. It is not a permanent failure. Monitor loading progress via `INFO all`, implement retry logic in your application that handles `BusyLoadingError`, and reduce load times by using faster storage, RDB compression, and the `aof-use-rdb-preamble` option.
