# Monitor PostgreSQL Replication with Actionable Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication Monitoring, Replication Statistics, WAL Receiver, Replication Slots, Alerting

Description: Build PostgreSQL replication alerts around missing topology, byte backlog, replay health, synchronous state, slot retention, and disk risk.

---

PostgreSQL exposes replication from three complementary viewpoints:

- `pg_stat_replication` shows each WAL sender's direct downstream connection;
- `pg_stat_wal_receiver` shows the one upstream connection on a physical standby;
- `pg_replication_slots` shows durable retention obligations whether consumers are connected or not.

No single lag column is a complete health check. An actionable monitor combines expected topology, LSN byte gaps, progress over time, reply timestamps, synchronous role, slot state, WAL generation rate, and free storage. It also distinguishes an idle caught-up cluster from a busy cluster whose replay has stopped.

## Begin with an Expected Topology Inventory

Monitoring cannot infer whether zero sender rows means a failed standby or a primary with no replicas by design. Keep an inventory containing:

- cluster and node identity;
- expected role: primary, direct standby, cascading relay, or downstream standby;
- expected `application_name`, client address, and upstream host;
- synchronous priority or quorum membership;
- physical or logical slot name and owner;
- recovery point and recovery time objectives;
- maintenance and delayed-replica policy.

Use a stable, unique `application_name` in each standby's `primary_conninfo`:

```conf
primary_conninfo = 'host=primary.internal port=5432 user=replicator application_name=standby_eu_1 sslmode=verify-full'
```

PostgreSQL does not enforce uniqueness of standby application names. Duplicate names make synchronous selection and alert attribution ambiguous; synchronous matching is case-insensitive, so the configuration system must enforce case-insensitive uniqueness.

## Primary View: Measure Each Sender Stage

Run on a primary or a cascading sender that is itself receiving through streaming replication. A cascading sender is still in recovery, so `pg_current_wal_lsn()` is not a role-safe endpoint there; the query uses its last streaming receive position instead:

```sql
WITH local_position AS (
    SELECT CASE
               WHEN pg_is_in_recovery()
                   THEN pg_last_wal_receive_lsn()
               ELSE pg_current_wal_lsn()
           END AS local_sender_lsn
)
SELECT clock_timestamp() AS observed_at,
       p.local_sender_lsn,
       application_name,
       client_addr,
       state,
       sync_state,
       sync_priority,
       sent_lsn,
       write_lsn,
       flush_lsn,
       replay_lsn,
       pg_wal_lsn_diff(p.local_sender_lsn, sent_lsn) AS unsent_bytes,
       pg_wal_lsn_diff(sent_lsn, write_lsn) AS network_or_receive_bytes,
       pg_wal_lsn_diff(write_lsn, flush_lsn) AS unflushed_bytes,
       pg_wal_lsn_diff(flush_lsn, replay_lsn) AS unreplayed_after_flush_bytes,
       pg_wal_lsn_diff(p.local_sender_lsn, replay_lsn) AS total_replay_gap_bytes,
       write_lag,
       flush_lag,
       replay_lag,
       reply_time
FROM pg_stat_replication
CROSS JOIN local_position AS p
ORDER BY application_name;
```

Interpret the byte gaps as a pipeline:

- local sender endpoint to `sent_lsn`: sender has not sent this WAL yet;
- `sent_lsn` to `write_lsn`: WAL was sent but not reported written by the standby;
- `write_lsn` to `flush_lsn`: written but not reported durable;
- `flush_lsn` to `replay_lsn`: durable on the standby but not replayed into visible database state;
- local sender endpoint to `replay_lsn`: total byte backlog visible from that sender.

On a writable primary, `local_sender_lsn` is the current WAL write location. On a streaming cascading standby, it is the last WAL position received and synced to disk. The adjacent stage gaps still compare the downstream-reported positions with one another; the two end-to-end gaps use the role-safe local reference selected by the CTE.

A cascading standby can also forward WAL restored from an archive. If streaming replication is disabled or has not yet started, `pg_last_wal_receive_lsn()` is `NULL`; if archive recovery has moved beyond an earlier streaming receive position, a non-`NULL` value can be stale. In either case, suppress the two end-to-end gaps from this query and monitor archive recovery plus replay separately. The stage gaps reported by `pg_stat_replication` remain useful, but PostgreSQL does not expose one role-neutral SQL function for the relay's exact latest sendable WAL endpoint.

LSN distance measures WAL bytes, not row count or elapsed recovery time. One bulk operation can generate very different WAL per business transaction than another.

