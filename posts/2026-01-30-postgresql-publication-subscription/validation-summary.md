# Validation Summary: How to Create PostgreSQL Publication/Subscription

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL (versions 10 through 16)
- PostgreSQL logical replication (CREATE PUBLICATION / CREATE SUBSCRIPTION)
- Write-Ahead Log (WAL)
- pg_hba.conf access control
- pg_dump / psql CLI tools
- System catalogs: pg_publication, pg_publication_tables, pg_subscription, pg_stat_subscription, pg_replication_slots
- Replication functions: pg_wal_lsn_diff, pg_current_wal_lsn, pg_replication_origin_advance

## Sources Consulted
- PostgreSQL 10 CREATE PUBLICATION docs — https://www.postgresql.org/docs/10/sql-createpublication.html
- PostgreSQL 15 row filtering — https://www.postgresql.org/docs/15/logical-replication-row-filter.html
- PostgreSQL 15 CREATE PUBLICATION (column lists) — https://www.postgresql.org/docs/15/sql-createpublication.html
- PostgreSQL 14 CREATE SUBSCRIPTION (binary option) — https://www.postgresql.org/docs/14/sql-createsubscription.html
- PostgreSQL Logical Replication Quick Setup — https://www.postgresql.org/docs/current/logical-replication-quick-setup.html
- PostgreSQL 16 Logical Replication Restrictions — https://www.postgresql.org/docs/16/logical-replication-restrictions.html
- PostgreSQL 13 Release Notes (partitioned table support) — https://www.postgresql.org/docs/13/release-13.html
- PostgreSQL System Administration Functions — https://www.postgresql.org/docs/current/functions-admin.html

## Issues Found

**1. Incorrect `pg_hba.conf` entry for the "replication" pseudo-database (fixed).**
The original Step 3 included two entries — one for the actual database (`mydb`) and a second one for the `replication` pseudo-database. The `replication` pseudo-database keyword in `pg_hba.conf` is only used for physical streaming replication. Logical replication uses a normal client connection to the actual database, so the second entry is unnecessary (and could mislead readers into thinking it is required). Removed the extra entry and added a clarifying comment that logical replication connects to the actual database name.

## Review Notes

- All SQL examples (CREATE PUBLICATION, CREATE SUBSCRIPTION, ALTER PUBLICATION, ALTER SUBSCRIPTION, system catalog queries) are syntactically correct against PostgreSQL 10–16.
- Row filtering (PG 15+), column filtering (PG 15+), and `binary = true` (PG 14+) version annotations are accurate.
- The "No sequence sync" limitation remains accurate as of PostgreSQL 16 — sequences are still not replicated by logical replication.
- "Partitioned tables: Fully supported in PostgreSQL 13+" is accurate (PG 13 added `publish_via_partition_root`).
- `pg_replication_origin_advance('pg_<subscription_oid>', 'X/XXXXXXXX')` uses the correct function signature and origin-naming convention. Worth noting for future readers: PostgreSQL 15+ provides a friendlier alternative, `ALTER SUBSCRIPTION ... SKIP (lsn = '0/0')`, for skipping a single conflicting transaction — but the original example is still valid.
- The post does not call out that `CREATE PUBLICATION FOR ALL TABLES` requires superuser privileges; this is a useful caveat but not a technical error in the existing text.
- `max_replication_slots = 10` and `max_wal_senders = 10` match the PostgreSQL 10+ defaults; the values are redundant but harmless.
