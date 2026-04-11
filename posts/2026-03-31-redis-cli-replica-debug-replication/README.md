# How to Use Redis CLI --replica for Debugging Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CLI, Replication, Debugging, Replica

Description: Learn how to use redis-cli --replica to attach as a replica and stream live replication commands for debugging replication issues and auditing changes.

---

`redis-cli --replica` connects to a Redis server as a replica and streams the replication commands in real time. This is a powerful debugging tool for understanding what data changes are being propagated from primary to replicas.

## How It Works

When you run `redis-cli --replica`:

1. It connects to the primary
2. Sends `SYNC` to establish a replication session
3. Receives the full RDB snapshot (but does not apply it)
4. Streams all subsequent replication commands to stdout

This lets you watch changes as they are replicated, without needing to be on the actual replica server.

## Basic Usage

```bash
redis-cli --replica
```

Output:

```text
SYNC with master, discarding 1048576 bytes of bulk transfer...
SYNC done. Logging commands from master.
"PING"
"SELECT","0"
"SET","user:1234","Alice"
"EXPIRE","user:1234","3600"
"HSET","order:5678","status","shipped","updated_at","1700000000"
"DEL","temp:session:abc"
```

Every write command executed on the primary appears here.

## Connecting to a Remote Primary

```bash
redis-cli -h redis-primary.example.com -p 6379 -a password --replica
```

## Filtering Output with grep

To watch only specific key patterns:

```bash
redis-cli --replica | grep '"order:'
```

To watch only SET and HSET commands:

```bash
redis-cli --replica | grep -E '"SET"|"HSET"'
```

## Debugging Replication Lag

Compare the replication stream timing. If the primary is processing commands but the replica's output is delayed, there is replication lag:

```bash
# On primary, note the offset
redis-cli -h primary INFO replication | grep master_repl_offset

# On replica, check its offset
redis-cli -h replica INFO replication | grep slave_repl_offset
```

The difference is the number of bytes not yet replicated.

## Auditing Data Changes

`--replica` is useful for auditing what changes are being made to Redis in real time, without running `MONITOR` (which captures all commands including reads):

```bash
# Save replication stream to a log file
redis-cli -h redis-primary.example.com --replica >> /var/log/redis-changes.log &
```

This gives a write-only audit trail.

## Common Replication Debug Scenarios

### Missing Keys on Replica

Watch `--replica` and check if the expected `SET` or `HSET` commands appear:

```bash
redis-cli --replica | grep '"key-i-expect"'
```

If you see the command on the primary but not on `--replica`, the replication stream may be broken.

### Partial Sync vs Full Sync

Note that `redis-cli --replica` always sends the `SYNC` command, which triggers a full synchronization every time. After connecting, you will always see:

```text
SYNC with master, discarding 10485760 bytes of bulk transfer...
```

The byte count reflects the size of the RDB dump (i.e., the dataset size), not the sync type. To check whether actual replicas are performing partial or full resyncs, inspect the replica logs or use `INFO replication` on the replica and look for `master_sync_in_progress` and `master_link_status`.

## Security Consideration

Running `--replica` requires the user to have permission to execute the `SYNC` command. In Redis ACL, `SYNC` and `PSYNC` belong to the `@admin` category. You can grant the minimum required permissions explicitly:

```bash
redis-cli ACL SETUSER replication-debug on >password +sync +psync +replconf +ping
```

## Summary

`redis-cli --replica` attaches to a Redis primary as a passive replica, streaming all write commands in real time. Use it to audit data changes, debug missing replication events, and monitor replication stream health without accessing the actual replica server.
