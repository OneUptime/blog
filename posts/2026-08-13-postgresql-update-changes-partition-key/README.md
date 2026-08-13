# What Happens When an UPDATE Changes a PostgreSQL Partition Key?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Table Partitioning, UPDATE, Triggers, Concurrency, Database Transactions

Description: Understand PostgreSQL row movement across partitions, including destination routing, trigger firing, serialization failures, foreign keys, and safe retry behavior.

---

When an <code>UPDATE</code> changes a PostgreSQL partition key so the row no longer fits its current leaf, PostgreSQL can route the new row to another partition. Internally, the movement is a delete from the source partition followed by an insert into the destination.

That implementation affects triggers, concurrency, foreign tables, and error handling. It does not mean the application should issue a separate delete and insert; a single <code>UPDATE</code> remains the statement-level operation and is atomic within its surrounding transaction.

## The Basic Route

Create monthly partitions:

~~~sql
CREATE TABLE events (
    tenant_id bigint NOT NULL,
    event_id bigint NOT NULL,
    occurred_at timestamptz NOT NULL,
    payload jsonb NOT NULL,
    PRIMARY KEY (tenant_id, event_id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE events_2026_08 PARTITION OF events
FOR VALUES FROM ('2026-08-01 00:00:00+00')
         TO   ('2026-09-01 00:00:00+00');

CREATE TABLE events_2026_09 PARTITION OF events
FOR VALUES FROM ('2026-09-01 00:00:00+00')
         TO   ('2026-10-01 00:00:00+00');
~~~

An update crossing midnight at the month boundary moves the physical row:

~~~sql
UPDATE events
SET occurred_at = TIMESTAMPTZ '2026-09-01 00:00:00+00'
WHERE tenant_id = 42
  AND event_id = 9001
  AND occurred_at = TIMESTAMPTZ '2026-08-31 23:59:59+00'
RETURNING tableoid::regclass AS destination, *;
~~~

The returned <code>tableoid</code> identifies <code>events_2026_09</code>. Querying the parent still presents one logical table.

If no partition accepts the new key, PostgreSQL raises an error and the statement does not partially leave the row deleted:

~~~text
ERROR: no partition of relation "events" found for row
~~~

Pre-create destinations for the full accepted range or deliberately use a monitored default partition. A default prevents the routing error but may complicate later partition creation.

## Row-Level Triggers See Delete and Insert

PostgreSQL's trigger documentation defines which row-level triggers participate in row movement:

1. row-level <code>BEFORE UPDATE</code> triggers fire on the source partition;
2. row-level <code>BEFORE DELETE</code> triggers fire on the source partition;
3. row-level <code>BEFORE INSERT</code> triggers fire on the destination;
4. row-level <code>AFTER DELETE</code> triggers on the source and <code>AFTER INSERT</code> triggers on the destination are applied;
5. row-level <code>AFTER UPDATE</code> triggers are not applied to the moved row.

This surprises audit and outbox designs that assume every SQL <code>UPDATE</code> produces one row-level update event. If source and destination leaves have different user-defined triggers, both sets may participate.

Statement-level behavior is different. Only statement-level <code>UPDATE</code> triggers on the table explicitly named by the statement fire; statement-level delete or insert triggers do not fire merely because internal row movement occurred.

Build a controlled trigger test on the supported PostgreSQL major version. Record <code>TG_OP</code>, <code>TG_TABLE_NAME</code>, old key, and new key into a test log, then validate the sequence for moved and non-moved updates.

## BEFORE Triggers Cannot Redirect Arbitrarily

PostgreSQL restricts partition routing through triggers. A row-level <code>BEFORE INSERT</code> trigger on a partitioned table cannot change the row so that a different partition becomes the final destination. For updates, <code>BEFORE UPDATE</code> modifications can affect the tuple and routing behavior, but interactions with source <code>BEFORE DELETE</code> and destination <code>BEFORE INSERT</code> triggers can be surprising.

Do not use leaf triggers as an undocumented partition router. Put valid key derivation in application logic, a generated input pipeline, or explicitly tested parent-level behavior.

## Concurrency Can Return SQLSTATE 40001

The <code>UPDATE</code> reference documents a special concurrency case. Suppose session 1 moves a row by changing its partition key while session 2, which can see that row, concurrently tries to update or delete it. Session 2 can detect the movement and raise a serialization failure with SQLSTATE <code>40001</code>.

This can occur even under circumstances where an equivalent non-partitioned update would find the new row version and proceed. The application should be able to retry the whole transaction where its transaction semantics permit.

A safe retry loop:

~~~text
begin transaction
perform all reads and writes
commit

if SQLSTATE == 40001:
    roll back the failed transaction if it is still active
    discard all transaction-local results
    wait with bounded randomized backoff
    retry the entire transaction from the beginning
~~~

Do not retry only the final <code>UPDATE</code> after other reads or side effects. A serialization retry re-executes the transaction's decision against a new database state. External effects such as messages or HTTP calls need an outbox or idempotency protocol.

Also cap attempts and expose exhaustion. Infinite immediate retries can amplify contention.

## Unique Constraints Are Rechecked at the Destination

For a local destination, the inserted version must satisfy destination check constraints, not-null constraints, and unique indexes. A primary or unique constraint declared on a partitioned parent must include all partition-key columns under PostgreSQL's declarative-partitioning rule, so changing the key changes the complete unique tuple.

Leaf-specific constraints can differ when they are not inherited from the parent. For example, a September leaf may have an additional valid check or a unique index not present in August. An update that was valid in the source can fail on destination insertion.

Test <code>ON CONFLICT</code> behavior separately; it is part of an insert statement and should not be inferred from update row movement.

## Foreign Keys Still Apply

If the moved row is on the referencing side, its foreign-key values must remain valid. On PostgreSQL 15 and later, if the moved row is on the referenced side and the update changes referenced-key components, PostgreSQL runs an update action on the partition root, so configured <code>ON UPDATE</code> actions apply. Earlier major versions handled foreign-key actions for row movement as a delete and insert; test the exact deployed major version.

The <code>UPDATE</code> reference documents an additional restriction: movement fails when a foreign key directly references an ancestor of the source partition that is not the same ancestor named in the update query. This is an edge case in multi-level partition hierarchies, especially when a foreign key references an intermediate partitioned ancestor while the update targets the root. Prefer defining such foreign keys on, and targeting, the partitioned root for ordinary DML. A direct update of a plain leaf cannot move the row to a sibling; it fails the leaf's partition constraint.

Foreign-key checks and cascades can touch other partitions. Index referencing columns and load-test the largest fan-out.

## Foreign-Table Partitions Are Directional

PostgreSQL permits movement from a local partition into a foreign-table partition when the foreign data wrapper supports tuple routing. It does not support moving a row from a foreign-table partition to another partition.

The <code>postgres_fdw</code> documentation has additional row-movement restrictions. A local-to-foreign success in one layout is not proof that a later update can move the row back. Treat archival foreign partitions as a one-way boundary unless the current FDW documentation and tests establish otherwise.

## Measure the Operational Cost

For logged local partitions, row movement can involve more work than a same-partition update:

- the deleted source heap tuple and its index entries, if any, require later vacuum cleanup, while any destination indexes receive new entries;
- additional relation locks may be acquired;
- delete and insert triggers may execute;
- WAL reflects work on both leaves;
- logical decoding or CDC output depends on the output plugin, while built-in logical replication depends on publication settings;
- with cumulative statistics enabled, per-table modification counters reflect activity on both leaves.

Use a restored workload and:

~~~sql
EXPLAIN (ANALYZE, BUFFERS, WAL, VERBOSE)
UPDATE events
SET occurred_at = occurred_at + INTERVAL '1 month'
WHERE tenant_id = 42
  AND event_id = 9001
  AND occurred_at = TIMESTAMPTZ '2026-08-01 12:00:00+00';
~~~

<code>EXPLAIN ANALYZE</code> executes the update. Run it only where the mutation is safe, usually inside a disposable environment. A rollback still performs work, takes locks, can fire triggers, and generates WAL.

Bulk corrections that move millions of rows can create intense write amplification and concurrency. Batch by a stable key, monitor replica lag and autovacuum, and keep transactions bounded. If correcting an entire partition's bound or data classification, building and attaching a corrected table may be more controllable than mass movement.

## Test These Cases

- update without changing the partition key;
- move to an existing leaf;
- move with no destination;
- move into a default leaf;
- destination unique or check violation;
- source and destination row triggers;
- concurrent update and delete, capturing SQLSTATE;
- foreign-key actions;
- local-to-foreign and unsupported foreign-to-other movement;
- direct leaf target versus parent target;
- logical replication or CDC output used by downstream systems.

Use <code>tableoid</code> in tests to assert physical location, but avoid exposing physical child names as a stable application API.

## Official Documentation

- [PostgreSQL: UPDATE](https://www.postgresql.org/docs/current/sql-update.html)
- [PostgreSQL: Trigger Behavior](https://www.postgresql.org/docs/current/trigger-definition.html)
- [PostgreSQL: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL: CREATE TRIGGER](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [PostgreSQL: Foreign Key Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [PostgreSQL: CREATE FOREIGN TABLE](https://www.postgresql.org/docs/current/sql-createforeigntable.html)
- [PostgreSQL: postgres_fdw](https://www.postgresql.org/docs/current/postgres-fdw.html)
- [PostgreSQL: Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)

## Conclusion

When a partition-key update issued against a partitioned ancestor crosses a leaf bound, PostgreSQL performs row movement as an internal delete and insert. The destination must exist and accept the row; applicable source delete and destination insert triggers fire; a concurrent updater can receive SQLSTATE <code>40001</code>; and foreign-table movement is directional. Target the partitioned root, make transactions safely retryable, and test triggers, constraints, foreign keys, and CDC before allowing partition-key changes at scale.
