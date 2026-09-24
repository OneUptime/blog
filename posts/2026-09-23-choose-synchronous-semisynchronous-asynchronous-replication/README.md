# How to Choose Synchronous, Semi-Synchronous, or Asynchronous Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Replication, PostgreSQL, MySQL, High Availability, Database

Description: Compare replication modes by their acknowledgment boundary, degraded behavior, promotion rules, and impact on application latency.

Choose replication by what a successful commit proves. Labels such as synchronous and semi-synchronous are useful shorthand, but they do not specify which followers acknowledged a write, whether their storage is durable, or whether a query can see the change.

This guide uses PostgreSQL 18 physical replication and MySQL 8.4 semisynchronous replication as concrete examples. Their settings are product-specific; do not translate a configuration by matching names alone.

## Follow a write through the pipeline

A simplified replication path is:

```text
primary generates log
  -> primary persists log
  -> follower receives log
  -> follower persists log
  -> follower applies transaction
  -> new follower query can observe the change
```

The application response can be released at different points. Distinguish local durability, a durable remote copy, and remote query visibility. The last of those is a stronger requirement than merely receiving bytes.

| Desired contract | Candidate approach | Question to resolve |
| --- | --- | --- |
| Keep accepting writes despite follower failure | Asynchronous replication | How much acknowledged data loss is acceptable? |
| Usually obtain a remote copy but permit degraded commits | Product-specific semisynchronous mode | When does fallback weaken the contract? |
| Require a durable remote copy for success | Synchronous durable acknowledgment | Which replicas can safely be promoted? |
| Make a dependent read visible on a known follower | Apply acknowledgment or a read fence | Does routing choose a qualifying follower? |

This table is a decision framework, not a claim that every product exposes all four choices.

## Use asynchronous replication when loss exposure is acceptable

PostgreSQL streaming replication is asynchronous by default. A primary can acknowledge a commit before a standby has its WAL, leaving a possible loss window at failover. See the [streaming replication documentation](https://www.postgresql.org/docs/current/warm-standby.html#STREAMING-REPLICATION).

This is often a reasonable choice for recoverable derived data or a remote disaster-recovery copy with an explicit nonzero recovery point objective. It is less suitable when a successful response is a promise that an order survives destruction of the writer.

Define the loss policy in business terms as well as bytes. Losing ten seconds of peak checkout activity and ten seconds of background cache updates have different consequences. Measure backlog under maintenance and bursts, not only normal traffic.

## Understand MySQL's semisynchronous fallback

In MySQL 8.4, a semisynchronous acknowledgment means transaction events reached a replica's durable relay log; it does not mean the replica applied them. If the required acknowledgment does not arrive before timeout, the source falls back to asynchronous operation. These are documented [semisynchronous semantics](https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html).

On a source with the plugin installed, inspect the relevant controls:

```sql
SELECT @@GLOBAL.rpl_semi_sync_source_enabled,
       @@GLOBAL.rpl_semi_sync_source_timeout,
       @@GLOBAL.rpl_semi_sync_source_wait_for_replica_count,
       @@GLOBAL.rpl_semi_sync_source_wait_point;

SHOW GLOBAL STATUS LIKE 'Rpl_semi_sync_source%';
```

The [source variable reference](https://dev.mysql.com/doc/refman/8.4/en/replication-options-source.html) documents the timeout in milliseconds and the acknowledgment count. Its `AFTER_SYNC` wait point precedes storage-engine commit; `AFTER_COMMIT` waits after that commit. Treat this as a visibility and recovery choice, not a cosmetic tuning switch.

Monitor operational status and changes in `Rpl_semi_sync_source_no_tx`, alongside successful acknowledgment counts. An enabled plugin does not prove that semisynchronous operation is currently effective. The [status-variable reference](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html) defines those signals.

Choose this mode only if the business accepts the documented fallback or your surrounding system deliberately stops accepting relevant work when the guarantee weakens. Increasing a timeout does not transform eventual fallback into an unconditional no-loss policy.

## Configure PostgreSQL's exact acknowledgment level

On an already configured PostgreSQL replication topology, an illustrative primary configuration is:

```conf
synchronous_standby_names = 'FIRST 1 (ha_a, ha_b)'
synchronous_commit = on
```

The names must match standby `application_name` values. In a controller-managed cluster, change the controller's configuration instead of editing its generated setting.

With a nonempty standby selection, `on` waits for remote durable WAL, `remote_write` has weaker remote crash protection, and `remote_apply` also waits for replay. `local` skips the replication wait. With an empty selection, setting `remote_apply` alone creates no remote guarantee. These distinctions are specified in [PostgreSQL's WAL settings](https://www.postgresql.org/docs/current/runtime-config-wal.html#GUC-SYNCHRONOUS-COMMIT).

Do not send the next read to an arbitrary follower simply because commit used `remote_apply`. The read needs an acknowledging replica and a fresh snapshot. Alternatively, route dependent reads to the writer or use an explicit replay fence.

## Price the contract under failure

Benchmark p95 and p99 commit latency with realistic concurrent transactions, then repeat with a slow replica and a missing replica. A required acknowledgment couples write completion to that replica path. Queued transactions can retain resources and amplify an outage.

Also test the HA manager. A database setting that waits for a remote copy and a promotion policy that selects any available node do not compose into a no-loss guarantee. Document eligible candidates, fencing, and the behavior when no safe candidate remains.

Use these acceptance cases:

1. Normal traffic: measure the cost of the chosen acknowledgment boundary.
2. Follower unavailable: verify whether writes block, fail, or weaken their guarantee.
3. Primary unavailable: reconcile acknowledged operations after promotion.
4. Commit response lost: preserve the request identity and resolve its outcome.

Pick the least costly mode that satisfies the actual contract, and expose any degraded state to operators. Replication modes are meaningful only when the application, monitoring, and promotion rules agree on what success means.
