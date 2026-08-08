# Why a PostgreSQL Logical Slot restart_lsn Stops Moving

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Logical Decoding, Replication Slots, WAL Retention, Restart LSN, Troubleshooting

Description: Diagnose a logical slot that retains old WAL by separating consumer acknowledgements, restart requirements, long transactions, and invalidation risk.

---

`pg_replication_slots.restart_lsn` is not the consumer's latest position. It is the oldest WAL location PostgreSQL might still need to restart decoding for that slot. It can legitimately trail `confirmed_flush_lsn`, advance in uneven jumps, and remain unchanged while newer transactions are delivered.

The incident begins when that old restart point retains enough WAL to threaten `pg_wal`, or when it is paired with a consumer that is no longer making progress. Diagnose the two positions separately before advancing, dropping, or recreating anything.

## Read Every Slot Signal Together

On the writable publisher or primary, capture a slot snapshot:

```sql
SELECT slot_name,
       plugin,
       slot_type,
       database,
       active,
       active_pid,
       xmin,
       catalog_xmin,
       restart_lsn,
       confirmed_flush_lsn,
       pg_size_pretty(
           pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)
       ) AS wal_distance_from_restart,
       pg_size_pretty(
           pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)
       ) AS wal_distance_from_confirmed,
       wal_status,
       pg_size_pretty(safe_wal_size) AS safe_wal_size,
       inactive_since,
       invalidation_reason,
       failover,
       synced
FROM pg_replication_slots
WHERE slot_name = 'orders_sub';
```

This full distance query uses `pg_current_wal_lsn()`, so it is for a server that is not in recovery. It targets PostgreSQL 18. Several columns were added in recent major releases; remove unavailable columns when diagnosing an older server and consult that version's view definition. `pg_size_pretty(NULL)` is `NULL`, which is expected when a position or safety limit is unavailable.

PostgreSQL can expose logical slots on a standby, including slots synchronized from its primary. Diagnose those with recovery-safe positions:

```sql
SELECT pg_last_wal_receive_lsn() AS local_receive_lsn,
       pg_last_wal_replay_lsn() AS local_replay_lsn,
       slot_name,
       active,
       restart_lsn,
       confirmed_flush_lsn,
       wal_status,
       invalidation_reason,
       failover,
       synced
FROM pg_replication_slots
WHERE slot_name = 'orders_sub';
```

Choose the receive or replay position explicitly when calculating a standby-side byte distance, because they answer different questions. On a hot standby, a slot marked `synced = true` cannot be used for logical decoding or dropped manually. Leave its lifecycle to slot synchronization and follow the documented failover procedure. The WAL-control examples later in this article are not standby procedures.

Interpret the key fields as follows:

- `restart_lsn`: oldest WAL the slot might still require, and therefore normally the retention boundary;
- `confirmed_flush_lsn`: position through which a logical consumer has confirmed receipt;
- `active` and `active_pid`: whether one consumer is currently streaming the slot;
- `xmin` and `catalog_xmin`: row and catalog cleanup horizons retained for decoding;
- `wal_status`: whether claimed WAL is `reserved`, `extended`, `unreserved`, or irretrievably `lost`;
- `safe_wal_size`: bytes that can be generated before the slot risks becoming `lost` when a finite `max_slot_wal_keep_size` applies;
- `invalidation_reason`: why a slot can no longer be used.

The LSN difference is a byte distance in the WAL stream, not an exact measurement of files occupying `pg_wal`. Check filesystem usage and other retention causes separately.

## First Split: Is the Consumer Advancing?

Take two or more samples across a meaningful interval with normal write activity. Store the raw LSNs and timestamps in the monitoring system.

### Neither Position Moves

If both `confirmed_flush_lsn` and `restart_lsn` are flat, investigate the consumer path first:

- `active = false`: the subscriber or CDC client is disconnected, disabled, crashed, or pointed at another slot;
- `active = true`: the client may be connected but not acknowledging, blocked on its sink, repeatedly failing, or reading a quiet database;
- no relevant database changes: a flat position can be normal even if the cluster generates WAL for other databases;
- a built-in subscription may be stopped by a constraint, schema, permission, or duplicate-key error.

Join the slot to its WAL sender:

```sql
SELECT r.slot_name,
       r.active,
       r.active_pid,
       s.application_name,
       s.client_addr,
       s.state,
       s.sent_lsn,
       s.write_lsn,
       s.flush_lsn,
       s.replay_lsn,
       s.reply_time
FROM pg_replication_slots AS r
LEFT JOIN pg_stat_replication AS s ON s.pid = r.active_pid
WHERE r.slot_name = 'orders_sub';
```

