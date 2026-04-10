# How to Use SHUTDOWN in Redis to Stop the Server Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Server, Persistence

Description: Learn how to use the Redis SHUTDOWN command to stop the server gracefully, with options for saving data or aborting safely.

---

The `SHUTDOWN` command in Redis stops the server process. It differs from simply killing the process because it can perform a final data save before exiting, ensuring you do not lose data that has not yet been written to disk.

## Basic Syntax

```text
SHUTDOWN [NOSAVE | SAVE] [NOW] [FORCE] [ABORT]
```

- `SAVE` - Force an RDB snapshot before shutting down, even if persistence is disabled.
- `NOSAVE` - Skip the RDB snapshot before shutting down.
- `NOW` - Skip the grace period for replicas to catch up.
- `FORCE` - Ignore errors that would normally prevent shutdown, such as a failed RDB save or an in-progress AOF rewrite.
- `ABORT` - Cancel a shutdown that is already in progress.

## Graceful Shutdown with Save

The default behavior when no option is given depends on your persistence configuration. If RDB save points are configured, Redis will perform a blocking save before exiting. If AOF is enabled, the AOF file will be flushed to disk:

```bash
redis-cli SHUTDOWN
```

To explicitly force a save:

```bash
redis-cli SHUTDOWN SAVE
```

## Shutdown Without Saving

If you want to stop Redis quickly and do not need to preserve in-memory data:

```bash
redis-cli SHUTDOWN NOSAVE
```

This is useful in development or when you are intentionally discarding data.

## Checking Shutdown Behavior in Config

Before running SHUTDOWN, review your persistence settings:

```bash
redis-cli CONFIG GET save
redis-cli CONFIG GET appendonly
```

If `save` has values and `appendonly` is `yes`, a normal SHUTDOWN will attempt to flush data to disk.

## Using SHUTDOWN in Scripts

When scripting server restarts or deployments, use SHUTDOWN with proper error handling:

```bash
#!/bin/bash
redis-cli -h 127.0.0.1 -p 6379 SHUTDOWN SAVE
if [ $? -ne 0 ]; then
  echo "Redis shutdown may have failed or server was already down"
fi
```

Note: `redis-cli` returns a non-zero exit code if it cannot connect. When SHUTDOWN succeeds, the connection drops immediately and `redis-cli` may report an error even on success.

## SHUTDOWN ABORT

If a shutdown is triggered but you need to cancel it (for example, a scripted shutdown started inadvertently):

```bash
redis-cli SHUTDOWN ABORT
```

This only works if the shutdown has not passed the point of no return.

## Monitoring the Server After SHUTDOWN

After issuing SHUTDOWN, the server process exits. You can confirm it is down:

```bash
redis-cli PING
# Expected: Could not connect to Redis at 127.0.0.1:6379: Connection refused
```

Or check the process:

```bash
ps aux | grep redis-server
```

## Production Considerations

- Always prefer `SHUTDOWN SAVE` in production to avoid data loss.
- Use a process manager like systemd so Redis restarts automatically if needed.
- In Redis Sentinel or Cluster setups, let the orchestration layer manage shutdowns to trigger proper failover before the node goes down.
- Never use `kill -9` on a Redis process - this bypasses the graceful shutdown sequence and causes data loss for any changes since the last successful save.

## Summary

The Redis SHUTDOWN command provides a controlled way to stop the server. Using SAVE ensures data is persisted before exit, while NOSAVE allows a fast stop when data loss is acceptable. Always prefer graceful shutdown over forceful process termination in production environments.
