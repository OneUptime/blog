# Validation Summary: How to Replicate PostgreSQL Tenant Rows with Filters and Replica Identity

## Status

validated

## Post Type

Tutorial / implementation guide.

## Technologies Covered

- PostgreSQL 18 and PostgreSQL 15 row-filter compatibility
- Logical replication, publications, subscriptions, and initial synchronization
- SQL, composite primary keys, and replica identity indexes
- Multi-tenant row filtering and replication security
- libpq connection settings and TLS verification

## Sources Consulted

- [PostgreSQL 18 CREATE PUBLICATION](https://www.postgresql.org/docs/18/sql-createpublication.html) — publication syntax, filter restrictions, and published operations.
- [PostgreSQL 18 ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html) — default replica identity and eligible identity indexes.
- [PostgreSQL 18 Row Filters](https://www.postgresql.org/docs/18/logical-replication-row-filter.html) — update transformations, initial copying, version compatibility, and combined filters.
- [PostgreSQL 18 CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html) — connection syntax, copy_data, authentication requirements, and transaction restrictions.
- [PostgreSQL 18 ALTER SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-altersubscription.html) — refreshing publications does not recopy previously subscribed tables.
- [PostgreSQL 18 Logical Replication Security](https://www.postgresql.org/docs/18/logical-replication-security.html) — replication privileges, initial-copy access, and absence of publication access controls.
- [PostgreSQL 18 Logical Replication Restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html) — schema and DDL are not replicated.
- [PostgreSQL 18 Logical Replication Configuration](https://www.postgresql.org/docs/18/logical-replication-config.html) — infrastructure prerequisites.
- [PostgreSQL 18 pg_subscription_rel](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html) — table synchronization state codes.
- [PostgreSQL 18 pg_subscription](https://www.postgresql.org/docs/18/catalog-pg-subscription.html) — subscription inspection columns.
- [PostgreSQL 18 pg_publication_tables](https://www.postgresql.org/docs/18/view-pg-publication-tables.html) — publication inspection columns.
- [PostgreSQL 18 CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html), [INSERT](https://www.postgresql.org/docs/18/sql-insert.html), [UPDATE](https://www.postgresql.org/docs/18/sql-update.html), and [GRANT](https://www.postgresql.org/docs/18/sql-grant.html) — SQL syntax and privileges used in the examples.
- [PostgreSQL 18 libpq SSL Support](https://www.postgresql.org/docs/18/libpq-ssl.html) — verify-full and trusted certificate configuration.
- [PostgreSQL 15 Release Notes](https://www.postgresql.org/docs/15/release-15.html) — version context for logical replication filtering.

## Issues Found

- The alternative replica-identity index requirements omitted that the index must be nondeferrable. Added “nondeferrable” to the existing requirements sentence. PostgreSQL rejects a deferrable index for REPLICA IDENTITY USING INDEX even if it otherwise satisfies the listed uniqueness, nonpartial, and NOT NULL conditions.

## Review Notes

- Reviewed all SQL examples against official documentation; no deprecated syntax or incorrect example results were identified. This was a documentation-based review, not a live publisher/subscriber execution test.
- The composite primary key covers tenant_id. The stated boundary transitions are correct: order 1001 is updated, order 1002 enters through an INSERT transformation, and order 1003 leaves through a DELETE transformation. Deleting order 1002 subsequently leaves only order 1001 on the subscriber.
- PostgreSQL 18 on both sides supports the complete example. Publisher row filters were introduced in PostgreSQL 15; subscribers older than 15 ignore filters during initial copying. Filtered ongoing changes are evaluated on the publisher.
- Combining filters with OR for the same operation and excluding TRUNCATE are correct. Initial copying does not use the publication's publish operation list. Excluding TRUNCATE also means a source truncation would require explicit reconciliation of this subscriber.
- The table readiness state r indicates normal replication, not proof that every later transaction has already arrived. The article correctly requires catch-up before inspecting the final rows.
- The example assumes established replication infrastructure: logical WAL, adequate slots and workers, permitted publisher connections, and suitable publication/subscription ownership privileges. The connection hostname is illustrative; verify-full requires an appropriate certificate trust configuration on the subscriber server.
- Authentication must match the subscription owner's privileges. With the default password_required setting, a non-superuser-owned subscription requires password authentication and a password in its connection string; external secret configuration must supply it. A superuser-owned subscription is exempt from that requirement.
- The recovery guidance correctly avoids assuming that a filter change repairs existing subscriber data. REFRESH PUBLICATION does not recopy an already subscribed table after its filter changes.
- All five PostgreSQL links in the post resolve to the intended version-specific documentation. The author link redirects to the corresponding GitHub profile.
- Preserved the existing title change and limited this review's README edit to the missing identity-index requirement.
