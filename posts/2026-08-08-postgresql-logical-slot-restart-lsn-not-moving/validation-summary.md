# Validation Summary: Why a PostgreSQL Logical Slot restart_lsn Stops Moving

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- PostgreSQL 18
- Logical decoding
- Logical replication slots
- Write-ahead logging (WAL) and LSN arithmetic
- Built-in logical replication subscriptions
- Replication monitoring views and management functions
- WAL-retention and transaction-ID cleanup settings

## Sources Consulted
- [PostgreSQL 18 `pg_replication_slots` view](https://www.postgresql.org/docs/18/view-pg-replication-slots.html)
- [PostgreSQL 18 logical decoding concepts](https://www.postgresql.org/docs/18/logicaldecoding-explanation.html)
- [PostgreSQL 18 logical decoding SQL interface and replication management functions](https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-REPLICATION)
- [PostgreSQL 18 backup and recovery information functions](https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-BACKUP-CONTROL)
- [PostgreSQL 18 cumulative statistics views](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [PostgreSQL 18 streaming replication protocol](https://www.postgresql.org/docs/18/protocol-replication.html)
- [PostgreSQL 18 replication configuration](https://www.postgresql.org/docs/18/runtime-config-replication.html)
- [PostgreSQL 18 `CREATE SUBSCRIPTION`](https://www.postgresql.org/docs/18/sql-createsubscription.html)
- [PostgreSQL 18 `pg_prepared_xacts` view](https://www.postgresql.org/docs/18/view-pg-prepared-xacts.html)
- [PostgreSQL 18 transaction-ID information functions](https://www.postgresql.org/docs/18/functions-info.html#FUNCTIONS-PG-SNAPSHOT)
- [PostgreSQL 18 function type-resolution rules](https://www.postgresql.org/docs/18/typeconv-func.html)
- [PostgreSQL 18 source for replication-slot advancement](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/replication/slotfuncs.c)
- [PostgreSQL 18 source for logical-decoding restart-point selection](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/replication/logical/snapbuild.c)

## Issues Found
- The prose used bare `pg_size_pretty(NULL)` as an example. PostgreSQL 18 has `bigint` and `numeric` overloads, so that literal call is ambiguous even though the typed expressions in the query are valid. The text now describes the null behavior of those typed query expressions.
- The standby discussion did not distinguish synchronized-slot inactivity from consumer inactivity. For a standby slot with `synced = true`, `inactive_since` records when slot synchronization most recently stopped. The text now states that special meaning.
- The subscriber query used the slot name as `pg_stat_subscription.subname` without noting that the names can differ when a subscription has a custom `slot_name`. The text now tells readers to use the actual subscription name.
- The long-transaction explanation could imply that transaction age alone proves the cause. Logical restart-point selection depends on relevant WAL and decoding state; an old read-only or otherwise change-free transaction is not sufficient evidence by itself. The text now qualifies the transaction as one that generated relevant WAL.
- The prose used bare `age(NULL)` as an example. That literal is ambiguous because `age` has transaction-ID and timestamp overloads, while the actual `age(xmin)` expressions are correctly typed. The text now describes the result when either transaction-ID column is null.
- The `reserved` description called the state healthy, which could obscure a small remaining `safe_wal_size`. It now uses the documented definition: the claimed files are within `max_wal_size`.
- The invalid-slot section said required state was always gone. An `idle_timeout` invalidation makes the slot unusable but does not prove that its WAL or catalog state has already been physically removed. The section now distinguishes slot usability from whether required state is gone and conditions the skipped-interval warning on the consumer actually being behind.
- The slot-advance warning implied that `pg_replication_slot_advance()` itself was universally invalid during recovery. The shown form is primary-only because `pg_current_wal_lsn()` cannot run during recovery, but PostgreSQL can advance an eligible local, non-synchronized standby slot using an appropriate recovery-side target. The wording now scopes the restriction to the shown form and synchronized standby slots.
- The advance example omitted that the slot must be inactive. PostgreSQL rejects `pg_replication_slot_advance()` while another process owns the slot, so that requirement is now explicit. The nearby inconsistency warning was also rewritten as a direct consequence of discarding changes rather than attributing a broader warning to the wrong management function.
- “Dropping releases retained resources immediately” could be read as immediate physical removal of WAL files or tuples. Dropping immediately releases the slot's retention claims; normal WAL recycling/checkpoints and later `VACUUM` perform physical cleanup. The text now uses the precise retention-claim wording.

## Review Notes
- All SQL blocks were executed successfully against PostgreSQL 18.4. Additional behavior checks confirmed that a transaction with relevant WAL can hold `restart_lsn` behind an advancing `confirmed_flush_lsn`, prepared transactions can remain restart-relevant, peeking does not consume changes, getting changes advances confirmed progress, and advancing an active slot is rejected.
- PostgreSQL 18 is the first major release with `idle_replication_slot_timeout`; the post's default, checkpoint timing, and synchronized-standby exclusion are correct for that version.
- For failover readiness, `synced = true` is necessary but is not the complete check. The official procedure also checks that the synchronized slot is persistent and has no invalidation reason. The post correctly directs readers to the documented failover procedure rather than treating `synced` alone as readiness.
- Progress columns in `pg_stat_subscription` are null for parallel apply workers by design. The diagnostic query is still valid and may return multiple worker rows.
- Every external link in the post returned successfully during review. The post's `current` documentation links resolve to PostgreSQL 18 as of the validation date.
