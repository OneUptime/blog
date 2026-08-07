# Fix Duplicate-Key Conflicts in PostgreSQL Logical Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Logical Replication, Duplicate Key, Sequence Drift, Troubleshooting, Data Consistency

Description: Recover a stopped logical subscription by identifying the conflicting row, separating sequence drift from divergent writes, and reconciling safely.

---

A duplicate-key error in a PostgreSQL logical replication apply worker is not ordinary lag. The subscriber tried to apply an incoming `INSERT` or `UPDATE`, a local unique constraint rejected it, and replication stopped at that transaction. The worker will not make progress until an operator resolves or deliberately skips the conflict.

Do not start by resetting a sequence or skipping an LSN. First identify the exact constraint, key, existing subscriber row, incoming publisher row, and remote transaction. Sequence drift can enable a conflicting local insert, but sequence state alone does not create an apply conflict on a read-only subscriber: logical replication sends the table row's ID even though it does not replicate the sequence object.

## Understand What the Error Proves

Logical replication applies row changes on the subscriber much like normal DML. PostgreSQL 18 classifies a unique violation from an incoming insert as `insert_exists` and one from an incoming update as `update_exists`. An error-producing conflict stops replication and must be resolved manually.

The conflict proves that the incoming row cannot satisfy the subscriber's current unique constraints. It does **not** by itself prove which copy is correct or how the divergence began. Possible causes include:

- an application, administrator, or maintenance job wrote directly to a subscriber;
- a promoted subscriber accepted writes and was later reattached without reconciliation;
- two publications write overlapping key spaces into one table;
- seed data or a restore pre-populated the subscriber;
- the subscriber has an extra unique constraint not present on the publisher;
- a local sequence generated an ID already used, or soon to be used, by the publisher;
- an update changed a different unique key, such as an email address, to an existing value.

The sequence explanation is common after failover because PostgreSQL logical replication copies values stored in `serial` or identity columns but does not copy the sequence's state. It is not the only explanation, and changing the sequence does not remove the row that is blocking apply.

## Contain the Incident Before Editing Data

Stop application writes to the affected subscriber first. If the apply worker is repeatedly logging the same error, optionally disable the subscription while investigating:

```sql
ALTER SUBSCRIPTION orders_sub DISABLE;
```

Disabling apply does not remove the publisher's replication slot. WAL can continue accumulating while the incident is open, so monitor retained WAL and keep the pause bounded.

Record subscription state before making changes:

```sql
SELECT subname,
       subenabled,
       subskiplsn,
       subpublications
FROM pg_subscription
WHERE subname = 'orders_sub';

SELECT subname,
       worker_type,
       pid,
       received_lsn,
       latest_end_lsn,
       last_msg_receipt_time
FROM pg_stat_subscription
WHERE subname = 'orders_sub';
```

On PostgreSQL 18, the conflict counters make the failure class visible:

```sql
SELECT subname,
       apply_error_count,
       confl_insert_exists,
       confl_update_exists,
       confl_multiple_unique_conflicts,
       stats_reset
FROM pg_stat_subscription_stats
WHERE subname = 'orders_sub';
```

These are cumulative counters, not the complete incident record. Preserve the subscriber's PostgreSQL server log. Current releases log the relation, conflict type, key, existing local row, remote row, replication origin, and transaction finish LSN when that information is available. A representative message is:

```text
ERROR:  conflict detected on relation "public.orders": conflict=insert_exists
DETAIL: Key already exists in unique index "orders_pkey".
        Key (id)=(8421); existing local row (...); remote row (...).
CONTEXT: processing remote data for replication origin "pg_16395"
         during "INSERT" ... finished at 3A7/9F02C1D8
```

Use the actual finish LSN from the log if a later step requires `ALTER SUBSCRIPTION ... SKIP`. Do not substitute `received_lsn`, `latest_end_lsn`, or the publisher's current WAL position.

