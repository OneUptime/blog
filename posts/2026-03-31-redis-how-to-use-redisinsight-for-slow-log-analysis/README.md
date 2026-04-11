# How to Use RedisInsight for Slow Log Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisInsight, Slow Log, Performance, Monitoring

Description: Use RedisInsight's Slow Log viewer to identify and analyze slow Redis commands, understand performance bottlenecks, and optimize query patterns.

---

## What Is the Redis Slow Log

The Redis Slow Log records commands that take longer than a configurable threshold to execute. Unlike application-level slow query logs, it measures the time Redis spends processing each command, excluding network I/O.

Key slow log parameters:
- `slowlog-log-slower-than` - threshold in microseconds (default: 10000 = 10ms)
- `slowlog-max-len` - maximum number of entries to keep (default: 128)

## Configuring the Slow Log

```bash
# Log commands slower than 5ms (5000 microseconds)
redis-cli CONFIG SET slowlog-log-slower-than 5000

# Keep the last 500 slow log entries
redis-cli CONFIG SET slowlog-max-len 500

# Verify configuration
redis-cli CONFIG GET slowlog-log-slower-than
redis-cli CONFIG GET slowlog-max-len
```

In redis.conf:

```text
slowlog-log-slower-than 5000
slowlog-max-len 500
```

## Accessing the Slow Log in RedisInsight

1. Open RedisInsight and connect to your Redis instance
2. Click **Workbench** in the left sidebar
3. Run the following command to view the slow log:

```text
SLOWLOG GET 100
```

Or navigate to **Analysis Tools** - **Slow Log** for the graphical view.

## Reading Slow Log Entries via CLI

```bash
# View the last 10 slow log entries
redis-cli SLOWLOG GET 10

# Output format:
# 1) 1) (integer) 14           <- Entry ID
#    2) (integer) 1711234567   <- Unix timestamp
#    3) (integer) 15234        <- Execution time (microseconds)
#    4) 1) "KEYS"              <- Command and arguments
#       2) "*"
#    5) "127.0.0.1:54321"      <- Client address
#    6) ""                     <- Client name

# Get count of slow log entries
redis-cli SLOWLOG LEN

# Reset the slow log
redis-cli SLOWLOG RESET
```

## Analyzing Slow Entries with a Script

```javascript
import Redis from 'ioredis';
const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost' });

async function analyzeSlowLog(count = 100) {
  const entries = await redis.slowlog('get', count);

  const parsed = entries.map(([id, timestamp, duration, command, clientAddr, clientName]) => ({
    id,
    timestamp: new Date(timestamp * 1000).toISOString(),
    durationMs: (duration / 1000).toFixed(2),
    command: command.join(' ').substring(0, 200),
    clientAddr,
  }));

  // Group by command to find patterns
  const commandCounts = {};
  for (const entry of parsed) {
    const cmd = entry.command.split(' ')[0].toUpperCase();
    if (!commandCounts[cmd]) {
      commandCounts[cmd] = { count: 0, totalDuration: 0, maxDuration: 0 };
    }
    commandCounts[cmd].count++;
    commandCounts[cmd].totalDuration += parseFloat(entry.durationMs);
    commandCounts[cmd].maxDuration = Math.max(
      commandCounts[cmd].maxDuration,
      parseFloat(entry.durationMs)
    );
  }

  console.table(
    Object.entries(commandCounts)
      .sort(([, a], [, b]) => b.totalDuration - a.totalDuration)
      .map(([cmd, stats]) => ({
        command: cmd,
        count: stats.count,
        totalMs: stats.totalDuration.toFixed(2),
        avgMs: (stats.totalDuration / stats.count).toFixed(2),
        maxMs: stats.maxDuration.toFixed(2),
      }))
  );

  return parsed;
}

await analyzeSlowLog(200);
```

## Common Slow Commands and Fixes

### KEYS pattern (O(N) scan)

```bash
# Problem: KEYS * blocks the server
KEYS *

# Fix: Use SCAN which is non-blocking and iterates in batches
SCAN 0 MATCH "user:*" COUNT 100
```

### SMEMBERS on large sets

```bash
# Problem: Returns all members of a large set
SMEMBERS large-set  # O(N)

# Fix: Use SSCAN for iterative access
SSCAN large-set 0 COUNT 100
```

### SORT with no LIMIT

```bash
# Problem: Sorting a large list
SORT mylist  # O(N+M*log(M))

# Fix: Add LIMIT and use pre-sorted Sorted Sets
SORT mylist LIMIT 0 20
# Better: Use ZRANGE on a Sorted Set
```

### LRANGE on huge lists

```bash
# Problem: Returning all elements of a large list
LRANGE mylist 0 -1  # O(N)

# Fix: Paginate
LRANGE mylist 0 99  # First 100 elements
```

## RedisInsight Slow Log Features

In RedisInsight's Slow Log view you can:

- Filter entries by duration threshold
- Sort by execution time, timestamp, or command
- Export slow log entries to CSV
- View client address and name for each slow entry

To access: **Analysis Tools** -> **Slow Log** in the RedisInsight interface.

## Summary

RedisInsight's Slow Log viewer makes it easy to identify performance bottlenecks without writing custom scripts. Configure `slowlog-log-slower-than` to a threshold appropriate for your workload (start at 10ms and adjust down as you optimize), keep the max length high enough to capture patterns, and use the command grouping analysis to find which operations are most frequently slow.
