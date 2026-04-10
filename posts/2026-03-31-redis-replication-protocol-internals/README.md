# How Redis Replication Protocol Works Internally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Internal, High Availability, Protocol

Description: Understand the full handshake and sync sequence Redis primaries and replicas use, from initial PSYNC to ongoing command propagation.

---

Redis replication lets one primary serve multiple read replicas. The protocol has two phases: full sync (initial or after a long disconnect) and partial sync (normal ongoing replication). Understanding the protocol helps diagnose replication lag, broken replicas, and memory spikes during resync.

## Replica Handshake

When a replica connects to a primary, it performs this sequence:

```text
1. PING             -- check primary is alive
2. AUTH <password>  -- authenticate if requirepass is set
3. REPLCONF listening-port <port>  -- tell primary the replica's port
4. REPLCONF capa psync2            -- advertise PSYNC2 capability
5. PSYNC <repl-id> <offset>        -- request partial or full sync
```

## PSYNC Response: Full Sync

If the primary cannot serve the requested offset (first connect, or offset fell out of the backlog):

```text
Primary --> "+FULLRESYNC <repl-id> <offset>\r\n"
Primary --> <RDB file bytes>
```

The primary calls `fork()`, writes an RDB snapshot, and streams it to the replica. During the fork, new commands are buffered in the replication backlog.

## PSYNC Response: Partial Sync

If the replica's offset is still in the backlog:

```text
Primary --> "+CONTINUE <repl-id>\r\n"
Primary --> <backlog bytes from replica's offset>
```

Partial sync is fast - no fork needed.

## Ongoing Command Propagation

After sync, the primary streams every write command to all replicas in RESP format:

```text
*3\r\n$3\r\nSET\r\n$5\r\nhello\r\n$5\r\nworld\r\n
```

Replicas apply commands in order, maintaining the same dataset.

## Replication Backlog

The backlog is a ring buffer that holds recent write commands:

```text
# redis.conf
repl-backlog-size 1mb    # size of the ring buffer
repl-backlog-ttl 3600    # seconds before freeing backlog if no replicas
```

If a replica disconnects and reconnects before the backlog wraps, a partial sync is possible. If the backlog overflows, a full sync is required.

## Monitoring Replication

```bash
redis-cli INFO replication
# role:master
# connected_slaves:2
# slave0:ip=10.0.0.2,port=6380,state=online,offset=12345678,lag=0
# master_replid:abc123def456...
# master_repl_offset:12345678
# repl_backlog_size:1048576
# repl_backlog_first_byte_offset:11297103
```

Check replication offset difference (lag in commands):

```bash
# On primary
redis-cli INFO replication | grep master_repl_offset

# On replica
redis-cli INFO replication | grep slave_repl_offset
```

## Forcing a Full Resync

```bash
# On replica - disconnect and reconnect triggers full resync
redis-cli REPLICAOF NO ONE
redis-cli REPLICAOF <primary-ip> <port>
```

## Replication Timeout Tuning

```text
# redis.conf
repl-timeout 60         # seconds before replica is considered dead
repl-ping-replica-period 10  # heartbeat interval in seconds
```

## Summary

Redis replication uses a PSYNC-based protocol where replicas request a specific replication offset. If that offset is still in the primary's backlog ring buffer, replication continues without a fork. Otherwise, a full RDB transfer happens. Ongoing replication streams every write command in RESP format. Increasing `repl-backlog-size` reduces the frequency of expensive full syncs after brief network interruptions.
