# How to Use RedisInsight Profiler for Command Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisInsight, Profiler, Performance, Monitoring

Description: Learn how to use the RedisInsight Profiler to capture live Redis commands, identify hot paths, and debug unexpected command patterns in production.

---

The RedisInsight Profiler runs `MONITOR` under the hood and presents a live, filterable stream of every command executed against your Redis instance. It is invaluable for understanding what your application is actually doing.

## Warning Before Using Profiler

Running `MONITOR` on a busy Redis server can reduce throughput by up to 50% due to the overhead of streaming all commands. Use the Profiler on staging or during low-traffic windows in production.

## Opening the Profiler

In RedisInsight, click the "Profiler" tab in the left sidebar (the play button icon). Then click "Start Profiling".

## What You See

Each line in the Profiler output shows:

```text
Timestamp   | Client       | Database | Command
13:04:12.01 | 127.0.0.1:54 | 0        | GET user:session:abc123
13:04:12.02 | 127.0.0.1:54 | 0        | HSET order:456 status shipped
13:04:12.03 | 10.0.0.1:44  | 0        | EXPIRE user:session:abc123 3600
```

## Filtering Commands

Use the filter bar to narrow output:

- Filter by command type: `GET`, `SET`, `HSET`, etc.
- Filter by key pattern: `user:*` or `session:*`

This reduces noise when debugging a specific feature.

## Identifying Hot Keys

Watch for keys that appear in rapid succession. If `user:session:abc123` appears 100 times per second, that key is a hotspot:

```text
GET user:session:abc123
GET user:session:abc123
GET user:session:abc123
...
```

Consider adding client-side caching or local in-memory caching for such keys.

## Finding Unexpected Commands

Profiler output often reveals surprising behavior:

```text
# Application running KEYS in production
KEYS product:*

# N+1 query pattern in a loop
HGET order:1 status
HGET order:2 status
HGET order:3 status
...
```

Replace `KEYS` with `SCAN`. Replace N+1 patterns across different keys with pipelining or a Lua script. Use `HMGET` when you need multiple fields from the same hash key.

## Capturing to a Log File

RedisInsight lets you download the profiler output as a text file. Click the download icon after stopping the profiler. The file contains all captured commands.

## Analyzing Command Counts

After a profiling session, use the built-in aggregation panel (if available in your version) to see command frequency:

```text
GET     45,231 calls
HGET    12,440 calls
SET      8,100 calls
EXPIRE   8,099 calls
```

This reveals whether your read/write ratio matches expectations.

## Comparing Profiler vs Slowlog

The Profiler captures all commands in real time. Slowlog (`SLOWLOG GET`) captures only commands that exceeded a latency threshold. Use both together:

- Profiler: volume and pattern analysis
- Slowlog: identify slowest individual commands

## Stopping the Profiler

Click "Stop Profiling" to end the `MONITOR` session. Redis stops sending the command stream and throughput returns to normal.

## Summary

RedisInsight Profiler is a powerful tool for understanding real-time command patterns, identifying hot keys, and catching anti-patterns like `KEYS` or N+1 loops. Always use it with caution on production due to the performance impact of the underlying `MONITOR` command.