## Identify the Constraint and Compare Both Rows

A “duplicate key” need not involve the primary key. Inventory all unique indexes on the subscriber:

```sql
SELECT indexrelid::regclass AS index_name,
       pg_get_indexdef(indexrelid) AS definition
FROM pg_index
WHERE indrelid = 'public.orders'::regclass
  AND indisunique
ORDER BY indexrelid::regclass::text;
```

Run a targeted query separately on the publisher and subscriber using the key from the error. Include every business column needed to decide ownership:

```sql
SELECT id,
       external_order_id,
       customer_id,
       status,
       amount,
       created_at,
       updated_at
FROM public.orders
WHERE id = 8421;
```

If the violation names another unique key, query that value too:

```sql
SELECT id, external_order_id, status, updated_at
FROM public.orders
WHERE external_order_id = 'checkout_01K23Q7T4B';
```

Save both results outside the database or in an incident artifact before changing either side. Check dependent rows and foreign keys as well; deleting the apparent duplicate can cascade or orphan locally created data.

When `track_commit_timestamp` was already enabled on the subscriber, PostgreSQL 18 conflict detail can include the origin and commit time of the existing row. Enabling it after the conflict cannot reconstruct metadata that was never recorded. Correlate database logs with connection-pool, audit, deployment, and failover logs to find the writer.

## Determine Whether the Sequence Drifted

For a typical ascending, increment-by-one ID, find the sequence owned by the column and compare its state with the data on each server:

```sql
SELECT pg_get_serial_sequence('public.orders', 'id') AS owned_sequence;

SELECT last_value, is_called
FROM public.orders_id_seq;

SELECT min(id) AS min_id,
       max(id) AS max_id,
       count(*) AS row_count
FROM public.orders;
```

Run this separately on publisher and subscriber. Do not use `currval()` for incident inventory; it is session-local and errors until that session has called `nextval()`.

A subscriber sequence behind `max(id)` is expected when the subscriber has only received logically replicated rows. It becomes dangerous only if that server starts generating IDs. A sequence ahead of the maximum can also be normal because sequence caching, rolled-back transactions, and failed inserts create gaps.

Also ask whether the row was created with an explicit ID. A perfectly aligned sequence cannot prevent `INSERT ... (id) VALUES (8421, ...)` from colliding. If the conflict is on a business unique index rather than the generated ID, sequence repair is irrelevant.

## Choose a Canonical Row

There are three safe resolution patterns. The choice is a data-ownership decision, not a replication setting.

### 1. Publisher Wins

This is the usual policy for a read replica. After backing up the subscriber row and checking dependencies, remove or move the local conflict so the queued remote transaction can apply. Review triggers, row-level security, and downstream publications first: this repair is normal local DML, so its privilege checks and side effects can differ from replication apply:

```sql
BEGIN;

LOCK TABLE public.orders IN SHARE ROW EXCLUSIVE MODE;

SELECT id, external_order_id, status, updated_at
FROM public.orders
WHERE id = 8421
FOR UPDATE;

DELETE FROM public.orders
WHERE id = 8421;

COMMIT;
```

Then enable the subscription and watch it retry from the same remote transaction:

```sql
ALTER SUBSCRIPTION orders_sub ENABLE;
```

If another unique key caused the conflict, delete or reconcile by that key rather than assuming the primary key is the problem. Verify the final subscriber row against the publisher after apply resumes.

### 2. Subscriber Row Wins

If the local row is authoritative, make the publisher authoritative state reflect that decision and plan how to pass the already queued transaction. On supported releases, PostgreSQL can skip the remote transaction using its **finish LSN**:

```sql
ALTER SUBSCRIPTION orders_sub
SKIP (lsn = '3A7/9F02C1D8');

ALTER SUBSCRIPTION orders_sub ENABLE;
```

This is intentionally dangerous. `SKIP` discards every data modification in that remote transaction, not just the conflicting row. If the publisher transaction also inserted a payment and updated inventory, those changes are skipped too and the subscriber becomes inconsistent unless you reconcile them manually.

