# Validation Summary: Drop, Detach, or Archive? A Safe PostgreSQL Partition-Retention Workflow

## Status
validated

## Post Type
Technical guide and operational runbook

## Technologies Covered
- PostgreSQL declarative table partitioning
- PostgreSQL system catalogs and partition information functions
- Partition drop and concurrent or non-concurrent detach operations
- PostgreSQL lock management and timeout settings
- Logical dumps with `pg_dump` and restores with `pg_restore`
- Tablespaces and storage tiering
- Continuous archiving, WAL, PITR, and physical standbys
- Logical replication and subscriber retention
- Foreign tables and large objects

## Sources Consulted
- [PostgreSQL: Table Partitioning and Partition Maintenance](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-MAINTENANCE)
- [PostgreSQL: Partition Information Functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-INFO-PARTITION)
- [PostgreSQL: `ALTER TABLE` and `DETACH PARTITION`](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL: `DROP TABLE`](https://www.postgresql.org/docs/current/sql-droptable.html)
- [PostgreSQL: `DROP FOREIGN TABLE`](https://www.postgresql.org/docs/current/sql-dropforeigntable.html)
- [PostgreSQL: `TRUNCATE`](https://www.postgresql.org/docs/current/sql-truncate.html)
- [PostgreSQL: `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL: `pg_restore`](https://www.postgresql.org/docs/current/app-pgrestore.html)
- [PostgreSQL: `createdb`](https://www.postgresql.org/docs/current/app-createdb.html)
- [PostgreSQL: SQL Dump and Restore](https://www.postgresql.org/docs/current/backup-dump.html)
- [PostgreSQL: `COPY`](https://www.postgresql.org/docs/current/sql-copy.html)
- [PostgreSQL: Tablespaces](https://www.postgresql.org/docs/current/manage-ag-tablespaces.html)
- [PostgreSQL: Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [PostgreSQL: Hot Standby](https://www.postgresql.org/docs/current/hot-standby.html)
- [PostgreSQL: Logical Replication Restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [PostgreSQL: Large Objects and the `lo` Module](https://www.postgresql.org/docs/current/lo.html)
- [PostgreSQL: Dependency Tracking](https://www.postgresql.org/docs/current/ddl-depend.html)
- [PostgreSQL: `pg_class`](https://www.postgresql.org/docs/current/catalog-pg-class.html)
- [PostgreSQL: `pg_constraint`](https://www.postgresql.org/docs/current/catalog-pg-constraint.html)
- [PostgreSQL: `pg_inherits`](https://www.postgresql.org/docs/current/catalog-pg-inherits.html)
- [PostgreSQL: `lock_timeout` and `statement_timeout`](https://www.postgresql.org/docs/current/runtime-config-client.html)
- [PostgreSQL: `pg_locks`](https://www.postgresql.org/docs/current/view-pg-locks.html)

## Issues Found
- The detach examples named `public.events` as the parent without limiting the example to a direct child. In a multilevel partition tree, a leaf can be detached only from its immediate partitioned parent. The assumptions now state that the example leaf is directly under `public.events` and instruct multilevel workflows to use the immediate parent returned by `pg_partition_tree`.
- The catalog query calculated `pg_total_relation_size` for every leaf, including foreign-table leaves, for which it does not represent remote data size. The size expression is now limited to ordinary local leaves with `relkind = 'r'`.
- The no-recovery workflow treated all WAL archives and replica copies alike. Deleting arbitrary WAL segments can break recovery chains that must remain usable, physical standbys normally replay the WAL-logged drop, and logical replication does not replicate DDL. The post now scopes expiration to recovery chains that can reconstruct the pre-drop state, requires retaining WAL needed by surviving chains, distinguishes physical-standby replay from logical-subscriber cleanup, and calls out delayed or offline standbys.
- The selective-dump discussion did not explain that `--large-objects` includes all database large objects or that dropping a table containing large-object OIDs can leave the large objects orphaned. The post now requires shared-reference analysis, archive selection, and separately authorized large-object cleanup.
- The timeout discussion could imply that `lock_timeout` bounds the whole concurrent detach. It applies separately to lock acquisitions and does not cover the wait for older transactions between the concurrent detach phases. The post now recommends `statement_timeout` when a total elapsed-time bound is required and reminds automation to reconcile a pending detach after interruption.

## Review Notes
- Reviewed against the PostgreSQL 18 current documentation on 2026-08-13. The documented features and commands are also available in the currently supported PostgreSQL 14 through 18 releases.
- The catalog query, local and foreign leaf handling, regular and concurrent detach syntax, `DROP TABLE`, `DROP FOREIGN TABLE`, and the custom-format dump/restore flow were exercised in disposable PostgreSQL 14.17 clusters. The logical archive restored successfully with the expected row count and date range.
- `pg_dump` cannot dump from a server newer than its own major version, and output is not guaranteed to load into an older PostgreSQL major release. A production ledger should record the dump and restore client versions in addition to the source server version.
- Text or CSV `COPY` output can be portable when encoding, column order, `DateStyle`, `IntervalStyle`, and relevant type settings are controlled. Binary `COPY` is less portable across PostgreSQL versions and architectures.
