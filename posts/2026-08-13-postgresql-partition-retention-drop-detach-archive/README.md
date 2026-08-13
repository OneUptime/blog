# Drop, Detach, or Archive? A Safe PostgreSQL Partition-Retention Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Data Retention, Table Partitioning, Archiving, Database Locks, Backup And Recovery

Description: Choose a PostgreSQL retention action from reversibility, lock behavior, restore requirements, and dependencies, then verify each partition before irreversible deletion.

---

Dropping, detaching, and archiving a PostgreSQL partition are different state transitions:

- **Drop** removes the live table and its data after commit and is replayed to physical standbys through WAL. Backups, snapshots, delayed or offline standbys, logical subscribers, and other independent copies may still retain or reconstruct the data.
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
| expire permanently, no recovery allowed | drop after authorization; expire backup and WAL recovery chains, snapshots, artifacts, and independent copies that can retain or reconstruct the pre-drop data |
| remove from hot path, retain locally for review | detach |
| retain for regulated restore | detach, export/backup, verify, then drop |
| keep queryable on cheaper PostgreSQL storage | detach or keep attached and move tablespace, subject to query design |

Do not call a detached table an archive if it shares the same database, storage failure, backup policy, and administrator access as the source.

When expiring PITR material, retain every WAL segment required by recovery chains that must remain usable; establishing and verifying an independent post-deletion base backup may be necessary before retiring older chains. Physical standbys normally replay the WAL-logged drop, so verify replay. Logical replication does not replicate DDL, so remove subscriber-side data explicitly; treat delayed or offline physical standbys as retained copies until they replay the drop or are reinitialized.

## Preflight the Exact Partition

Resolve the physical relation and bound from catalogs:

~~~sql
SELECT p.relid::oid AS relation_oid,
       format('%I.%I', n.nspname, c.relname) AS relation,
       format('%I.%I', pn.nspname, pc.relname) AS parent,
       p.isleaf,
       p.level,
       c.relkind,
       pg_get_expr(c.relpartbound, c.oid) AS bound,
       CASE WHEN p.isleaf AND c.relkind = 'r'
            THEN pg_size_pretty(pg_total_relation_size(p.relid))
       END AS leaf_total_size
FROM pg_partition_tree('public.events'::regclass) AS p
JOIN pg_class AS c ON c.oid = p.relid
JOIN pg_namespace AS n ON n.oid = c.relnamespace
JOIN pg_class AS pc ON pc.oid = p.parentrelid
JOIN pg_namespace AS pn ON pn.oid = pc.relnamespace
WHERE p.level > 0
ORDER BY p.level, n.nspname, c.relname;
~~~

Only choose a row with <code>isleaf</code> true. In a multilevel tree, validate the complete ancestor path: <code>parentrelid</code> is the immediate parent, and a leaf's own <code>relpartbound</code> alone may not express the root retention range.

The remaining commands assume an ordinary local leaf (<code>relkind = 'r'</code>) whose immediate parent is <code>public.events</code>. In a multilevel tree, use the immediate parent returned above as the target of <code>ALTER TABLE ... DETACH PARTITION</code>. A foreign-table leaf (<code>relkind = 'f'</code>) needs a foreign-table-specific workflow: use <code>DROP FOREIGN TABLE</code>, do not attempt a local tablespace move, and add <code>--include-foreign-data=server_pattern</code> for its foreign server if <code>pg_dump</code> must export its rows.

Verify minimum, maximum, row count or trusted maintained count, and policy cutoff:

~~~sql
SELECT count(*) AS rows,
       min(occurred_at) AS earliest,
       max(occurred_at) AS latest
FROM public.events_2025_07;
~~~

<code>count(*)</code> can be expensive. Use an approved estimate for discovery, but use a correctness-grade method before irreversible deletion. Partition bounds say which values are permitted, not that every stored row is semantically eligible under a policy based on another column.

Check foreign-key constraints involving the leaf; this is not a complete dependency inventory:

~~~sql
SELECT conname,
       conrelid::regclass AS referencing_table,
       confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE contype = 'f'
  AND (
      conrelid = 'public.events_2025_07'::regclass
      OR confrelid = 'public.events_2025_07'::regclass
  );
~~~

Also inventory catalog dependencies and review views, materialized views, rules, triggers, RLS policies, publications, sequences and defaults, ownership, grants, extension membership, and scripts that name the child.

## Drop: Fast and Irreversible After Commit

~~~sql
DROP TABLE public.events_2025_07 RESTRICT;
~~~

PostgreSQL documents dropping a partition as far faster than a bulk delete and notes that it avoids the vacuum overhead of deleting rows individually. The partition-maintenance section also states that dropping the partition requires <code>ACCESS EXCLUSIVE</code> on the parent.