For a built-in logical subscriber, inspect its side too:

```sql
SELECT subname,
       worker_type,
       pid,
       received_lsn,
       latest_end_lsn,
       last_msg_receipt_time
FROM pg_stat_subscription
WHERE subname = 'orders_sub';
```

Preserve publisher and subscriber logs. An apply worker can reconnect after each crash, making `active` alternate between true and false while the same transaction fails indefinitely.

### `confirmed_flush_lsn` Moves but `restart_lsn` Does Not

This is the case most often misdiagnosed. The consumer is acknowledging newer data, but PostgreSQL still needs an older restart point. Logical decoding reconstructs transactions from WAL and must be able to recover coherent decoding state after a crash. A transaction or decoding snapshot that began far back can keep the safe restart boundary behind acknowledged commits.

Look for long-running and prepared transactions on the publisher:

```sql
SELECT pid,
       usename,
       application_name,
       client_addr,
       backend_xid,
       backend_xmin,
       xact_start,
       state,
       wait_event_type,
       wait_event,
       left(query, 200) AS query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY xact_start;

SELECT transaction,
       gid,
       prepared,
       owner,
       database
FROM pg_prepared_xacts
ORDER BY prepared;
```

Long or very large transactions are especially relevant. Logical decoding preserves transaction ordering; a transaction that began before many later commits can anchor resources even while later work appears to flow. Do not terminate it based only on age. Identify the application owner and the rollback or commit impact first.

The restart position also need not advance for every acknowledgement. Treat small or brief separation as normal. Alert on retained bytes and duration under real WAL generation, not on equality between the two LSNs.

## Check Whether the Client Is Peeking Instead of Consuming

For SQL-driven logical decoding, these functions have intentionally different behavior:

- `pg_logical_slot_peek_changes()` returns changes without consuming them;
- `pg_logical_slot_get_changes()` returns and consumes changes;
- replication-protocol clients advance through status feedback.

A test script that repeatedly peeks can prove data is decodable while never advancing confirmed progress. Inspect the client implementation and its last durable checkpoint. Do not switch from peek to get against a production slot until the downstream delivery semantics are understood, because consuming changes changes what subsequent calls can retrieve.

## Look for Large-Transaction Spill or Streaming Pressure

Current PostgreSQL exposes cumulative logical-decoding statistics per slot:

```sql
SELECT slot_name,
       spill_txns,
       spill_count,
       pg_size_pretty(spill_bytes) AS spill_bytes,
       stream_txns,
       stream_count,
       pg_size_pretty(stream_bytes) AS stream_bytes,
       total_txns,
       pg_size_pretty(total_bytes) AS total_bytes,
       stats_reset
FROM pg_stat_replication_slots
WHERE slot_name = 'orders_sub';
```

Rapidly increasing spill counters show that decoded transaction data exceeds `logical_decoding_work_mem` and is being written to disk. That can explain throughput pressure, but it does not alone prove why `restart_lsn` is pinned. Correlate it with transaction age, disk latency, consumer rate, and slot positions.

For built-in logical replication, the subscription's `streaming` option controls whether in-progress transactions are streamed and whether parallel apply can be used. Changing it affects resource use and apply behavior; test the exact publisher/subscriber version combination rather than treating it as an emergency toggle.

## Separate WAL Retention from Row Cleanup Retention

`restart_lsn` protects WAL. `xmin` and `catalog_xmin` can prevent `VACUUM` from removing rows or catalog tuples needed by decoding. A slot can therefore cause table or catalog bloat even when retained WAL is within budget.

Track all three dimensions:

```sql
SELECT slot_name,
       restart_lsn,
       xmin,
       age(xmin) AS xmin_age,
       catalog_xmin,
       age(catalog_xmin) AS catalog_xmin_age
FROM pg_replication_slots
WHERE slot_type = 'logical'
ORDER BY slot_name;
```

`age(NULL)` is `NULL`. Transaction-ID ages require thresholds based on autovacuum settings and wraparound headroom, not a universal number copied from another cluster.

## Understand the Safety Limit

By default, `max_slot_wal_keep_size = -1`, so slots can retain unlimited WAL. A finite value limits retention at checkpoint time:

```sql
SHOW max_slot_wal_keep_size;
SHOW idle_replication_slot_timeout;
```

On PostgreSQL 18, `idle_replication_slot_timeout` can invalidate slots that remain inactive past the configured duration; invalidation happens at a checkpoint and can be delayed until the next one. It does not apply to every slot category, including synchronized standby slots as documented.

With a finite WAL limit:

