# Validation Summary: Should a Multi-Tenant Table Partition by Tenant, Time, or Both?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL declarative table partitioning
- Range, hash, list, and multilevel partitioning
- Partition pruning and indexing
- Multi-tenant database design and data retention
- Primary keys, unique constraints, and foreign keys
- PostgreSQL row-level security

## Sources Consulted
- [PostgreSQL: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL: Partitioning Best Practices](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-BEST-PRACTICES)
- [PostgreSQL: Partition Pruning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITION-PRUNING)
- [PostgreSQL: Declarative Partitioning Limitations](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-LIMITATIONS)
- [PostgreSQL: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL: CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html)
- [PostgreSQL: CREATE FOREIGN TABLE](https://www.postgresql.org/docs/current/sql-createforeigntable.html)
- [PostgreSQL: Inheritance](https://www.postgresql.org/docs/current/ddl-inherit.html)
- [PostgreSQL: Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL: CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [PostgreSQL: CREATE FUNCTION security](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- [PostgreSQL: Foreign Key Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [PostgreSQL: Creating a Database Cluster](https://www.postgresql.org/docs/current/creating-cluster.html)
- [PostgreSQL: Managing Databases](https://www.postgresql.org/docs/current/managing-databases.html)
- [PostgreSQL: Partitioning Information Functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-INFO-PARTITION)

## Issues Found
- The time-partitioning section said a tenant-and-time query “uses” the tenant index. PostgreSQL's cost-based planner can instead choose a sequential scan, so this was changed to “can use” the index.
- The hash-partitioning section categorically described hash partitions as local relations. PostgreSQL can use foreign tables as partitions in compatible designs, so the statement was scoped to the local partitions shown in the example.
- The multilevel object-count example counted 2,304 leaf indexes but did not acknowledge the partitioned index objects at the root and monthly-parent levels. The wording now distinguishes the leaf index count and notes those additional objects.
- The dedicated-tenant guidance suggested a separate database without saying that another database in the same PostgreSQL cluster still shares the server instance. It now specifies a database on a separate PostgreSQL cluster or shard.
- The Partition Information Functions link pointed to `functions-info.html`, but the referenced anchor is on `functions-admin.html` in the current PostgreSQL documentation. The URL was corrected.

## Review Notes
All SQL examples were executed successfully on PostgreSQL 14.17, and their syntax and behavior were cross-checked against the current PostgreSQL 18 documentation. The time-then-hash primary key includes both levels' partition keys and is valid; detaching or dropping the top-level month operates on its subpartition tree. The pruning, retention, uniqueness, foreign-key, RLS, and direct-child-access explanations are otherwise technically correct. PostgreSQL “current” documentation is version-relative, so the linked section numbers may change when a new major version becomes current.
