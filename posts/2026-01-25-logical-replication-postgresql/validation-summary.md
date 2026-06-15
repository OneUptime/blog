# Validation Summary: How to Use Logical Replication in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL logical replication
- PostgreSQL physical streaming replication
- PostgreSQL publications and subscriptions
- PostgreSQL replication slots and WAL settings
- PostgreSQL schema changes and migration workflows

## Sources Consulted
- PostgreSQL Documentation: Chapter 29, Logical Replication: https://www.postgresql.org/docs/current/logical-replication.html
- PostgreSQL Documentation: 29.1 Publication: https://www.postgresql.org/docs/current/logical-replication-publication.html
- PostgreSQL Documentation: 29.2 Subscription: https://www.postgresql.org/docs/current/logical-replication-subscription.html
- PostgreSQL Documentation: 29.5 Column Lists: https://www.postgresql.org/docs/current/logical-replication-col-lists.html
- PostgreSQL Documentation: 29.7 Conflicts: https://www.postgresql.org/docs/current/logical-replication-conflicts.html
- PostgreSQL Documentation: 29.8 Restrictions: https://www.postgresql.org/docs/current/logical-replication-restrictions.html
- PostgreSQL Documentation: 29.11 Security: https://www.postgresql.org/docs/current/logical-replication-security.html
- PostgreSQL Documentation: CREATE PUBLICATION: https://www.postgresql.org/docs/current/sql-createpublication.html
- PostgreSQL Documentation: CREATE SUBSCRIPTION: https://www.postgresql.org/docs/current/sql-createsubscription.html
- PostgreSQL Documentation: ALTER SUBSCRIPTION: https://www.postgresql.org/docs/current/sql-altersubscription.html
- PostgreSQL Documentation: Runtime Replication Configuration: https://www.postgresql.org/docs/current/runtime-config-replication.html
- PostgreSQL Documentation: pg_hba.conf: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html

## Issues Found
- The introduction claimed built-in logical replication can transform data during replication. PostgreSQL's publication/subscription logical replication supports table selection, row filters, and column lists, but not arbitrary data transformation, so this was changed to "select columns."
- The prerequisites said logical replication requires specific configuration on both publisher and subscriber. The publisher needs WAL sender/slot configuration for publishing, while the subscriber primarily needs enough logical replication worker capacity, so the wording was narrowed.
- The `pg_hba.conf` example included a `host replication` entry. That entry applies to physical replication pseudo-database access; logical replication connects to a real database, so the example now uses only a normal database access rule.
- The schema-change workflow said `REFRESH PUBLICATION` picks up a new column. PostgreSQL uses `REFRESH PUBLICATION` for publication table membership and related table information, not as a general DDL propagation step, so the comment now limits it to publication membership or column-list changes.
- The migration cutover example terminated all backends for the database, which could include the current session. The query now excludes `pg_backend_pid()`.
- The conflict-handling example used `pg_replication_origin_advance()` with a placeholder LSN. PostgreSQL documents `ALTER SUBSCRIPTION ... SKIP` as the direct way to skip a conflicting transaction by finish LSN, so the example was replaced with that syntax.
- The bi-directional replication and UUID examples used ellipses inside SQL snippets. These were replaced with concrete connection strings and columns so the examples are syntactically valid.
- The publisher tuning example used `wal_keep_size` for slow logical subscribers. Logical replication slots retain WAL independently; `max_slot_wal_keep_size` is the relevant setting for capping slot-retained WAL, so the example was corrected.
- The subscriber tuning example described `streaming = 'parallel'` as parallel initial table copy. That option controls parallel apply for streamed in-progress transactions, so the comment was corrected.

## Review Notes
The post is technically relevant and broadly accurate after the corrections. Future improvements could mention that sequence state is not replicated by logical replication, row filters have expression and replica identity caveats for updates/deletes, and binary replication is less portable across PostgreSQL versions and architectures.