The sender `state` has specific values. `startup` and `catchup` can be normal during connection and recovery; `streaming` means the standby caught up enough for normal streaming. Alert when a state violates the expected duration, not whenever it differs from `streaming` for one scrape. `backup` can be a base backup rather than a standby.

## Do Not Treat Lag Intervals as a Catch-Up Estimate

PostgreSQL defines `write_lag`, `flush_lag`, and `replay_lag` as measurements of recent synchronous-commit stages. For an asynchronous standby, `replay_lag` approximates recent visibility delay, but none of these values predicts how long catch-up will take.

When a standby is caught up and the sender becomes idle, the last lag values remain briefly and then become `NULL`. Therefore:

- `NULL` does not automatically mean broken telemetry;
- a nonzero stale value on an idle cluster does not mean current backlog;
- replay lag seconds should not be the only page condition;
- byte gaps and progress deltas are better evidence of backlog.

If operators want an estimated catch-up time, calculate it outside PostgreSQL from backlog bytes divided by a conservative recent **net** catch-up rate. Do not divide by replay rate alone while WAL continues to arrive.

## Standby View: Separate Receive from Replay

Run on each expected physical standby:

```sql
SELECT clock_timestamp() AS observed_at,
       pg_is_in_recovery() AS is_standby,
       w.status,
       w.sender_host,
       w.sender_port,
       w.slot_name,
       w.receive_start_lsn,
       w.receive_start_tli,
       w.written_lsn,
       w.flushed_lsn,
       w.received_tli,
       w.last_msg_send_time,
       w.last_msg_receipt_time,
       w.latest_end_lsn,
       w.latest_end_time,
       pg_last_wal_replay_lsn() AS local_replay_lsn,
       pg_wal_lsn_diff(
           w.flushed_lsn,
           pg_last_wal_replay_lsn()
       ) AS received_not_replayed_bytes,
       pg_is_wal_replay_paused() AS replay_pause_requested
FROM pg_stat_wal_receiver AS w;
```

`written_lsn` is received and written but not necessarily flushed; PostgreSQL explicitly says not to use it for data-integrity checks. `flushed_lsn` is the durable receive position. A large and growing gap between `flushed_lsn` and `pg_last_wal_replay_lsn()` isolates replay pressure from transport pressure.

No `pg_stat_wal_receiver` row is expected on a primary. It is alertable when inventory says the node should be in recovery with streaming configured and the row remains absent beyond the reconnect budget. Always pair that alert with the standby log, which carries DNS, TCP, HBA, TLS, password, slot, missing-WAL, and timeline errors.

`last_msg_receipt_time` helps detect a silent connection, but compare it with configured `wal_receiver_timeout`, network behavior, and scrape interval. Use the server's timestamp to avoid monitor-host clock skew.

## Watch Replay Blockers, Not Just Replay Position

If WAL is arriving but replay does not move, check whether a recovery pause is requested or active:

```sql
SELECT pg_is_in_recovery(),
       pg_is_wal_replay_paused(),
       pg_get_wal_replay_pause_state(),
       pg_last_wal_receive_lsn(),
       pg_last_wal_replay_lsn();
```

`pg_is_wal_replay_paused()` reports whether a pause has been requested; `pg_get_wal_replay_pause_state()` distinguishes `pause requested` from an actually `paused` recovery.

A deliberate pause can fill standby storage while receive continues. Also inspect standby conflicts:

```sql
SELECT datname,
       confl_tablespace,
       confl_lock,
       confl_snapshot,
       confl_bufferpin,
       confl_deadlock,
       confl_active_logicalslot
FROM pg_stat_database_conflicts
ORDER BY datname;
```

These are cumulative counters. Alert on increases, not absolute values, and retain `stats_reset` context from the corresponding statistics views where available. Query cancellation on a hot standby can protect replay latency; changing delay or feedback settings trades query cancellation against lag and primary bloat.

A configured `recovery_min_apply_delay` intentionally creates replay delay. Tag delayed standbys separately so their expected gap does not use the ordinary HA threshold. They still need disk and slot-retention alerts.

## Slot View: Monitor Disconnected Obligations

Run the retained-distance query on a writable primary or publisher, including a node that has been promoted and now accepts writes:

```sql
SELECT clock_timestamp() AS observed_at,
       slot_name,
       slot_type,
       plugin,
       database,
       temporary,
       active,
       active_pid,
       restart_lsn,
       confirmed_flush_lsn,
       pg_wal_lsn_diff(
           pg_current_wal_lsn(),
           restart_lsn
       ) AS retained_wal_distance_bytes,
       xmin,
       age(xmin) AS xmin_age,
       catalog_xmin,
       age(catalog_xmin) AS catalog_xmin_age,
       wal_status,
       safe_wal_size,
       inactive_since,
       invalidation_reason,
       failover,
       synced
FROM pg_replication_slots
ORDER BY slot_name;
```

