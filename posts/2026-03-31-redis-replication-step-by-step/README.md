# How Redis Replication Works Step by Step

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Internal, Architecture

Description: Understand the exact sequence of events in Redis replication from initial handshake through full sync and ongoing partial sync, with commands to observe each phase.

---

Redis replication allows one or more replica instances to maintain synchronized copies of a primary's dataset. Understanding how replication works helps you diagnose sync issues, size the replication backlog, and optimize for high availability.

## Phase 1: Replica Connects to Primary

When you configure a replica with `replicaof` or `REPLICAOF`:

```bash
# On the replica
redis-cli -p 6380 REPLICAOF 192.168.1.10 6379
```

The replica:

1. Opens a TCP connection to the primary
2. Sends a `PING` to verify connectivity
3. Sends `AUTH` if the primary requires a password
4. Sends `REPLCONF listening-port <port>` to advertise its port
5. Sends `REPLCONF capa psync2` to indicate support for partial sync

Primary logs:

```text
Replica 192.168.1.11:6380 asks for synchronization
```

## Phase 2: PSYNC Negotiation

The replica sends `PSYNC <replication-id> <offset>`.

- First connection: sends `PSYNC ? -1` (no history)
- Reconnect: sends `PSYNC <prev-replication-id> <last-offset>`

The primary responds:

```text
+FULLRESYNC <replication-id> <offset>   # Full sync required
+CONTINUE <replication-id>              # Partial sync possible
```

Check the current replication state:

```bash
redis-cli INFO replication
```

```text
role:master
master_replid:8f3a2b1c4e5d6f7a8b9c0d1e2f3a4b5c6d7e8f9a
master_repl_offset:12345678
connected_slaves:1
slave0:ip=192.168.1.11,port=6380,state=online,offset=12345670,lag=0
```

## Phase 3: Full Synchronization (First Sync)

When partial sync is not possible, the primary performs a full sync:

1. Primary calls `BGSAVE` to create an RDB snapshot
2. While the child writes the RDB, the primary buffers all new commands in the replication backlog
3. The RDB file is sent to the replica over the TCP connection
4. After the RDB transfer, buffered commands are sent
5. The replica loads the RDB, then replays the buffered commands

Monitor the transfer:

```bash
# On primary
redis-cli INFO replication | grep -E "slave|loading"

# On replica
redis-cli -p 6380 INFO replication | grep -E "master_sync|loading"
```

```text
master_sync_in_progress:1
master_sync_total_bytes:1073741824
master_sync_read_bytes:536870912
master_sync_perc:50.00%
master_sync_left_secs:3
```

## Phase 4: Replica Catches Up

After loading the RDB, the replica receives and applies the buffered commands:

```text
# Replica log
MASTER <-> REPLICA sync: receiving 1073741824 bytes from master to disk
MASTER <-> REPLICA sync: Flushing old data
MASTER <-> REPLICA sync: Loading DB in memory
MASTER <-> REPLICA sync: Finished with success
```

The replica transitions from `loading` to `connected` state:

```bash
redis-cli -p 6380 INFO replication | grep master_link_status
```

```text
master_link_status:up
```

## Phase 5: Ongoing Replication (Command Propagation)

After sync, the primary continuously sends every write command to connected replicas:

```text
*3\r\n$3\r\nSET\r\n$6\r\nmykey1\r\n$6\r\nvalue1\r\n
*3\r\n$3\r\nSET\r\n$6\r\nmykey2\r\n$6\r\nvalue2\r\n
```

The primary also sends periodic `PING` commands to verify replicas are alive:

```text
repl-ping-replica-period 10
```

## Phase 6: Partial Resynchronization (Reconnect)

When a replica briefly disconnects and reconnects, it can resume without a full sync if:

1. The primary's `replication-id` has not changed
2. The replica's last known offset is still within the replication backlog

```bash
# Check backlog size
redis-cli CONFIG GET repl-backlog-size

# Check offsets
redis-cli INFO replication | grep -E "offset|backlog"
```

```text
master_repl_offset:98765432
repl_backlog_size:104857600
repl_backlog_first_byte_offset:98141432
```

If the replica's offset (98141432+) is within the backlog, partial sync succeeds.

## Monitoring Replication Health

```bash
# Check replication lag (in bytes)
redis-cli INFO replication | grep lag

# Count full vs partial syncs
redis-cli INFO stats | grep sync_
```

```text
sync_full:2
sync_partial_ok:145
sync_partial_err:1
```

A `sync_partial_err` means the backlog was too small. Increase `repl-backlog-size`.

## Summary

Redis replication proceeds through six phases: TCP connection and capability negotiation, PSYNC protocol exchange, full RDB synchronization on first connect, buffered command replay, ongoing command propagation, and partial resynchronization on reconnect. Monitor `master_link_status`, `master_sync_perc`, and `sync_partial_err` to track replication health. Size the `repl-backlog-size` based on your write rate and expected disconnect duration to enable efficient partial resync.
