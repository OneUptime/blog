# How to Use MONITOR in Redis to Watch Real-Time Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Monitor, Debugging, Real-Time, Observability

Description: Learn how to use Redis MONITOR to stream every command processed by the server in real time, useful for debugging and understanding application behavior.

---

## What Is MONITOR?

`MONITOR` puts a Redis connection into a special mode that streams every command processed by the server as it happens. Every client's commands appear in real time, giving you full visibility into what your application is actually doing against Redis.

## Basic Usage

```bash
redis-cli MONITOR
```

Output streams continuously:

```text
OK
1711872001.234567 [0 127.0.0.1:52301] "SET" "user:100" "alice"
1711872001.235012 [0 127.0.0.1:52302] "GET" "session:abc"
1711872001.235890 [0 127.0.0.1:52301] "EXPIRE" "user:100" "3600"
```

Each line shows:
- Timestamp with microseconds
- Database index (in brackets)
- Client IP and port
- Command and arguments

Press `Ctrl+C` to stop.

## Filtering Output with grep

```bash
redis-cli MONITOR | grep "SET "
```

This shows only SET commands, useful for tracking write activity.

```bash
redis-cli MONITOR | grep "\[2\]"
```

Shows only commands on database index 2.

## Use Cases for MONITOR

- **Debugging missing keys**: See exactly what keys are being set and expired
- **Tracing application behavior**: Understand what Redis calls a feature actually makes
- **Finding unexpected commands**: Catch background jobs or stale clients sending commands
- **Validating caching logic**: Confirm that cache invalidation is firing correctly

## Example: Finding N+1 Query Patterns

```bash
redis-cli MONITOR | grep "GET user:"
```

If you see hundreds of `GET user:1`, `GET user:2`, etc. in rapid succession, your application may have an N+1 caching issue that could be solved with `MGET`.

## Performance Warning

`MONITOR` has a significant performance impact. It forces Redis to serialize and send every command to your monitoring client. Under high load, this can:

- Increase latency by 50% or more
- Cause network buffer buildup
- Slow down Redis for all clients

**Never run `MONITOR` in production for extended periods.**

## Safer Alternatives for Production

For production observability, prefer:

- `SLOWLOG` for capturing slow commands
- `LATENCY HISTORY` for latency spike tracking
- Redis keyspace notifications for event-driven monitoring

## Limiting Duration

```bash
timeout 5 redis-cli MONITOR
```

This runs `MONITOR` for exactly 5 seconds then exits - limiting its production impact.

## Summary

`MONITOR` is Redis's most powerful debugging tool, streaming every command in real time. Use it in development and staging to understand application behavior, trace bugs, and validate caching logic. In production, keep sessions very short and prefer `SLOWLOG` for sustained performance analysis.