Use <code>RESTRICT</code> first. <code>CASCADE</code> can remove dependent views or foreign-key constraints and is too consequential for an automated retention shortcut:

~~~sql
DROP TABLE public.events_2025_07 CASCADE;
~~~

Only run <code>CASCADE</code> when a reviewed dependency manifest shows every object it will remove and the policy authorizes it.

A drop is transactional, but after commit the normal rollback point is gone. Recovery then requires a usable recovery source: for example, a logical dump, or for PITR a suitable base backup plus the complete required WAL sequence. PITR restores the entire cluster rather than only the dropped table, and its restore time may far exceed the retention job's window.

## Detach: Preserve a Reversible Table

~~~sql
ALTER TABLE public.events
DETACH PARTITION public.events_2025_07;
~~~

The non-concurrent form requires <code>ACCESS EXCLUSIVE</code> on the parent. Current PostgreSQL supports:

~~~sql
ALTER TABLE public.events
DETACH PARTITION public.events_2025_07 CONCURRENTLY;
~~~

The <code>CONCURRENTLY</code> form reduces the parent lock requirement and completes through two transactions. It cannot run inside a transaction block and is not allowed when the partitioned table has a default partition. If interrupted, <code>DETACH PARTITION ... FINALIZE</code> completes a pending detach. At most one partition in a parent can be pending detach at a time.

Because it spans transactions, automation must record state and be able to distinguish:

- still attached;
- detach pending;
- detached;
- detached and archived;
- safe to drop.

Reconcile an interrupted operation through <code>pg_inherits.inhdetachpending</code>; <code>pg_partition_tree</code> does not expose the pending flag.

After detach, queries through <code>public.events</code> no longer include the rows, while direct queries to <code>public.events_2025_07</code> can. Grants, RLS, constraints, and dependencies need review; “not in parent” does not mean inaccessible. Direct writes are also possible, so quiesce them before the dump, keep them quiesced through the final drop, and compare the standalone table with the verified artifact again immediately before drop.

## Archive: Produce and Test a Recoverable Artifact

For a logical PostgreSQL archive, <code>pg_dump</code> can export the standalone table:

~~~bash
pg_dump \
  --format=custom \
  --table=public.events_2025_07 \
  --file=events_2025_07.dump \
  appdb
~~~

The command runs in the client environment; protect credentials and output paths. A custom-format dump is restored with <code>pg_restore</code>. A <code>--table</code> dump does not automatically include other database objects on which the table depends, so it is not guaranteed to restore into a clean database by itself. Table-selective dumps also omit large objects unless <code>--large-objects</code> is requested; that option includes all large objects in the database, not only objects referenced by the selected table. PostgreSQL does not automatically track or remove large objects referenced by OID values stored in table columns, and dropping the table can leave them orphaned. Inventory shared references, archive required large objects, and separately authorize any large-object deletion. Also inventory required types, functions, extensions, roles, and tablespaces, then test the complete restore. Record:

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
createdb --template=template0 archive_restore_test
pg_restore --exit-on-error --dbname=archive_restore_test events_2025_07.dump
~~~

Then validate schema, counts, hashes or samples, constraints, and expected queries. A successful command exit and nonzero file size do not prove a usable restore.

<code>COPY</code> or client <code>\copy</code> can produce a portable row file, but it may not preserve schema, indexes, constraints, privileges, or exact type settings. If using it, archive reviewed schema DDL separately and test the complete restore.

## Moving Tablespaces Is Tiering, Not Backup

After detach:

~~~sql
ALTER TABLE public.events_2025_07
SET TABLESPACE archive_tablespace;
~~~

This moves the relation to another PostgreSQL tablespace. Indexes are separate relations and may need separate moves. The operation takes locks and performs I/O.

A cheaper disk in the same cluster can be useful tiering. It remains exposed to cluster-wide operator mistakes, catalog loss, and any backup gap. PostgreSQL continuous archiving combines a base backup with archived WAL for cluster recovery; it does not mean “an old table exists in an archive schema.” Define independent backup and restore properties.

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
-> copy_deletion_verified
~~~

Each transition should be idempotent. Store relation OID and qualified name, bound, timestamps, actor or job identity, artifact checksum, verification result, approval reference, and any copy-deletion evidence. The final transition applies when policy requires eliminating recoverability and must cover retained artifacts, backup and WAL recovery chains or snapshots that can reconstruct the pre-deletion state, logical subscribers and other independent copies, and any database large objects identified by reference analysis. Verify that physical standbys have replayed the drop rather than treating normal WAL replay as a separate deletion.

Never select a deletion target from a loose name pattern alone. Resolve it through <code>pg_partition_tree</code>, validate its bound against a policy cutoff, and quote identifiers safely with server-side formatting where generating DDL.