This query targets PostgreSQL 18. Feature and column availability varies by major version, so deploy a version-specific query rather than suppressing SQL errors in the collector.

A standby can expose synchronized logical slots, but `pg_current_wal_lsn()` is not valid during recovery. Inspect slot state there without invoking a primary-only WAL-control function:

```sql
SELECT clock_timestamp() AS observed_at,
       pg_last_wal_receive_lsn() AS local_receive_lsn,
       pg_last_wal_replay_lsn() AS local_replay_lsn,
       slot_name,
       slot_type,
       database,
       temporary,
       active,
       restart_lsn,
       confirmed_flush_lsn,
       wal_status,
       safe_wal_size,
       inactive_since,
       invalidation_reason,
       failover,
       synced
FROM pg_replication_slots
ORDER BY slot_name;
```

For a synchronized failover slot, alert on expected presence, persistence (`temporary = false`), synchronization (`synced = true`), invalidation, and progress over time. If a byte distance is required on a standby, calculate it explicitly from `pg_last_wal_receive_lsn()` or `pg_last_wal_replay_lsn()` according to whether the policy concerns received WAL or applied WAL. Do not substitute either value without naming that semantic choice.

Important alerts are:

- an expected active consumer becomes inactive beyond its reconnect budget;
- retained WAL distance grows continuously;
- `wal_status` becomes `unreserved` or `lost`;
- `safe_wal_size` falls toward a burst-aware safety threshold;
- `invalidation_reason` becomes non-null;
- `xmin` or `catalog_xmin` age threatens vacuum or wraparound headroom;
- an unknown slot appears or a required slot disappears;
- a logical failover slot expected on a standby is absent or fails `synced AND NOT temporary AND invalidation_reason IS NULL`.

`restart_lsn` and `confirmed_flush_lsn` have different meanings for a logical slot. The former is the oldest WAL still potentially needed to restart decoding; the latter is acknowledged consumer progress. They need not move together. Page on retention risk and missing progress under write load, not simple inequality.

## Turn `safe_wal_size` into a Deadline Carefully

For a non-lost slot when `max_slot_wal_keep_size` is finite, `safe_wal_size` reports how many more WAL bytes can be generated before the slot risks becoming `lost`. Estimate time to danger as:

```text
safe seconds = safe_wal_size / conservative recent WAL bytes per second
```

Calculate this estimate only when `safe_wal_size` is non-`NULL`; alert directly when `wal_status = 'lost'`. Use a high-percentile write rate that includes batch bursts, not only the last quiet minute. Page when projected time is shorter than detection plus response plus safety margin.

For a non-lost slot, when `max_slot_wal_keep_size = -1`, `safe_wal_size` is `NULL` because the slot retention limit is unlimited. That is not unlimited disk. Forecast filesystem exhaustion from retained-distance growth and actual free bytes.

## Monitor the Filesystem and Archiver Too

A slot alert without disk telemetry can arrive too late. Monitor the filesystem containing `pg_wal` and the archiver:

```sql
SELECT archived_count,
       last_archived_wal,
       last_archived_time,
       failed_count,
       last_failed_wal,
       last_failed_time,
       stats_reset
FROM pg_stat_archiver;
```

Alert on new archive failures and on a stale successful archive when completed WAL segments are awaiting archival, accounting for segment completion and `archive_timeout`. PostgreSQL warns that archive successes are not guaranteed to occur strictly in filename order in every special case, so do not assume every older file succeeded solely from `last_archived_wal`.

WAL may be retained by a backup, archiving, checkpoint behavior, `wal_keep_size`, or another slot. The largest slot LSN gap is evidence, not a complete disk accounting system.

## Verify Synchronous Replication as a Policy

If a standby is meant to protect commits, verify configuration and runtime selection:

```sql
SHOW synchronous_standby_names;

SELECT application_name,
       state,
       sync_priority,
       sync_state,
       write_lsn,
       flush_lsn,
       replay_lsn,
       reply_time
FROM pg_stat_replication
ORDER BY application_name;
```

Possible `sync_state` values include `async`, `potential`, `sync`, and `quorum`. Interpret them against `FIRST` or `ANY` semantics. A candidate listed for quorum can report `quorum`; a priority candidate can be `potential` until a higher-priority synchronous standby fails.

Alert on the policy outcome: fewer qualifying connected standbys than required, an expected member missing, or commits remaining in the IPC `SyncRep` wait beyond the expected synchronous-commit latency budget. Do not assert that every name in a candidate list must always report `sync`.

