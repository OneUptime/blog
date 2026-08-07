# PostgreSQL Read-After-Write: `remote_apply`, LSN Fences, or Primary Reads?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Read-After-Write, LSN, Synchronous Replication, Consistency

Description: Choose primary stickiness, remote_apply, or an LSN replay fence to prevent stale reads after PostgreSQL writes without oversynchronizing every query.

---

Asynchronous PostgreSQL replication does not provide read-after-write consistency by itself. A client can commit on the primary, immediately read from a standby, and observe the old row because the standby has not replayed that commit yet.

There are three practical ways to close that gap:

- route consistency-sensitive reads to the primary;
- commit with `synchronous_commit = remote_apply` and read from a standby that acknowledged that commit;
- return a WAL log sequence number (LSN) after the write and wait until the chosen standby has replayed through that LSN.

These choices move the wait to different places. Primary reads avoid a replication wait. `remote_apply` makes the write wait. An LSN fence lets the write return normally and makes only a dependent replica read wait.

## Define the Guarantee Before Choosing a Mechanism

“Read-after-write” needs a scope. A useful contract is:

> After mutation `M` returns successfully, a dependent read carrying `M`'s consistency token must observe `M` or fail over to the primary within a bounded time.

That is stronger than “replication lag is usually below 100 ms” and narrower than making every read globally linearizable. Decide:

- which reads depend on a preceding write;
- whether the guarantee follows one HTTP request, user session, workflow, or object;
- the maximum extra latency;
- what happens at the deadline: primary fallback, explicit error, or stale result;
- how failover invalidates tokens.

Without that contract, teams often add arbitrary sleeps. A 200 ms sleep works until replay pauses for 500 ms, and it wastes 200 ms when the standby is already caught up.

## Option 1: Read from the Primary

The simplest strong rule is to route the write and its dependent reads to the primary. Common implementations include:

- keep all operations in one transaction when the business operation permits it;
- return a short-lived “read from writer” marker after a mutation;
- keep a user or object on the writer until the consistency-sensitive workflow finishes;
- send only known-stale-tolerant endpoints to replicas.

This is usually the best starting point. It has little protocol complexity, behaves clearly during replica outages, and avoids polling. The tradeoff is primary read load and possibly higher network latency for users near a read replica.

Time-based primary stickiness is a heuristic. A five-second window does not prove that a replica caught up; it merely makes stale reads less likely. If the contract requires proof and you want to return to a replica as soon as possible, use an LSN fence.

## Option 2: Wait at Commit with `remote_apply`

PostgreSQL streaming replication is asynchronous by default. Synchronous replication is activated by naming synchronous standbys and choosing a synchronous commit level. With `remote_apply`, a write commit waits until the current synchronous standby set reports that the commit record has been replayed and is visible to queries.

Configure the standby identity in its connection string and name it on the primary. For example:

```conf
# Standby primary_conninfo
primary_conninfo = 'host=primary.internal user=replicator application_name=read_a'
```

```conf
# Primary postgresql.conf
synchronous_standby_names = 'FIRST 1 (read_a, read_b)'
```

Then request replay-level synchronization only for transactions that need it:

```sql
BEGIN;
SET LOCAL synchronous_commit = 'remote_apply';

UPDATE orders
SET status = 'paid', paid_at = clock_timestamp()
WHERE id = 8421;

COMMIT;
```

Verify the primary's configuration and actual sender state:

```sql
SHOW synchronous_standby_names;

SELECT application_name,
       client_addr,
       state,
       sync_state,
       sent_lsn,
       flush_lsn,
       replay_lsn
FROM pg_stat_replication
ORDER BY application_name;
```

Setting `synchronous_commit` alone is insufficient. If `synchronous_standby_names` is empty, `remote_apply` provides no remote wait; it has the same local synchronization level as `on`. The selected sender must also have reached `streaming` state before it can act as a synchronous standby.

### The Routing Trap

`remote_apply` proves visibility on the **current synchronous standbys that satisfied the commit**, not every replica behind a read load balancer.

With `FIRST 1 (read_a, read_b)`, the selected synchronous standby may change after a failure. With `ANY 1 (read_a, read_b, read_c)`, any one quorum candidate can satisfy a commit. A router that sends the following read to an arbitrary asynchronous or non-acknowledging candidate can still return stale data.

Use `remote_apply` only when the routing layer can select an acknowledging standby, or configure and wait for every standby that may serve the read. The latter increases commit latency and reduces write availability. The dependent query must also take a new snapshot after the commit acknowledgment; `remote_apply` cannot refresh a pre-existing `REPEATABLE READ` or `SERIALIZABLE` snapshot.

### Availability and Latency Cost

Replay includes receive, durable write, and apply work. Slow storage, a replay conflict, or a stopped standby can therefore delay commits. PostgreSQL warns that commits waiting on required synchronous standbys might never complete if a required standby crashes.

Choose explicit application deadlines and an operational degradation policy. Do not automatically weaken durability or visibility in the middle of an incident without recording which writes received the weaker guarantee.

## Option 3: Carry an LSN Replay Fence

An LSN is a byte position in PostgreSQL's WAL stream. WAL is replayed in order, so if a standby's replay LSN is at or beyond a token captured after a commit, that standby has applied the commit and all earlier WAL on that history.

Capture the token on the primary **after** the write commits:

```sql
BEGIN;

UPDATE orders
SET status = 'paid', paid_at = clock_timestamp()
WHERE id = 8421;

COMMIT;

SELECT pg_current_wal_insert_lsn() AS consistency_lsn;
```

