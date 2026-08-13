# Convert a Live PostgreSQL Table to Partitioning With Minimal Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Table Partitioning, Database Migration, Logical Replication, Zero Downtime, Data Validation

Description: Migrate a live PostgreSQL table to a partitioned replacement with a shadow schema, ordered change capture, rehearsed validation, and a short dependency-aware cutover.

---

PostgreSQL cannot change a regular table into a partitioned table in place. Current documentation is explicit: a regular table cannot be converted to partitioned or vice versa, although existing tables can be attached as partitions. A live conversion therefore creates a new table identity, moves or attaches data, keeps concurrent changes synchronized, and cuts the application over.

“Minimal downtime” is not a single SQL command. It is a migration protocol whose correctness depends on snapshot boundaries, change ordering, keys, dependencies, and rollback.

## Choose the Migration Shape

Three broad shapes are useful:

1. **Maintenance-window copy:** stop writes, copy into a new hierarchy, validate, and switch. It is simplest and should be preferred when the measured outage fits the objective.
2. **Shadow table plus change capture:** build and backfill while the source remains writable, replay changes in commit order, briefly stop writes for final catch-up and cutover.
3. **Attach pre-existing tables:** when data is already split into non-overlapping regular tables with matching schemas and validated bounds, attach them instead of copying.

Attaching one unsplit table as a catch-all does not magically produce useful historical partitions. A <code>DEFAULT</code> attachment can keep data reachable, but later carving explicit ranges out of it requires moving rows and can scan and lock the default table.

## Inventory Semantics Before DDL

Capture more than columns:

~~~bash
pg_dump --schema-only --table=public.events appdb > events-schema.sql
~~~

Do not treat this table-scoped dump as a complete dependency inventory. With <code>--table</code>, <code>pg_dump</code> does not automatically include every related object; inspect the catalogs or a full database-wide schema-only dump for inbound foreign keys, views, functions, and other dependencies.

Review:

- primary, unique, check, exclusion, and foreign-key constraints;
- indexes and included columns;
- defaults, identity columns, sequences, and sequence ownership;
- generated columns and collations;
- triggers and row-level security policies;
- grants, comments, publications, replica identity, and statistics objects;
- views, materialized views, functions, and foreign keys depending on the table;
- application SQL that names child tables or assumes a key is global.

A renamed replacement does not inherit the old table's object identity. Catalog-tracked dependencies such as parsed views and foreign keys refer to object OIDs, not merely relation names. Renaming <code>events</code> to <code>events_old</code> and <code>events_new</code> to <code>events</code> does not retarget an existing view or foreign key to the new OID. Function bodies stored as string literals can resolve relation names at execution time without a catalog-tracked table dependency, so inspect those bodies separately. Plan to recreate or deliberately rebind dependencies during cutover.

## Build the Target Hierarchy

Use the final schema and a key compatible with real predicates and constraints:

