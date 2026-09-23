# How to Run Schema Migrations Safely with Single-Leader Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Schema Migration, Replication, Deployment

Description: Roll out PostgreSQL schema changes through one migration runner while accounting for replica replay, locks, and mixed application versions.

---

A single database leader gives schema changes an authoritative write destination. It does not coordinate every application version, make DDL lock-free, or guarantee that all read replicas have replayed the new schema when the migration commits.

This workflow uses PostgreSQL physical streaming replicas. With logical replication, schema changes require a separate deployment order because DDL is not replicated automatically.

## Establish the migration boundary

Run one migration job against the current writer endpoint. Use your migration tool's locking and migration-history mechanism so concurrent deployments cannot race. The application should not run unrestricted migrations from every replica at startup.

Check that the connection is writable, but do not treat that observation as a permanent leadership guarantee. A failover may occur during any operation. Keep migration steps resumable and inspect the actual schema and history after an interrupted connection before retrying an ambiguous operation.

Inventory all consumers: current and previous application releases, reporting jobs, read replicas, and downstream logical subscribers. Write down which columns each version reads and writes. That inventory determines when removing the old shape becomes safe.

## Expand with bounded lock acquisition

Suppose `orders` needs a new optional `external_reference` column. Add it on the leader first:

```sql
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE orders ADD COLUMN external_reference text;
COMMIT;
```

These timeouts are illustrative. A lock timeout aborts the statement and leaves the transaction needing rollback; the migration runner must stop and retry later according to policy. It should not proceed as if the column exists.

PostgreSQL's [ALTER TABLE reference](https://www.postgresql.org/docs/18/sql-altertable.html) specifies lock behavior and the different costs of alteration forms. Adding a nullable column without a default avoids a table rewrite, but still requires the DDL lock. A short operation can wait behind a long transaction and cause a queue of blocked work.

Deploy a release that tolerates both old and new data before making the new field mandatory. Backfill in bounded primary-key ranges with explicit progress tracking, and throttle based on database load and replica replay. The migration is a workload, not just a schema file.

## Gate reads on replica replay

Physical replication transports the schema changes through WAL. A lagging replica can still reject a query referencing the new column after the primary has committed it.

After the DDL commits, capture a WAL position on the same authoritative primary connection:

```sql
SELECT pg_current_wal_insert_lsn() AS schema_barrier;
```

Before sending new-schema queries to a particular replica, verify that it has replayed that barrier:

```sql
SELECT pg_is_in_recovery(),
       pg_last_wal_replay_lsn() >= '0/12345678'::pg_lsn AS schema_ready;
```

Replace the example LSN with the captured position. The insertion position includes the completed DDL's commit record even if the connection used asynchronous local commit; the current WAL write position can lag insertion. Concurrent writes may move the barrier further, which only makes the wait conservative. PostgreSQL documents these functions in its [administration-function reference](https://www.postgresql.org/docs/18/functions-admin.html). Missing positions fail the gate. The check applies to that replica and valid replication history; invalidate cached decisions after topology or timeline changes. Do not compare unrelated timelines as though a larger numeric LSN proved the migration survived failover.

A simpler rollout can route affected queries to the leader until every eligible read replica has passed the schema gate. New or rebuilt replicas must also pass before entering the read pool.

## Build indexes with their own failure handling

For an index on the new field:

```sql
CREATE INDEX CONCURRENTLY orders_external_reference_idx
    ON orders (external_reference);
```

Run this outside an explicit transaction block. Concurrent index creation has multiple phases, can wait for older transactions, and can leave an invalid index after failure. Inspect the index before retrying:

```sql
SELECT indexrelid::regclass AS index_name, indisready, indisvalid
FROM pg_index
WHERE indexrelid = to_regclass('orders_external_reference_idx');
```

The [CREATE INDEX documentation](https://www.postgresql.org/docs/18/sql-createindex.html) explains these limitations. A name already existing does not establish that an index is valid or matches the intended definition. Give recovery from a failed concurrent build its own migration step.

## Contract only after the old behavior disappears

Wait until old application instances, jobs, prepared queries, and rollback candidates no longer depend on the old schema. Verify backfill completion and data invariants before enforcing constraints or dropping columns.

Keep the expansion phase compatible with application rollback. Reverting an application version should not require restoring a dropped column or reversing a large destructive migration during an incident.

Logical subscribers need additional handling: PostgreSQL's [logical replication restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html) state that database schema and DDL are not replicated. Apply compatible changes to subscribers in the appropriate order, and verify publication column lists and apply workers separately.

## Rehearse failure at the migration boundaries

Test a blocked DDL lock, a lagging reader, interrupted index construction, and a leader change after the server commits but before the client receives confirmation. The expected result is a diagnosable, resumable migration with compatible readers, not blind execution of the same script until it stops failing.