## Bound Lock Waits

Use a session-level or transaction-local timeout appropriate to the operation:

~~~sql
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TABLE public.events_2025_07 RESTRICT;
COMMIT;
~~~

<code>lock_timeout</code> applies separately to each lock acquisition, not to total statement runtime. <code>DETACH ... CONCURRENTLY</code> cannot be placed in this transaction because its syntax is disallowed in a transaction block; set the session lock timeout and reset it afterward instead. That timeout does not cover the concurrent detach's wait for older transactions, so also use an appropriate session <code>statement_timeout</code> if total elapsed time must be bounded, and reconcile a pending detach if the command is interrupted.

Before retrying, inspect <code>pg_stat_activity</code>, <code>pg_locks</code>, and <code>pg_blocking_pids()</code>. Do not automatically kill a blocker simply because retention is late.

Schedule archive I/O separately from the detach operation. Detach first, then dump the standalone table without keeping the parent hierarchy locked.

## Handle Foreign Keys and Cascades Explicitly

Foreign keys can turn a local-looking retention action into a multi-table concern. Current <code>ALTER TABLE</code> documentation notes locks on tables referencing a partitioned table during detach. A referenced old partition may still be needed by retained referencing rows.

Do not use <code>TRUNCATE ... CASCADE</code> as a shortcut. PostgreSQL warns that truncating one partition with cascade can cascade to all referencing tables and all their partitions without distinguishing corresponding siblings.

Prove referential eligibility and test the exact drop/detach workflow on the supported PostgreSQL release.

## A Practical Workflow

1. Resolve the leaf through catalogs and freeze the qualified target.
2. Validate its bound and semantic eligibility.
3. Check dependencies, legal hold, physical-standby replay, independent subscribers or replicas, and backup capacity.
4. Set bounded lock behavior.
5. Detach, using <code>CONCURRENTLY</code> when supported by the layout and objective.
6. Verify the parent no longer returns the data and quiesce direct writes to the standalone table.
7. Dump or otherwise archive the standalone table.
8. Restore and validate the artifact.
9. Wait through the review or rollback period.
10. Obtain deletion authorization and revalidate the standalone table against the verified artifact.
11. Drop with <code>RESTRICT</code>.
12. Record completion and monitor storage reclamation.

For data that must be removed from the live database immediately and must not be newly archived, policy may require direct drop. The state machine still performs target, dependency, and authorization checks before the irreversible transition. Existing backup and WAL recovery chains or snapshots that can restore the pre-drop state must be expired under policy. Physical standbys must replay the drop, while logical subscribers and other independent copies require explicit handling; <code>DROP TABLE</code> alone does not satisfy a no-recovery requirement.

## Official Documentation

- [PostgreSQL: Partition Maintenance](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-MAINTENANCE)
- [PostgreSQL: Partition Information Functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-INFO-PARTITION)
- [PostgreSQL: ALTER TABLE and DETACH PARTITION](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL: DROP TABLE](https://www.postgresql.org/docs/current/sql-droptable.html)
- [PostgreSQL: DROP FOREIGN TABLE](https://www.postgresql.org/docs/current/sql-dropforeigntable.html)
- [PostgreSQL: TRUNCATE](https://www.postgresql.org/docs/current/sql-truncate.html)
- [PostgreSQL: pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL: pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)
- [PostgreSQL: SQL Dump and Restore](https://www.postgresql.org/docs/current/backup-dump.html)
- [PostgreSQL: Large Objects](https://www.postgresql.org/docs/current/lo.html)
- [PostgreSQL: Tablespaces](https://www.postgresql.org/docs/current/manage-ag-tablespaces.html)
- [PostgreSQL: Continuous Archiving and PITR](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [PostgreSQL: Hot Standby](https://www.postgresql.org/docs/current/hot-standby.html)
- [PostgreSQL: Dependency Tracking](https://www.postgresql.org/docs/current/ddl-depend.html)
- [PostgreSQL: pg_class](https://www.postgresql.org/docs/current/catalog-pg-class.html)
- [PostgreSQL: pg_constraint](https://www.postgresql.org/docs/current/catalog-pg-constraint.html)
- [PostgreSQL: pg_inherits](https://www.postgresql.org/docs/current/catalog-pg-inherits.html)
- [PostgreSQL: Logical Replication Restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)

## Conclusion

Drop removes the live relation after commit, detach is a reversible hierarchy change, and archive is a verified recovery capability. For most retention workflows, resolve and validate the leaf, detach it with bounded lock behavior, create and restore-test an independent artifact, then drop with <code>RESTRICT</code> after approval. Use direct drop only when policy requires immediate removal from the live database and the exact dependency and recovery consequences are understood; coordinate deletion or expiration of other copies separately.