~~~sql
CREATE TABLE public.events_new (
    tenant_id bigint NOT NULL,
    event_id bigint NOT NULL,
    occurred_at timestamptz NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    PRIMARY KEY (tenant_id, event_id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE public.events_new_2026_08
PARTITION OF public.events_new
FOR VALUES FROM ('2026-08-01 00:00:00+00')
         TO   ('2026-09-01 00:00:00+00');
~~~

Create every partition covering source data, late-arrival allowance, and near-future writes. Decide explicitly how nulls and out-of-range values behave. Range partition keys do not route null to an ordinary range; a default partition can catch unmatched rows but adds later maintenance cost.

Indexes declared on the parent create child indexes. For a large live target, PostgreSQL cannot run <code>CREATE INDEX CONCURRENTLY</code> directly on the partitioned parent. Its partitioning guide describes creating an index on <code>ONLY</code> the parent, creating leaf indexes concurrently, and attaching them. Use that staged pattern where lock requirements justify it.

## Establish a Correct Change Boundary

The dangerous migration is:

~~~text
copy all rows
start dual writes
switch
~~~

Writes committed between the copy snapshot and dual-write start are missing. Reversing the order naively is also unsafe: a trigger may write a newer version to the target, after which an old snapshot copy conflicts with it or, under a blind upsert, overwrites it.

A correct change-capture design establishes an ordered boundary:

1. start capturing changes at a known log position or in an atomic transaction boundary;
2. take a consistent source snapshot associated with that boundary;
3. copy snapshot rows;
4. apply later inserts, updates, deletes, and any allowed truncates in transactional order;
5. continue until lag is negligible;
6. stop or fence source writes;
7. apply through the final confirmed position.

PostgreSQL logical replication implements the general snapshot-then-continuous-change model. It uses replica identity, usually a primary key, for updates and deletes. When the publisher is partitioned and publisher and subscriber partition layouts differ, a publication with <code>publish_via_partition_root = true</code> publishes changes using the publisher root's identity and schema. With this option, a <code>TRUNCATE</code> issued directly against a leaf partition is not replicated.

Built-in subscriptions match publisher and subscriber tables by fully qualified name, so they cannot replicate <code>public.events</code> directly into <code>public.events_new</code>. Native logical replication is therefore often easiest when the target is a separate PostgreSQL database or instance where the replacement can use the same qualified name. If the target must remain in the same database under a different name, teams commonly use a purpose-built CDC consumer with explicit name mapping or a reviewed trigger-backed change log. Do not improvise a trigger-backed design without proving transaction ordering, delete handling, retry idempotency, bulk-statement behavior, and failure recovery. Row triggers do not capture <code>TRUNCATE</code>, so prohibit it during the migration or capture it separately with a statement-level mechanism.

## Account for Logical Replication Limits

PostgreSQL's current restrictions matter to cutover:

- DDL and schema are not replicated;
- sequence state is not replicated;
- large objects are not replicated;
- tables need compatible target schemas;
- update/delete publication needs a suitable replica identity;
- conflicts can stop apply until resolved;
- attaching a table into a partition tree whose root is published with <code>publish_via_partition_root = true</code> does not itself publish the attached table's existing rows.

Create target DDL separately, keep additive changes synchronized, and explicitly advance sequences before enabling writes:

~~~sql
SELECT setval(
    pg_get_serial_sequence('public.events_new', 'event_id'),
    (SELECT max(event_id) FROM public.events_new),
    true
);
~~~

Only use this example if <code>event_id</code> actually owns a sequence and the table is nonempty. Empty-table behavior, identity configuration, and concurrent allocation require a migration-specific statement. Distributed or application-generated IDs may not use a sequence at all.

## Backfill in Restartable Units

Partition-aligned batches make progress visible:

~~~sql
INSERT INTO public.events_new
    (tenant_id, event_id, occurred_at, event_type, payload)
SELECT tenant_id, event_id, occurred_at, event_type, payload
FROM public.events
WHERE occurred_at >= TIMESTAMPTZ '2026-07-01 00:00:00+00'
  AND occurred_at <  TIMESTAMPTZ '2026-08-01 00:00:00+00';
~~~

For a captured consistent snapshot, run the query in the snapshot-aware process. Arbitrarily opening a new transaction for each month gives each batch a different view; that is acceptable only when the CDC protocol guarantees reconciliation.

Throttle by measured replica lag, WAL growth, storage I/O, checkpoint pressure, autovacuum, and application latency. A single giant transaction retains resources and makes rollback and restart expensive. Record batch bounds and checksums in a migration control table so reruns are deterministic.

## Validate More Than Counts

Counts can detect gross omissions but not swapped values or offsetting errors. Compare equivalent source and target results after the target has applied through the same captured or fenced change position. For example, one side of that comparison is:

~~~sql
SELECT date_trunc('month', occurred_at AT TIME ZONE 'UTC') AS month_utc,
       count(*) AS rows,
       min(event_id) AS min_id,
       max(event_id) AS max_id
FROM public.events_new
GROUP BY 1
ORDER BY 1;
~~~

Use several independent checks:

- row counts per partition key interval;
- null counts and min/max values;
- duplicate checks for every intended unique domain;
- deterministic hashes over stable canonical columns and bounded chunks;
- random key samples read from both tables;
- foreign-key and check-constraint validation;
- <code>EXPLAIN</code> for critical queries;
- CDC lag and conflict counters.

Hash canonicalization is application-specific. JSON key ordering, numeric formatting, collations, and null representation can make textual hashes differ despite acceptable values. Define and test the encoding.

## Rehearse a Dependency-Aware Cutover

A same-database cutover often requires a short write fence:

~~~text
1. reject or queue application writes
2. wait for in-flight write transactions
3. record final source change position
4. apply through that position
5. validate final deltas
6. replace dependencies and application routing
7. enable target writes
~~~

If using table renames, acquire an appropriate lock with a bounded session <code>lock_timeout</code>, but remember that renames alone do not rebind views or foreign keys. Generate reviewed DDL to recreate dependencies against the target. Test prepared statements, grants, RLS, sequences, and ownership.

Keep the old table read-only for a defined rollback period if storage and policy permit. Rollback after new writes begin needs reverse synchronization; merely renaming tables back loses target-only changes. State the rollback cutoff explicitly.

## Attach When the Data Is Already Split

For a standalone table whose rows all fit one bound:

~~~sql
ALTER TABLE events_2026_07_staging
ADD CONSTRAINT events_2026_07_bound
CHECK (
    occurred_at >= TIMESTAMPTZ '2026-07-01 00:00:00+00'
    AND occurred_at < TIMESTAMPTZ '2026-08-01 00:00:00+00'
);

ALTER TABLE events_new
ATTACH PARTITION events_2026_07_staging
FOR VALUES FROM ('2026-07-01 00:00:00+00')
         TO   ('2026-08-01 00:00:00+00');
~~~

A valid matching check lets PostgreSQL avoid the validation scan. <code>ATTACH PARTITION</code> takes a <code>SHARE UPDATE EXCLUSIVE</code> lock on the parent and <code>ACCESS EXCLUSIVE</code> locks on the table being attached and on any default partition. The attached table must have the same columns and types and all parent <code>NOT NULL</code> and inheritable <code>CHECK</code> constraints. For each parent index, PostgreSQL creates a corresponding index or attaches an equivalent existing one; missing parent <code>UNIQUE</code> and <code>PRIMARY KEY</code> constraints are created. If the target has a default partition, add a valid <code>CHECK</code> constraint that excludes the new bound to avoid a scan; otherwise PostgreSQL scans the default partition while holding its lock.

## Official Documentation

- [PostgreSQL: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL: ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL: Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [PostgreSQL: Logical Replication Restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [PostgreSQL: CREATE PUBLICATION](https://www.postgresql.org/docs/current/sql-createpublication.html)
- [PostgreSQL: Replica Identity](https://www.postgresql.org/docs/current/logical-replication-publication.html)
- [PostgreSQL: pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL: CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html)
- [PostgreSQL: Trigger Behavior](https://www.postgresql.org/docs/current/trigger-definition.html)

## Conclusion

A live partitioning conversion creates a new table; PostgreSQL does not rewrite the old table into a partitioned parent in place. Build the full target, establish a consistent snapshot and ordered change stream, backfill in restartable units, validate keys and values, and use a short write fence for final catch-up and dependency-aware cutover. Renames, dual writes, and counts alone are not correctness protocols. Rehearse the full sequence-including rollback-at production scale.
