# Validation Summary: How to Add a Table to a PostgreSQL Publication and Start Its Initial Copy

## Status

validated

## Post Type

Tutorial and troubleshooting guide with executable SQL examples.

## Technologies Covered

- PostgreSQL 18 and SQL
- Logical replication publications and subscriptions
- Initial table synchronization, snapshots, and change capture
- Replica identity, privileges, and row-level security
- Replication catalogs, slots, WAL senders, and worker capacity

## Sources Consulted

- [PostgreSQL 18: CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html) — table definition and constraints.
- [PostgreSQL 18: GRANT](https://www.postgresql.org/docs/18/sql-grant.html) — schema and table grants.
- [PostgreSQL 18: System Information Functions and Operators](https://www.postgresql.org/docs/18/functions-info.html) — `has_table_privilege` arguments and return value.
- [PostgreSQL 18: ALTER PUBLICATION](https://www.postgresql.org/docs/18/sql-alterpublication.html) — ownership, membership changes, and subscriber refresh requirements.
- [PostgreSQL 18: CREATE PUBLICATION](https://www.postgresql.org/docs/18/sql-createpublication.html) — automatic table inclusion and published DML operations.
- [PostgreSQL 18: ALTER SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-altersubscription.html) — refresh syntax, copying behavior, transaction restrictions, and two-phase restrictions.
- [PostgreSQL 18: Publication](https://www.postgresql.org/docs/18/logical-replication-publication.html) — replica identity requirements.
- [PostgreSQL 18: Subscription](https://www.postgresql.org/docs/18/logical-replication-subscription.html) — matching table and column names, extra target columns, and synchronization slots.
- [PostgreSQL 18: Logical Replication Restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html) — DDL and schema compatibility.
- [PostgreSQL 18: Logical Replication Security](https://www.postgresql.org/docs/18/logical-replication-security.html) — publisher copy privileges, RLS, and subscriber execution roles.
- [PostgreSQL 18: Logical Replication Configuration Settings](https://www.postgresql.org/docs/18/logical-replication-config.html) — sender, slot, and worker capacity.
- [PostgreSQL 18: Logical Replication Architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html) — snapshot copying, concurrent-change catch-up, worker handoff, and retries.
- [PostgreSQL 18: Logical Replication Conflicts](https://www.postgresql.org/docs/18/logical-replication-conflicts.html) — constraint failures and conflict resolution.
- [PostgreSQL 18: pg_publication_tables](https://www.postgresql.org/docs/18/view-pg-publication-tables.html) — queried columns and effective publication membership.
- [PostgreSQL 18: pg_subscription_rel](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html) — relation state columns and ready-state meaning.
- [PostgreSQL 18: pg_subscription](https://www.postgresql.org/docs/18/catalog-pg-subscription.html) — subscription identifiers and publication list.
- [Author's GitHub profile](https://github.com/nawazdhandala) — confirmed the author link resolves to the intended profile.

## Issues Found

No technical issues found.

## Review Notes

- Reviewed all five SQL blocks against PostgreSQL 18 documentation. The table definition, grants, privilege check, publication change, refresh command, and catalog queries use valid syntax and documented names. No deprecated features were identified. README.md was left unchanged.
- Confirmed that subscribers need compatible tables created separately, fully qualified table names must match, and extra target columns receive their defaults. Initial synchronization uses COPY semantics rather than merging or clearing existing rows.
- Confirmed that `ADD TABLE` preserves other publication members, whereas `SET TABLE` replaces membership. All-table and schema publications can include new tables automatically, but existing subscriptions still require refresh.
- Confirmed that refresh with `copy_data = true` copies newly discovered tables without recopying known tables. A second refresh cannot repair historical data omitted by an earlier `copy_data = false`. Refresh must run outside a transaction block, and an actually enabled two-phase subscription requires `copy_data = false` for refresh.
- Confirmed that `r` denotes readiness for normal replication, and synchronization workers catch up changes made during the snapshot copy before handing control to the main apply worker. Failed copy workers can be respawned; correcting persistent permission, schema, or constraint problems remains necessary.
- The rehearsal assumes the publication publishes INSERT, UPDATE, and DELETE, as it does by default. Custom `publish` settings affect subsequent DML but do not suppress the initial data copy.
- Deployment roles still need the documented subscription ownership and target-table permissions. The publisher's `has_table_privilege` result checks SELECT access only; it does not establish connectivity, RLS behavior, subscriber permissions, or resource availability.
- All six PostgreSQL documentation links in the post resolved to the intended PostgreSQL 18 resources. The author link redirected to the matching GitHub profile.
- Validation was documentation-based. No SQL was executed against a live PostgreSQL publisher/subscriber pair, and the suggested concurrent-copy rehearsal was not performed.