- `reserved` is healthy within normal WAL bounds;
- `extended` means retention exceeds `max_wal_size` but files are still retained;
- `unreserved` means required files are no longer reserved and may be removed at the next checkpoint;
- `lost` means the slot is unusable and the consumer needs recovery or re-seeding.

`safe_wal_size` is a capacity signal, not a clock. Convert it to estimated time only with a recent WAL generation rate and preserve a conservative margin for bursts.

Do not set a small `max_slot_wal_keep_size` as the only response to unexplained retention. It protects the publisher disk by allowing the consumer's slot to become unusable. That can be the right failure policy, but it exchanges a disk-full incident for a re-seed incident.

## Safe Response by Cause

### Consumer Disabled or Broken

Restore the consumer, fix the apply or sink error, and confirm both positions resume. If the consumer has been retired, verify ownership and drop the slot through the owning subscription or slot lifecycle instead of leaving it inactive.

### Long Transaction

Ask the transaction owner to commit or roll back through the application-aware procedure. Terminating a backend rolls its transaction back and can have substantial recovery and business cost. Also prevent recurrence with scoped transaction timeouts and job design where appropriate.

### Insufficient Consumer Throughput

Measure WAL generation against confirmed-byte progress. Scale the sink, resolve downstream throttling, tune large-transaction handling, or reduce publication scope through a planned data contract change. More network bandwidth will not fix subscriber constraint errors.

### Slot Is Already Invalid

If `wal_status = 'lost'` or `invalidation_reason` is set, required state is gone. Preserve the reason, stop endless reconnects, and follow the consumer's documented re-seed procedure. Recreating a slot at the current LSN skips the missing interval unless a consistent snapshot supplies the corresponding base state.

## Dangerous Shortcuts

### Advancing the Slot

Run this only on the writable publisher or primary. It is not valid as a recovery-mode standby repair:

```sql
SELECT *
FROM pg_replication_slot_advance(
    'orders_sub',
    pg_current_wal_lsn()
);
```

This is not a performance repair. It advances confirmed position and makes skipped changes unavailable from that slot. PostgreSQL explicitly warns that careless replication-position changes can produce inconsistent data. Use it only when the consumer owner has identified the exact disposable interval and has an independent reconciliation plan.

The advanced position is persisted at the next checkpoint, so a crash can also return it to an earlier point. Consumer idempotency remains necessary.

### Dropping and Recreating the Slot

Dropping releases retained resources immediately, but also discards backlog and continuity. A newly created slot begins from a new consistent point. It does not somehow rediscover changes held only by the old slot. Coordinate a new snapshot or re-seed.

### Forcing Repeated Checkpoints

Slot retention enforcement and some persistent position changes interact with checkpoints, but forcing checkpoints repeatedly increases I/O and does not resolve a consumer, transaction, or apply error. Use a checkpoint only when a documented maintenance procedure calls for it and its performance impact is acceptable.

## Alert on Risk, Not a Frozen Field Alone

A practical slot alert combines:

- retained WAL byte distance and its growth rate;
- free space in the filesystem containing `pg_wal`;
- `safe_wal_size`, `wal_status`, and invalidation reason;
- active/inactive duration and expected consumer state;
- change in `confirmed_flush_lsn` while relevant writes occur;
- separation between confirmed and restart positions;
- `xmin` and `catalog_xmin` age;
- consumer/apply error counts and logs.

Page immediately for `unreserved`, `lost`, an invalidation reason, or projected disk exhaustion inside the response window. A stable restart LSN on a quiet database with ample headroom is not itself an incident.

## Official Documentation

- [PostgreSQL `pg_replication_slots` view](https://www.postgresql.org/docs/current/view-pg-replication-slots.html)
- [PostgreSQL logical decoding concepts and slots](https://www.postgresql.org/docs/current/logicaldecoding-explanation.html)
- [PostgreSQL replication management functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-REPLICATION)
- [PostgreSQL replication configuration](https://www.postgresql.org/docs/current/runtime-config-replication.html)
- [PostgreSQL replication statistics views](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-SLOTS)
- [PostgreSQL streaming replication protocol](https://www.postgresql.org/docs/current/protocol-replication.html)

## Conclusion

A stationary `restart_lsn` is a retention boundary, not proof that the consumer is frozen. First determine whether confirmed progress moves. Then correlate the gap with transaction age, slot cleanup horizons, consumer feedback, spill pressure, WAL budget, and invalidation state. Repair the owner of the oldest requirement; advancing or recreating the slot without a data-reconciliation plan merely converts visible WAL retention into invisible data loss.
