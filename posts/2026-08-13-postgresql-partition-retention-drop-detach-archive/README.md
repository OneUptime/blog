# Drop, Detach, or Archive? A Safe PostgreSQL Partition-Retention Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Data Retention, Table Partitioning, Archiving, Database Locks, Backup and Recovery

Description: Choose a PostgreSQL retention action from reversibility, lock behavior, restore requirements, and dependencies, then verify each partition before irreversible deletion.

---

Dropping, detaching, and archiving a PostgreSQL partition are different state transitions:

- **Drop** removes the table and its data from the database.
- **Detach** removes it from the partition hierarchy but preserves it as a standalone table.
- **Archive** is an operational outcome: preserve a verified copy in an approved storage and restore format. Detach or a tablespace move alone is not necessarily an archive.

The safest workflow makes removal reversible until policy and verification say it may become irreversible.

## Choose the Required End State

Ask four questions:

1. Must queries through the live parent stop seeing these rows immediately?
2. Must the data remain queryable in PostgreSQL?
3. Must it be restorable after the source table is dropped?
4. By what deadline must physical copies be deleted?

These produce different workflows:

| Requirement | Likely action |
| --- | --- |
| expire permanently, no recovery allowed | drop after authorization |
| remove from hot path, retain locally for review | detach |
| retain for regulated restore | detach, export/backup, verify, then drop |
| keep queryable on cheaper PostgreSQL storage | detach or keep attached and move tablespace, subject to query design |

Do not call a detached table an archive if it shares the same database, storage failure, backup policy, and administrator access as the source.

## Preflight the Exact Partition

Resolve the physical relation and bound from catalogs:

~~~sql
SELECT p.relid::regclass AS relation,
       p.parentrelid::regclass AS parent,
       pg_get_expr(c.relpartbound, c.oid) AS bound,
       pg_size_pretty(pg_total_relation_size(p.relid)) AS total_size
FROM pg_partition_tree('events'::regclass) AS p
JOIN pg_class AS c ON c.oid = p.relid
WHERE p.isleaf
ORDER BY p.relid::text;
~~~

Verify minimum, maximum, row count or trusted maintained count, and policy cutoff:

~~~sql
SELECT count(*) AS rows,
       min(occurred_at) AS earliest,
       max(occurred_at) AS latest
FROM events_2025_07;
~~~

<code>count(*)</code> can be expensive. Use an approved estimate for discovery, but use a correctness-grade method before irreversible deletion. Partition bounds say which values are permitted, not that every stored row is semantically eligible under a policy based on another column.

Check dependencies:

~~~sql
SELECT conname,
       conrelid::regclass AS referencing_table,
       confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE contype = 'f'
  AND (
      conrelid = 'events_2025_07'::regclass
      OR confrelid = 'events_2025_07'::regclass
  );
~~~

Also review views, publications, ownership, grants, and scripts that name the child.

## Drop: Fast and Irreversible

~~~sql
DROP TABLE events_2025_07 RESTRICT;
~~~

PostgreSQL documents dropping a partition as far faster than a bulk delete and notes that it avoids the vacuum overhead of deleting rows individually. The partition-maintenance section also states that dropping the partition requires <code>ACCESS EXCLUSIVE</code> on the parent.

Use <code>RESTRICT</code> first. <code>CASCADE</code> can remove dependent views or foreign-key constraints and is too consequential for an automated retention shortcut:

~~~sql
DROP TABLE events_2025_07 CASCADE;
~~~

Only run <code>CASCADE</code> when a reviewed dependency manifest shows every object it will remove and the policy authorizes it.

A drop is transactional, but after commit the normal rollback point is gone. Recovery depends on backups and WAL retention, whose restore time may far exceed the retention job's window.

## Detach: Preserve a Reversible Table

~~~sql
ALTER TABLE events
DETACH PARTITION events_2025_07;
~~~

The non-concurrent form requires a strong parent lock. Current PostgreSQL supports:

~~~sql
ALTER TABLE events
DETACH PARTITION events_2025_07 CONCURRENTLY;
~~~

The <code>CONCURRENTLY</code> form reduces the parent lock requirement and completes through two transactions. It cannot run inside a transaction block and is not allowed when the partitioned table has a default partition. If interrupted, <code>DETACH PARTITION ... FINALIZE</code> completes a pending detach. At most one partition in a parent can be pending detach at a time.

Because it spans transactions, automation must record state and be able to distinguish:

- still attached;
- detach pending;
- detached;
- detached and archived;
- safe to drop.

After detach, queries through <code>events</code> no longer include the rows, while direct queries to <code>events_2025_07</code> can. Grants, RLS, constraints, and dependencies need review; “not in parent” does not mean inaccessible.

## Archive: Produce and Test a Recoverable Artifact

For a logical PostgreSQL archive, <code>pg_dump</code> can export the standalone table:

~~~bash
pg_dump \
  --format=custom \
  --table=public.events_2025_07 \
  --file=events_2025_07.dump \
  appdb
~~~