Run both commands on the same connection to the same writer history, and return the LSN with the application response:

```json
{
  "order_id": 8421,
  "status": "paid",
  "consistency_lsn": "3A7/9F02C1D8"
}
```

`pg_current_wal_insert_lsn()` is cluster-wide, so concurrent activity can move it beyond this transaction's exact commit record. That is safe but conservative: the replica may wait for a little unrelated WAL too. Capturing an LSN before `COMMIT` is unsafe because the target could precede the transaction's commit record.

On the selected standby, test the replay position-not merely the receive or flush position:

```sql
SELECT pg_is_in_recovery() AS is_standby,
       pg_last_wal_replay_lsn() AS replay_lsn,
       pg_last_wal_replay_lsn() >= '3A7/9F02C1D8'::pg_lsn AS fence_satisfied;
```

The `pg_lsn` type supports ordinary comparison operators. `pg_last_wal_receive_lsn()` only proves that WAL arrived and was synced; a query cannot observe a change until replay has applied it.

PostgreSQL 18 and earlier do not provide a stable SQL command that blocks until a standby reaches an arbitrary replay LSN. Implement a bounded client-side loop:

```text
deadline = now + 250 ms
repeat:
    query pg_is_in_recovery() and pg_last_wal_replay_lsn()
    if this server is not the expected standby: abort the fence
    if replay_lsn >= token: run the read on this same server
    if now >= deadline: route the read to the primary
    wait with small randomized backoff
```

Use a dedicated replica endpoint or pin the host. Checking replica A and then letting a load balancer execute the read on replica B breaks the guarantee. After the fence succeeds, start the business read in a fresh `READ COMMITTED` transaction. A previously opened `REPEATABLE READ` transaction can keep an older snapshot even after replay advances.

### Treat the Token as Data

An LSN token can travel in an HTTP header, session state, workflow record, or message metadata. Validate its syntax and cap wait time. Never let an untrusted client force an unbounded wait for a future LSN.

Coalesce tokens by keeping the greatest required LSN within one primary history. If a page depends on three completed writes, waiting for the newest token also covers the earlier two.

## Why Lag Seconds Are Not a Fence

Neither `replay_lag` nor `now() - pg_last_xact_replay_timestamp()` proves that one specific write is visible.

The `pg_stat_replication` lag columns measure the delay observed for recent WAL. On a fully caught-up idle system, the last value remains briefly and then becomes `NULL`; PostgreSQL explicitly documents that these values are not predictions of catch-up time. Timestamp-based checks are also misleading while the primary is idle.

Use lag metrics for capacity planning and alerts. Use the exact commit-dependent LSN for a correctness decision.

## Handle Failover Explicitly

An LSN is meaningful only with the replication history in which it was issued. Promotion creates a new timeline, and an asynchronous failover may select a standby that never received an acknowledged primary write. No comparison can recreate a transaction that was lost before promotion.

Have the topology layer attach a writer epoch or generation to the token:

```json
{
  "writer_epoch": "cluster-a-timeline-17",
  "lsn": "3A7/9F02C1D8"
}
```

On failover, either:

- certify that the promoted server had replayed the token before honoring it;
- invalidate old-epoch fences and route the operation to recovery handling;
- use synchronous durability designed to meet the required recovery point objective.

Also check `pg_is_in_recovery()`. After promotion, `pg_last_wal_replay_lsn()` stops advancing; treating that frozen value as a normal replica signal can cause pointless waits.

## Choose the Smallest Mechanism That Meets the Contract

| Mechanism | Wait occurs | Best fit | Main cost |
| --- | --- | --- | --- |
| Primary read | No replica wait | Simple flows, low dependent-read volume | Primary load |
| `remote_apply` | Write commit | Every acknowledged write must be visible on a known sync standby | Commit latency and standby availability coupling |
| LSN fence | Dependent replica read | Many stale-tolerant reads, few consistency-sensitive reads | Application and routing complexity |
| Hybrid | Only when needed | Most production systems | More paths to test |

A pragmatic hybrid is often strongest: route ordinary reads to replicas, route the immediate post-write redirect to the primary, and use LSN fences for longer workflows that must move back to replica capacity without guessing. Reserve `remote_apply` for transactions whose visibility and durability justify making commit wait.

Test each path with replay deliberately paused in a non-production environment, with a slow standby, during router failover, and at the fence deadline. A consistency design is incomplete until its timeout and topology-change behavior are known.

## Official Documentation

- [PostgreSQL `synchronous_commit` setting](https://www.postgresql.org/docs/current/runtime-config-wal.html#GUC-SYNCHRONOUS-COMMIT)
- [PostgreSQL synchronous replication](https://www.postgresql.org/docs/current/warm-standby.html#SYNCHRONOUS-REPLICATION)
- [PostgreSQL WAL and recovery information functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-RECOVERY-CONTROL)
- [PostgreSQL `pg_lsn` data type](https://www.postgresql.org/docs/current/datatype-pg-lsn.html)
- [PostgreSQL `pg_stat_replication`](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW)

## Conclusion

Primary reads are the simplest way to guarantee read-after-write behavior. `remote_apply` is appropriate when commit should wait for a known synchronous standby and the router can read from that standby. LSN fencing gives finer control for asynchronous replicas: capture a WAL insertion LSN after commit, wait for the chosen standby's replay LSN, and fall back to the primary at a strict deadline. Whichever method you choose, bind the guarantee to routing and failover behavior rather than to an average lag number.
