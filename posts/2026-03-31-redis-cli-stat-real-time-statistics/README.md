# How to Use Redis CLI --stat for Real-Time Statistics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CLI, Statistics, Monitoring, Performance

Description: Learn how to use redis-cli --stat to display a rolling real-time view of Redis server metrics including keys, memory, commands per second, and connections.

---

`redis-cli --stat` displays a continuously updating table of key Redis server metrics, refreshed every second by default. It is a quick way to get a live view of your Redis server's health without querying `INFO` manually.

## Running --stat

```bash
redis-cli --stat
```

Output (updated every second):

```text
------- data ------ --------------------- load -------------------- - child -
keys       mem      clients blocked requests            connections
500000     48.50M   42      0       8834 (+8834)        3221
500002     48.51M   42      0       9123 (+289)         3221
500002     48.51M   41      0       9456 (+333)         3221
500001     48.50M   42      0       9890 (+434)         3221
```

## Column Meanings

| Column | Meaning |
|--------|---------|
| keys | Total number of keys across all databases |
| mem | Memory allocated by Redis (used_memory) |
| clients | Current connected clients |
| blocked | Clients blocked on BLPOP, BRPOP, etc. |
| requests | Cumulative commands processed (delta in parentheses) |
| connections | Total connections received since start |

## Setting the Refresh Interval

Use `-i` to change the interval in seconds:

```bash
# Refresh every 5 seconds
redis-cli --stat -i 5

# Refresh every 100ms (0.1 seconds)
redis-cli --stat -i 0.1
```

## Connecting to a Remote Server

```bash
redis-cli -h redis.example.com -p 6379 -a password --stat
```

## Watching for Spikes

The requests delta (+N) shows commands per second since the last update. A sudden spike indicates traffic increase:

```text
keys   mem     clients requests
100000 24.10M  20      1000 (+1000)
100000 24.10M  20      1050 (+50)
100000 24.12M  35      8500 (+7450)   <- spike!
100000 24.15M  50      16000 (+7500)  <- sustained
```

Investigate with `MONITOR` or `SLOWLOG` to see what commands are running.

## Watching Memory Growth

Monitor the `mem` column to detect memory leaks:

```text
keys   mem     clients
50000  24.10M  10
50500  25.20M  10
51000  26.50M  10
51500  28.00M  10   <- growing fast
```

If memory grows faster than keys, you may have memory fragmentation. Check:

```bash
redis-cli INFO memory | grep mem_fragmentation_ratio
```

## Watching Blocked Clients

If the `blocked` count is high, clients are waiting on blocking commands (`BLPOP`, `BRPOP`, `XREAD BLOCK`). This is expected for queue consumers but unexpected for regular clients.

## Comparing --stat vs INFO

| Feature | --stat | INFO |
|---------|--------|------|
| Real-time | Yes (continuous) | No (snapshot) |
| Detail level | Summary | Detailed |
| Scriptable | No | Yes |
| Memory breakdown | No | Yes |

Use `--stat` for live monitoring; use `INFO` for detailed diagnostics.

## Summary

`redis-cli --stat` provides a continuously refreshing view of Redis server health, showing key counts, memory usage, clients, and command throughput. It is useful for spotting traffic spikes, memory growth, and client connection changes in real time without writing monitoring scripts.
