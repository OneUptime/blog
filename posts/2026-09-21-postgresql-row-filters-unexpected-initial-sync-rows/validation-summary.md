# Validation Summary: How to Diagnose PostgreSQL Row Filters During Initial Replication Sync

## Status

validated

## Post Type

Technical troubleshooting guide with SQL reproduction examples.

## Technologies Covered

- PostgreSQL 18 logical replication and initial table synchronization.
- Publication row filters, operation selection, and overlapping publications.
- SQL, system catalogs, replica identity, and replication permissions.
- libpq connection settings and TLS verification.

## Sources Consulted

- [PostgreSQL 18: Row Filters](https://www.postgresql.org/docs/18/logical-replication-row-filter.html)
- [PostgreSQL 18: Logical Replication Architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html)
- [PostgreSQL 18: Publication](https://www.postgresql.org/docs/18/logical-replication-publication.html)
- [PostgreSQL 18: CREATE PUBLICATION](https://www.postgresql.org/docs/18/sql-createpublication.html)
- [PostgreSQL 18: CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html)
- [PostgreSQL 18: ALTER SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-altersubscription.html)
- [PostgreSQL 18: pg_publication_tables](https://www.postgresql.org/docs/18/view-pg-publication-tables.html)
- [PostgreSQL 18: pg_publication](https://www.postgresql.org/docs/18/catalog-pg-publication.html)
- [PostgreSQL 18: pg_subscription](https://www.postgresql.org/docs/18/catalog-pg-subscription.html)
- [PostgreSQL 18: pg_subscription_rel](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html)
- [PostgreSQL 18: Logical Replication Security](https://www.postgresql.org/docs/18/logical-replication-security.html)
- [PostgreSQL 18: Logical Replication Configuration Settings](https://www.postgresql.org/docs/18/logical-replication-config.html)
- [PostgreSQL 18: GRANT](https://www.postgresql.org/docs/18/sql-grant.html)
- [PostgreSQL 18: CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html)
- [PostgreSQL 18: INSERT](https://www.postgresql.org/docs/18/sql-insert.html)
- [PostgreSQL 18: SHOW](https://www.postgresql.org/docs/18/sql-show.html)
- [PostgreSQL 18: System Information Functions](https://www.postgresql.org/docs/18/functions-info.html)
- [PostgreSQL 18: COPY](https://www.postgresql.org/docs/18/sql-copy.html)
- [PostgreSQL 18: libpq SSL Support](https://www.postgresql.org/docs/18/libpq-ssl.html)
- [Author's GitHub profile](https://github.com/nawazdhandala) (author-link destination only).

## Issues Found

1. **Subscription lookup was not scoped to its database.** `pg_subscription` is shared across the cluster, while subscription names are unique within a database. Filtering only by `subname` could return another database's subscription and misidentify the publication list. Added a `subdbid` predicate using the current database's OID.
2. **The new-insert experiment could race the initial snapshot.** Subscription creation starts background replication; it does not wait for the initial copy to finish. If the test insert commits before the copy snapshot, the update publication's initial-copy filter can include it. Added an explicit wait for the table's `pg_subscription_rel.srsubstate` to become `r` before inserting, with a link to the catalog documentation.

## Review Notes

- Verified the PostgreSQL 15 subscriber boundary, the OR combination of initial-copy filters, operation-specific OR behavior for ongoing changes, unfiltered publication paths, and partition-root filter selection.
- Both historical rows match the combined initial-copy filters. After synchronization, the proposed new insert matches no insert-enabled publication. The update filter references a primary-key column, satisfying the replica-identity restriction.
- Verified that publication operation flags do not restrict initial copying, existing subscriber rows are not purged by the copy, and publication refresh does not recopy an already subscribed table after a filter change. Historical cleanup and future replication therefore require separate consideration.
- SQL syntax, catalog columns, publication options, grants, and subscription options were checked against PostgreSQL 18 documentation. No deprecated syntax was identified. All original external links resolved to the intended resources.
- The example assumes an existing replication-capable server configuration, available replication slots and workers, and provisioned credentials. TLS verification requires a trusted certificate chain and a matching server name. For a non-superuser subscription owner, the default `password_required = true` also requires a password in the connection string; externally provisioned credentials must respect that restriction.
- Review was documentation-based; no live publisher/subscriber replication test was executed. Changes were limited to the two correctness fixes above, preserving the post's structure and tone.
