# Validation Summary: How to Split PostgreSQL Subscriptions Without Assuming Shared Ordering

## Status

validated

## Post Type

Technical guide with SQL examples and replication cutover procedures.

## Technologies Covered

- PostgreSQL 18 logical replication, publications, and subscriptions
- SQL publication/subscription administration and system catalog queries
- Initial table synchronization, replication slots, WAL retention, and apply workers
- Subscriber triggers, transaction isolation, and application consistency boundaries
- libpq connection strings and TLS verification

## Sources Consulted

- [PostgreSQL 18: Logical Replication](https://www.postgresql.org/docs/18/logical-replication.html) — ordering and transactional consistency within a subscription.
- [PostgreSQL 18: Subscription](https://www.postgresql.org/docs/18/logical-replication-subscription.html) — nonoverlapping objects, table matching, slot management, and recreation behavior.
- [PostgreSQL 18: CREATE PUBLICATION](https://www.postgresql.org/docs/18/sql-createpublication.html) — table-list syntax, publication defaults, and partition membership.
- [PostgreSQL 18: CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html) — SQL syntax, privileges, authentication, initial copy, slot creation, and parallel streaming.
- [PostgreSQL 18: ALTER SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-altersubscription.html) — ENABLE/DISABLE syntax and transaction-end effects, plus publication refresh behavior.
- [PostgreSQL 18: pg_publication_tables](https://www.postgresql.org/docs/18/view-pg-publication-tables.html) — membership-query columns and expansion of schema-wide publications.
- [PostgreSQL 18: pg_subscription](https://www.postgresql.org/docs/18/catalog-pg-subscription.html) — subscription identifiers and database filtering.
- [PostgreSQL 18: pg_subscription_rel](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html) — relation mappings and synchronization states.
- [PostgreSQL 18: Logical Replication Architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html) — apply ordering, trigger behavior, and independent initial table copies.
- [PostgreSQL 18: ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html) — ENABLE REPLICA and ENABLE ALWAYS trigger modes.
- [PostgreSQL 18: Logical Replication Restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html) — coordinated truncation and foreign-key dependencies.
- [PostgreSQL 18: Transaction Isolation](https://www.postgresql.org/docs/18/transaction-iso.html) — statement snapshots under READ COMMITTED and transaction snapshots under REPEATABLE READ.
- [PostgreSQL 18: Logical Replication Configuration](https://www.postgresql.org/docs/18/logical-replication-config.html) — publisher and subscriber capacity requirements.
- [PostgreSQL 18: Replication Settings](https://www.postgresql.org/docs/18/runtime-config-replication.html) — slot WAL retention limits and invalidation risks.
- [PostgreSQL 18: Cumulative Statistics System](https://www.postgresql.org/docs/18/monitoring-stats.html) — received_lsn and per-subscription worker/error statistics.
- [PostgreSQL 18: Logical Replication Security](https://www.postgresql.org/docs/18/logical-replication-security.html) — publisher and subscriber permissions.
- [PostgreSQL 18: libpq SSL Support](https://www.postgresql.org/docs/18/libpq-ssl.html) — verify-full certificate and hostname verification.

## Issues Found

1. **Subscriber trigger behavior needed qualification.** The missing-parent example did not state that ordinary subscriber triggers are suppressed during replication apply. Specified a row trigger configured with `ENABLE REPLICA` or `ENABLE ALWAYS`, explained the default, and linked the architecture documentation. This preserves the example while identifying when it can actually occur.
2. **A single transaction does not inherently provide a single report snapshot.** The reporting paragraph attributed a consistent local snapshot to reading marker tables in one transaction without specifying isolation. PostgreSQL defaults to READ COMMITTED, which takes a snapshot per statement. Specified REPEATABLE READ for the marker checks and report, and a fresh transaction when a marker is missing. The original fully quiescent, fully caught-up dataset can remain stable under READ COMMITTED, but transaction membership itself does not establish a shared snapshot.

## Review Notes

- Reviewed all five SQL code blocks against PostgreSQL 18 documentation. The CREATE PUBLICATION, CREATE SUBSCRIPTION, membership/state queries, and ALTER SUBSCRIPTION examples use valid syntax and documented fields. No SQL changes were necessary.
- The central consistency argument is correct: one subscription preserves its transaction boundary and ordering; independent subscriptions can expose different parts of a source transaction at different times. The staging pause test follows from that architecture.
- Ready state is `srsubstate = 'r'`. The post correctly requires every expected relation to be ready and does not promise an application-consistent dataset during initial copies. Newly published tables require publication refresh before they appear in the subscriber relation catalog.
- The marker procedure is an application protocol inferred from per-subscription ordering. It requires correctly published marker tables, completed earlier writers, successful initial synchronization, and the stated write fence. A local snapshot alone cannot supply missing changes from another subscription.
- `received_lsn` records receipt, not proof that changes are committed and visible to readers. The post correctly avoids using one feed's receipt position as a global synchronization barrier.
- The subscription examples assume a configured replication environment and real connection details. With the default password requirement, non-superuser subscription owners need password authentication with the password in the connection string. `sslmode=verify-full` also requires appropriate trusted certificates on the subscriber host and a matching publisher certificate.
- Extra subscriptions require slot and worker capacity. Retained WAL is shared on the publisher rather than copied separately for every subscription; a lagging slot can hold back recycling. Rollback slots also need monitoring while retained.
- The existing-target warning is correct: `copy_data = false` skips initial copying but does not establish continuity with the former subscription's applied position.
- All original documentation links resolved to the intended PostgreSQL 18 pages. The author link resolved to the named GitHub profile. No deprecated commands or version mismatch were found.
- Validation was documentation-based. No live publisher/subscriber deployment or runtime replication test was performed.