Skip only when you know the transaction's full scope and have a repair plan. When parallel streaming does not log the finish LSN, follow the version-specific conflict documentation; never guess an LSN or advance a replication origin to “approximately current.”

### 3. Re-seed Widespread Divergence

If conflicts recur across many rows, a one-row repair is probably hiding broader divergence. Quiesce writes, compare tables systematically, and rebuild the subscriber or affected table through a tested re-seed procedure. Repeatedly skipping transactions converts a visible outage into silent data loss.

## Repair the Sequence Only After Rows Converge

If this subscriber may accept writes during a future promotion, synchronize sequences during the controlled cutover after the old writer is fenced and replicated rows are caught up. For the common positive increment-by-one sequence:

```sql
BEGIN;

LOCK TABLE public.orders IN ACCESS EXCLUSIVE MODE;

SELECT setval(
    pg_get_serial_sequence('public.orders', 'id'),
    COALESCE((SELECT max(id) FROM public.orders), 1),
    EXISTS (SELECT 1 FROM public.orders)
);

COMMIT;
```

For a non-empty table, `is_called = true` means the next `nextval()` advances beyond the maximum. For an empty table, `setval(..., 1, false)` makes the next value exactly 1. Avoid the common off-by-one mistake of setting `max(id) + 1` with `is_called = true`, which makes the following default sequence value `max(id) + 2`.

Adapt this procedure for descending sequences, custom increments, cycling, or allocated key ranges. Stop all writers while calculating and setting the value. PostgreSQL documents that `setval` changes are immediately visible and are not undone if the surrounding transaction rolls back, so inspect first and make the `setval` operation the final controlled change.

Resetting the sequence cannot resolve the current apply error: the conflicting subscriber row still exists. It only prevents the same source of collision from generating future rows.

## Prevent the Next Conflict

Make the single-writer rule enforceable:

```sql
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
ON public.orders
FROM app_reader;

ALTER ROLE app_reader IN DATABASE appdb
SET default_transaction_read_only = on;
```

Privilege revocation is the important control; a session default alone is not a substitute for least privilege. Ensure the reader neither owns the replicated tables nor inherits a write-capable role. Give subscriber applications a read-only credential and make writer discovery endpoints return only the primary.

Add these operational safeguards:

- compare publisher and subscriber constraints as part of every schema deployment;
- maintain a sequence synchronization step in promotion and switchover runbooks;
- alert when `apply_error_count` or `confl_insert_exists` increases;
- alert when the apply worker disappears or stops advancing while the subscription is enabled;
- retain subscriber logs long enough to preserve relation, key, origin, and finish LSN detail;
- use non-overlapping key ranges or globally unique identifiers if multiple writers are intentional.

Built-in logical replication is not a conflict-resolving multi-primary system. If two servers can legitimately write the same logical rows, define ownership and conflict semantics before relying on replication to merge them.

## Official Documentation

- [PostgreSQL logical replication conflicts](https://www.postgresql.org/docs/current/logical-replication-conflicts.html)
- [PostgreSQL logical replication restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [PostgreSQL subscription monitoring views](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-SUBSCRIPTION)
- [PostgreSQL `ALTER SUBSCRIPTION`](https://www.postgresql.org/docs/current/sql-altersubscription.html)
- [PostgreSQL sequence manipulation functions](https://www.postgresql.org/docs/current/functions-sequence.html)

## Conclusion

A duplicate-key apply error means the subscriber's data and constraints reject an incoming publisher transaction. Preserve the log, identify the exact unique key, compare both rows, and decide which system owns the truth. Remove the local conflict when the publisher wins; use `SKIP` only with the exact finish LSN and full awareness that it drops the whole transaction. Repair sequence state after data converges and before promotion, then prevent subscriber writes so the same divergence cannot recur.
