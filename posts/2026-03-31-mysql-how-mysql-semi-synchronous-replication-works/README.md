# How MySQL Semi-Synchronous Replication Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Semi-Synchronous Replication, High Availability, Durability, Replication

Description: Learn how MySQL semi-synchronous replication ensures at least one replica acknowledges a transaction before the source commits, reducing data loss risk.

---

## What Is Semi-Synchronous Replication

MySQL replication has three durability modes:

- **Asynchronous** (default) - source commits immediately; replicas apply at their own pace. Risk of data loss on source failure.
- **Semi-synchronous** - source waits for at least one replica to acknowledge receipt of the transaction before committing. Reduces data loss to at most one transaction.
- **Synchronous** (Group Replication) - all members must certify the transaction before commit. No data loss, but higher latency.

Semi-synchronous replication is a practical middle ground: better durability than async with lower latency than fully synchronous.

## How Semi-Synchronous Works

1. Source executes the transaction and writes to the binary log.
2. Source sends the binlog event to all replicas.
3. Source waits for at least one replica to send an ACK (acknowledgment).
4. Once an ACK is received, source completes the commit and returns success to the client.
5. If no ACK arrives within `rpl_semi_sync_source_timeout`, the source falls back to asynchronous mode.

The replica writes the event to its relay log before sending the ACK - it does not need to apply the event first.

## Installing the Plugin

```sql
-- On the source:
INSTALL PLUGIN rpl_semi_sync_source SONAME 'semisync_source.so';

-- On the replica:
INSTALL PLUGIN rpl_semi_sync_replica SONAME 'semisync_replica.so';
```

## Enabling Semi-Synchronous on the Source

```sql
SET GLOBAL rpl_semi_sync_source_enabled = ON;
SHOW VARIABLES LIKE 'rpl_semi_sync_source_enabled';
```

## Enabling Semi-Synchronous on the Replica

```sql
SET GLOBAL rpl_semi_sync_replica_enabled = ON;

-- Restart the replica IO thread to activate semi-sync
STOP REPLICA IO_THREAD;
START REPLICA IO_THREAD;
```

## Key Configuration Variables

```sql
SHOW VARIABLES LIKE 'rpl_semi_sync%';
```

| Variable | Description | Default |
|----------|-------------|---------|
| `rpl_semi_sync_source_enabled` | Enable on source | OFF |
| `rpl_semi_sync_source_timeout` | Milliseconds to wait for ACK before fallback | 10000 |
| `rpl_semi_sync_source_wait_no_replica` | Wait even with no semi-sync replicas | ON |
| `rpl_semi_sync_source_wait_for_replica_count` | How many ACKs required | 1 |

### Requiring Multiple ACKs

```sql
-- Require 2 replicas to acknowledge before commit
SET GLOBAL rpl_semi_sync_source_wait_for_replica_count = 2;
```

## Monitoring Semi-Synchronous Status

```sql
SHOW STATUS LIKE 'Rpl_semi_sync%';
```

Key metrics:
- `Rpl_semi_sync_source_status` - ON/OFF (whether currently in semi-sync mode).
- `Rpl_semi_sync_source_yes_tx` - transactions committed with semi-sync ACK.
- `Rpl_semi_sync_source_no_tx` - transactions committed without ACK (fell back to async).
- `Rpl_semi_sync_source_clients` - number of semi-sync replicas connected.
- `Rpl_semi_sync_source_net_avg_wait_time` - average network wait time in microseconds.

## After Source Commit vs After Sync (AFTER_SYNC Mode)

MySQL 5.7+ introduced `AFTER_SYNC` mode (also called "lossless semi-sync"):

```sql
SHOW VARIABLES LIKE 'rpl_semi_sync_source_wait_point';
-- AFTER_SYNC (default in MySQL 5.7+) or AFTER_COMMIT
```

- `AFTER_COMMIT` (old behavior) - source commits to storage engine, then waits for ACK. Risk of phantom reads on source.
- `AFTER_SYNC` - source waits for ACK BEFORE committing to storage engine. True lossless behavior.

With `AFTER_SYNC`, if the source crashes after sending the event to the replica but before receiving the ACK, the transaction is not yet committed on the source. After failover, the replica has the transaction; no data is lost.

## Fallback to Asynchronous Mode

If the timeout (`rpl_semi_sync_source_timeout`) expires with no ACK:

```sql
SHOW STATUS LIKE 'Rpl_semi_sync_source_status';
-- Switches to OFF (asynchronous mode)

SHOW STATUS LIKE 'Rpl_semi_sync_source_no_tx';
-- Increments for each transaction committed in async fallback mode
```

MySQL returns to semi-sync automatically when a replica reconnects and sends an ACK.

## Summary

Semi-synchronous replication provides a durability guarantee between pure async (fast but lossy) and synchronous (lossless but high latency). With `AFTER_SYNC` mode, the source waits for at least one replica to receive and acknowledge the transaction before completing the commit, ensuring zero data loss on failover. Set a reasonable `rpl_semi_sync_source_timeout` to prevent excessive latency spikes when replicas are slow or disconnected.