PostgreSQL's primary knows only directly connected standbys. A downstream cascading standby is asynchronous and invisible to the root primary's synchronous selection. Poll every relay.

## Supplement Physical Views for Logical Subscriptions

Active logical subscriptions normally appear as WAL sender connections and normally use logical slots, but subscriber apply health needs additional views:

```sql
SELECT subname,
       worker_type,
       pid,
       relid::regclass AS relation,
       received_lsn,
       latest_end_lsn,
       last_msg_receipt_time
FROM pg_stat_subscription
ORDER BY subname, worker_type, relid::regclass::text NULLS FIRST;
```

On PostgreSQL 18, alert on counter increases:

```sql
SELECT subname,
       apply_error_count,
       sync_error_count,
       stats_reset
FROM pg_stat_subscription_stats
ORDER BY subname;
```

An enabled subscription with no apply worker, a table stuck outside `r` state, or rising error counts can coexist with an apparently valid publisher slot. Monitor both ends.

## Use Progress Windows Instead of Single Samples

Store positions as native `pg_lsn` values where supported, or retain their strings for display and calculate sortable numeric values or byte deltas in PostgreSQL. Across each interval calculate:

- WAL bytes generated at the sender;
- bytes sent, flushed, and replayed per downstream;
- backlog change, not only backlog size;
- duration without progress while relevant WAL is generated;
- slot retention growth and filesystem free-space change.

A 10 GB replay gap shrinking at 500 MB/s can be healthier than a 1 GB gap growing without bound. Reset rate calculations when a node restarts, changes timeline, changes upstream, or is re-seeded. LSNs from independent clusters or unrelated timeline histories must not be subtracted as if they shared one WAL stream.

## Alert Tiers and Runbook Links

### Page

- required synchronous acknowledgment policy is no longer satisfied;
- an expected HA edge is absent past the reconnect objective;
- replay is paused unexpectedly or does not progress while receive backlog breaches the RPO;
- a required slot is `unreserved`, `lost`, or invalidated;
- projected slot or filesystem WAL exhaustion falls inside the response window;
- a required logical apply worker is absent with errors increasing.

### Urgent Warning

- replay or receive backlog grows for several windows but remains inside RPO;
- slot retained bytes or cleanup horizons grow abnormally;
- an expected slot is inactive beyond a maintenance allowance;
- sender remains in `catchup` longer than its recovery objective;
- archive failures increase but redundant retention still protects recovery.

### Ticket or Capacity Review

- recurring spill pressure in logical decoding;
- chronic near-threshold replay backlog;
- topology differs from inventory without immediate durability loss;
- delayed replicas consume more WAL or disk than forecast.

Every alert should include cluster, node, upstream, application name, slot, current raw LSNs, byte gaps, last progress time, free WAL storage, current state, and a version-matched runbook. Avoid a page that says only replication lag is high.

## Access for the Monitor

Dynamic statistics hide some details from ordinary users. PostgreSQL's predefined `pg_monitor` role provides broad monitoring access, and `pg_read_all_stats` provides statistics visibility. Grant the least capability required and protect connection credentials:

```sql
GRANT pg_monitor TO postgres_monitor;
```

Review this privilege against organizational policy. Monitoring does not need superuser merely to read these views.

## Official Documentation

- [PostgreSQL `pg_stat_replication`](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW)
- [PostgreSQL `pg_stat_wal_receiver`](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-WAL-RECEIVER-VIEW)
- [PostgreSQL `pg_replication_slots`](https://www.postgresql.org/docs/current/view-pg-replication-slots.html)
- [PostgreSQL replication slots and retention](https://www.postgresql.org/docs/current/warm-standby.html#STREAMING-REPLICATION-SLOTS)
- [PostgreSQL WAL and recovery information functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-RECOVERY-INFO-TABLE)
- [PostgreSQL synchronous replication](https://www.postgresql.org/docs/current/warm-standby.html#SYNCHRONOUS-REPLICATION)
- [PostgreSQL predefined monitoring roles](https://www.postgresql.org/docs/current/predefined-roles.html)
- [PostgreSQL logical replication monitoring](https://www.postgresql.org/docs/current/logical-replication-monitoring.html)

## Conclusion

Good PostgreSQL replication alerts answer three questions: is every expected edge present, is each stream making enough progress for its RPO, and can its retention obligations exhaust WAL or cleanup headroom before operators respond? Use sender, receiver, and slot views together, collect deltas over time, account for synchronous policy and cascades, and page on a breached durability or capacity deadline instead of one ambiguous lag value.