The command runs in the client environment; protect credentials and output paths. A custom-format dump is restored with <code>pg_restore</code>. Record:

- PostgreSQL source major and minor version;
- dump command and options;
- schema-qualified relation;
- partition bound and policy cutoff;
- row count and content verification method;
- artifact byte size and cryptographic checksum;
- encryption and storage location;
- retention and legal-hold metadata.

Restore into an isolated database:

~~~bash
createdb archive_restore_test
pg_restore --dbname=archive_restore_test events_2025_07.dump
~~~

Then validate schema, counts, hashes or samples, constraints, and expected queries. A successful command exit and nonzero file size do not prove a usable restore.

<code>COPY</code> or client <code>\copy</code> can produce a portable row file, but it may not preserve schema, indexes, constraints, privileges, or exact type settings. If using it, archive reviewed schema DDL separately and test the complete restore.

## Moving Tablespaces Is Tiering, Not Backup

After detach:

~~~sql
ALTER TABLE events_2025_07
SET TABLESPACE archive_tablespace;
~~~

This moves the relation to another PostgreSQL tablespace. Indexes are separate relations and may need separate moves. The operation takes locks and performs I/O.

A cheaper disk in the same cluster can be useful tiering. It remains exposed to cluster-wide operator mistakes, catalog loss, and any backup gap. Continuous archiving refers to WAL-based recovery, not “an old table exists in an archive schema.” Define independent backup and restore properties.

## Use a State Machine

Keep a retention ledger:

~~~text
eligible
-> detach_requested
-> detached
-> archive_written
-> restore_verified
-> deletion_approved
-> dropped
~~~

Each transition should be idempotent. Store relation OID and qualified name, bound, timestamps, actor or job identity, artifact checksum, verification result, and approval reference.

Never select a deletion target from a loose name pattern alone. Resolve it through <code>pg_partition_tree</code>, validate its bound against a policy cutoff, and quote identifiers safely with server-side formatting where generating DDL.

## Bound Lock Waits

Use a session-level or transaction-local timeout appropriate to the operation:

~~~sql
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TABLE events_2025_07 RESTRICT;
COMMIT;
~~~

<code>DETACH ... CONCURRENTLY</code> cannot be placed in this transaction because its syntax is disallowed in a transaction block; set the session timeout and reset it afterward instead.

Before retrying, inspect <code>pg_stat_activity</code>, <code>pg_locks</code>, and <code>pg_blocking_pids()</code>. Do not automatically kill a blocker simply because retention is late.

Schedule archive I/O separately from the short detach window. Detach first, then dump the standalone table without keeping the parent hierarchy locked.

## Handle Foreign Keys and Cascades Explicitly

Foreign keys can turn a local-looking retention action into a multi-table concern. Current <code>ALTER TABLE</code> documentation notes locks on tables referencing a partitioned table during detach. A referenced old partition may still be needed by retained referencing rows.

Do not use <code>TRUNCATE ... CASCADE</code> as a shortcut. PostgreSQL warns that truncating one partition with cascade can cascade to all referencing tables and all their partitions without distinguishing corresponding siblings.

Prove referential eligibility and test the exact drop/detach workflow on the supported PostgreSQL release.

## A Practical Workflow

1. Resolve the leaf through catalogs and freeze the qualified target.
2. Validate its bound and semantic eligibility.
3. Check dependencies, legal hold, replicas, and backup capacity.
4. Set bounded lock behavior.
5. Detach, using <code>CONCURRENTLY</code> when supported by the layout and objective.
6. Verify the parent no longer returns the data.
7. Dump or otherwise archive the standalone table.
8. Restore and validate the artifact.
9. Wait through the review or rollback period.
10. Obtain deletion authorization.
11. Drop with <code>RESTRICT</code>.
12. Record completion and monitor storage reclamation.

For data that must be destroyed immediately and cannot be archived, policy may require direct drop. The state machine still performs target, dependency, and authorization checks before the irreversible transition.

## Official Documentation

- [PostgreSQL: Partition Maintenance](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE)
- [PostgreSQL: ALTER TABLE and DETACH PARTITION](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL: DROP TABLE](https://www.postgresql.org/docs/current/sql-droptable.html)
- [PostgreSQL: TRUNCATE](https://www.postgresql.org/docs/current/sql-truncate.html)
- [PostgreSQL: pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL: pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)
- [PostgreSQL: Tablespaces](https://www.postgresql.org/docs/current/manage-ag-tablespaces.html)
- [PostgreSQL: Continuous Archiving and PITR](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [PostgreSQL: Dependency Tracking](https://www.postgresql.org/docs/current/ddl-depend.html)

## Conclusion

Drop is the final deletion, detach is a reversible hierarchy change, and archive is a verified recovery capability. For most retention workflows, resolve and validate the leaf, detach it with bounded lock behavior, create and restore-test an independent artifact, then drop with <code>RESTRICT</code> after approval. Use direct drop only when policy requires immediate destruction and the exact dependency and recovery consequences are understood.
