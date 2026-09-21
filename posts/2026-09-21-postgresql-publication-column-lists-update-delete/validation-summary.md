# Validation Summary: How to Select PostgreSQL Publication Columns for UPDATE and DELETE

## Status
validated

## Post Type
Tutorial / operational guide with SQL examples.

## Technologies Covered
- PostgreSQL 18 logical replication.
- PostgreSQL 15 and later publication column lists and initial synchronization.
- SQL publications, subscriptions, replica identity, schema definitions, grants, and data mutations.
- PostgreSQL system catalogs and publication views.
- libpq connection settings and TLS verification.

## Sources Consulted
- [PostgreSQL 18: Column Lists](https://www.postgresql.org/docs/18/logical-replication-col-lists.html).
- [PostgreSQL 18: Publication and Replica Identity](https://www.postgresql.org/docs/18/logical-replication-publication.html).
- [PostgreSQL 18: Subscription](https://www.postgresql.org/docs/18/logical-replication-subscription.html).
- [PostgreSQL 18: CREATE PUBLICATION](https://www.postgresql.org/docs/18/sql-createpublication.html).
- [PostgreSQL 18: ALTER PUBLICATION](https://www.postgresql.org/docs/18/sql-alterpublication.html).
- [PostgreSQL 18: CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html).
- [PostgreSQL 18: ALTER SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-altersubscription.html).
- [PostgreSQL 18: Logical Replication Security](https://www.postgresql.org/docs/18/logical-replication-security.html).
- [PostgreSQL 18: Logical Replication Restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html).
- [PostgreSQL 18: Logical Replication Configuration Settings](https://www.postgresql.org/docs/18/logical-replication-config.html).
- [PostgreSQL 18: pg_class](https://www.postgresql.org/docs/18/catalog-pg-class.html), [pg_index](https://www.postgresql.org/docs/18/catalog-pg-index.html), and [pg_publication_tables](https://www.postgresql.org/docs/18/view-pg-publication-tables.html).
- [PostgreSQL 18: System Information Functions](https://www.postgresql.org/docs/18/functions-info.html), including `pg_get_indexdef`.
- [PostgreSQL 18: CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html) and [GRANT](https://www.postgresql.org/docs/18/sql-grant.html).
- [PostgreSQL 18: INSERT](https://www.postgresql.org/docs/18/sql-insert.html), [UPDATE](https://www.postgresql.org/docs/18/sql-update.html), and [DELETE](https://www.postgresql.org/docs/18/sql-delete.html).
- [PostgreSQL 18: libpq SSL Support](https://www.postgresql.org/docs/18/libpq-ssl.html).
- [PostgreSQL 15 release notes](https://www.postgresql.org/docs/15/release-15.html).
- [PostgreSQL REL_18_STABLE publication implementation](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/commands/publicationcmds.c), checked directly for the `REPLICA IDENTITY FULL` restriction.
- [Author profile](https://github.com/nawazdhandala), checked for the linked destination.

## Issues Found
- The recovery paragraph implied that correcting the publisher contract alone was sufficient for all described failures. PostgreSQL documents an additional recovery step for subscriptions affected by different column lists across publications. Added a targeted sentence directing readers to align the lists and drop and re-add an offending publication through `ALTER SUBSCRIPTION`, with a link to the official warning. This follows the documented recovery path while retaining the existing subscription. No SQL examples or section structure were changed.
- Qualified that recovery with a full publication-membership check. Default refresh can remove tables unique to the dropped publication, and re-adding it can initiate copying into existing data. The guide now requires a rehearsed continuity and copy strategy for those tables instead of implying that keeping the subscription preserves every table's synchronization state. Verified against PostgreSQL 18 ALTER SUBSCRIPTION documentation; no live recovery test was performed.

## Review Notes
- Checked every SQL block against the PostgreSQL 18 syntax and documented behavior. Table definitions, grants, publication options, subscription options, catalog queries, inserts, updates, deletes, and publication alteration are consistent with the described example.
- Confirmed that a primary key supplies the default replica identity, identity columns must be published for updates and deletes, subscriber columns match by name, and subscriber-only columns receive their defaults on inserts.
- Confirmed in PostgreSQL 18 source that `REPLICA IDENTITY FULL` rejects any explicit publication column list for updates and deletes, including a list containing every column. The original wording is correct.
- PostgreSQL 15 introduced publication column lists; subscribers older than 15 ignore them during initial copying. The example uses ordinary columns, so the separate PostgreSQL 18 rules for generated-column copying do not affect it.
- Confirmed that `SET TABLE` replaces publication membership, an explicit list does not automatically expand when columns are added, and existing subscribed tables are not automatically recopied to backfill added fields.
- The tutorial assumes an established replication environment. Running it requires logical WAL configuration, sufficient replication slots and workers, an authenticated replication role, appropriate database privileges, and network access. The example hostname and database must be adapted; `sslmode=verify-full` requires trusted certificate verification and hostname matching on the subscriber host.
- The two lifecycle rows are inserted after subscription creation. They exercise ongoing replication; a separate row inserted before subscription creation would also test initial-copy filtering. This is an optional coverage improvement, not a SQL error.
- The security guidance is correct: publication column lists are not an access-control boundary for untrusted subscribers.
- The linked PostgreSQL documentation pages and author profile resolve to the intended resources. No deprecated SQL was identified.
- Validation was based on official documentation and PostgreSQL 18 source inspection. An end-to-end PostgreSQL 18 replication test was not run; the locally available PostgreSQL binaries report version 14.17.
