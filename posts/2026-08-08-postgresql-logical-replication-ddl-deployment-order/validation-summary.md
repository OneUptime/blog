# Validation Summary: Deploy PostgreSQL DDL Safely with Logical Replication

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- PostgreSQL logical replication
- PostgreSQL DDL and schema migrations
- Publications, subscriptions, row filters, and column lists
- Replica identity, constraints, indexes, and generated columns
- Zero-downtime deployment sequencing and replication monitoring

## Sources Consulted

- [PostgreSQL logical replication restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [PostgreSQL subscription behavior](https://www.postgresql.org/docs/current/logical-replication-subscription.html)
- [PostgreSQL logical replication architecture](https://www.postgresql.org/docs/current/logical-replication-architecture.html)
- [PostgreSQL 18 `CREATE PUBLICATION`](https://www.postgresql.org/docs/18/sql-createpublication.html)
- [PostgreSQL 18 `ALTER PUBLICATION`](https://www.postgresql.org/docs/18/sql-alterpublication.html)
- [PostgreSQL 15 column lists](https://www.postgresql.org/docs/15/logical-replication-col-lists.html)
- [PostgreSQL 15 row filters](https://www.postgresql.org/docs/15/logical-replication-row-filter.html)
- [PostgreSQL `ALTER SUBSCRIPTION`](https://www.postgresql.org/docs/current/sql-altersubscription.html)
- [PostgreSQL generated-column replication](https://www.postgresql.org/docs/current/logical-replication-gencols.html)
- [PostgreSQL 15 `pg_publication_tables`](https://www.postgresql.org/docs/15/view-pg-publication-tables.html) and [`pg_publication_rel`](https://www.postgresql.org/docs/15/catalog-pg-publication-rel.html)
- [PostgreSQL `pg_subscription`](https://www.postgresql.org/docs/current/catalog-pg-subscription.html), [`pg_attribute`](https://www.postgresql.org/docs/current/catalog-pg-attribute.html), and [`pg_attrdef`](https://www.postgresql.org/docs/current/catalog-pg-attrdef.html)
- [PostgreSQL `ALTER TABLE`](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL `CREATE INDEX`](https://www.postgresql.org/docs/current/sql-createindex.html) and [`pg_index`](https://www.postgresql.org/docs/current/catalog-pg-index.html)
- [PostgreSQL logical replication monitoring](https://www.postgresql.org/docs/current/logical-replication-monitoring.html) and [`pg_subscription_rel`](https://www.postgresql.org/docs/current/catalog-pg-subscription-rel.html)
- [PostgreSQL `session_replication_role`](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-SESSION-REPLICATION-ROLE)
- PostgreSQL official source for [`pg_publication_tables` on PostgreSQL 15](https://github.com/postgres/postgres/blob/REL_15_STABLE/src/backend/catalog/system_views.sql), [publication validation on PostgreSQL 18](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/commands/publicationcmds.c), and [`ALTER TABLE` dependency handling in PostgreSQL 19 development](https://github.com/postgres/postgres/blob/master/src/backend/commands/tablecmds.c)

## Issues Found

- The catalog discussion described `pg_publication_tables.attnames` as the effective replicated column set and treated `prattrs` as proof of direct table publication. Clarified the PostgreSQL 15-17 generated-column discrepancy, renamed the query alias, and explained that inheritance expansion can create child catalog mappings.
- The staged `NOT VALID` example could be read as adding the subscriber constraint before old replicated writes had drained, and it showed only `VALIDATE CONSTRAINT` for the subscriber. Reordered the procedure and showed both required statements so queued old-writer changes cannot be rejected.
- The abbreviated `ALTER PUBLICATION ... SET TABLE` example omitted the restriction on column lists for partitioned roots when `publish_via_partition_root = false`. Added the required prerequisite and leaf-partition guidance.
- The replica-identity guidance omitted the special case for `REPLICA IDENTITY FULL`, where publishing `UPDATE` or `DELETE` with any explicit column list fails. Added the restriction and the two valid alternatives.
- The column-drop procedure did not explicitly wait for pre-drop transactions to drain before dropping the subscriber column. Added a post-change canary replay gate to both drop sequences.
- The row-filter replacement guidance did not mention that changing a filter does not reconcile existing subscriber rows. Added explicit backfill, deletion, or controlled-resynchronization requirements.
- The type-change claim applied the PostgreSQL 15 behavior indefinitely. Scoped the column-list and row-filter restriction to PostgreSQL 15-18 and documented the PostgreSQL 19 Beta 2 distinction for list-only dependencies.

## Review Notes

The commands and catalog queries are syntactically valid for their stated versions. PostgreSQL 18 is the current supported release reviewed; PostgreSQL 19 Beta 2 behavior is explicitly identified as prerelease behavior and should be rechecked against the final PostgreSQL 19 release.
