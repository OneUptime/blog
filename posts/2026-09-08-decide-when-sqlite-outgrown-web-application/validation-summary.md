# Validation Summary: How to Decide When SQLite Has Outgrown a Production Web Application

## Status
validated

## Post Type
Technical guide to database capacity planning and migration decisions. Although there are no executable code blocks, terminal commands, or configuration snippets, the post contains substantial implementation details about transactions, locking, WAL, backups, and data migration and therefore requires technical review.

## Technologies Covered
- SQLite transactions, write contention, busy timeouts, and query plans
- SQLite write-ahead logging (WAL), checkpoints, backups, and recovery
- NFS and SMB network filesystems and multi-host deployments
- PostgreSQL, replication, point-in-time recovery (PITR), and database roles
- Database migration, type normalization, and foreign-key validation

## Sources Consulted
- SQLite appropriate uses: https://www.sqlite.org/whentouse.html
- SQLite over a network: https://www.sqlite.org/useovernet.html
- SQLite transaction behavior: https://www.sqlite.org/lang_transaction.html
- SQLite write-ahead logging: https://www.sqlite.org/wal.html
- SQLite EXPLAIN QUERY PLAN: https://www.sqlite.org/eqp.html
- SQLite busy timeout: https://www.sqlite.org/c3ref/busy_timeout.html
- SQLite Online Backup API: https://www.sqlite.org/backup.html
- SQLite implementation limits: https://www.sqlite.org/limits.html
- SQLite VACUUM: https://www.sqlite.org/lang_vacuum.html
- SQLite datatypes: https://www.sqlite.org/datatype3.html
- SQLite foreign-key support: https://www.sqlite.org/foreignkeys.html
- SQLite foreign-key checking: https://www.sqlite.org/pragma.html#pragma_foreign_key_check
- PostgreSQL continuous archiving and PITR: https://www.postgresql.org/docs/current/continuous-archiving.html
- PostgreSQL high availability and replication: https://www.postgresql.org/docs/current/high-availability.html
- PostgreSQL database roles: https://www.postgresql.org/docs/current/user-manag.html
- PostgreSQL administration functions: https://www.postgresql.org/docs/current/functions-admin.html
- Author link checked: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- The README was left unchanged. The recommendations are workload-dependent engineering guidance, not universal throughput limits or promises of automatic migration benefits.
- Confirmed the one-writer-per-database constraint and concurrent readers with a writer in WAL mode. Long transactions increase contention; busy timeouts add waiting rather than write capacity. SQLITE_BUSY is a diagnostic signal and does not by itself establish sustained overload.
- Confirmed that EXPLAIN QUERY PLAN exposes scan and index usage. The post appropriately recommends measuring and correcting query and transaction problems before selecting another engine.
- Confirmed the network-filesystem cautions. Standard WAL requires participating processes on the same host. A local database-owning service is a documented SQLite architecture and can also be a lasting design when its operational requirements are acceptable.
- Confirmed that live WAL or journal state matters for recovery. The single-file description is architectural shorthand: active databases can have auxiliary files, as the recovery discussion acknowledges. Storage replication alone does not establish safe failover.
- SQLite already supports online backups; the operational comparison is about the complete recovery and availability system. PostgreSQL PITR, replication, roles, and administrative controls still require appropriate configuration and operation. Automatic failover and comprehensive auditing may require additional tooling or managed-service support.
- Confirmed the distinction between theoretical size limits and practical filesystem, backup, restore, and maintenance constraints. VACUUM can require substantial additional disk space.
- Type and timestamp normalization and foreign-key validation are sound migration preparation. Foreign-key enforcement must be configured per connection, and existing violations require a separate check. Externally generated identifiers are a design recommendation rather than a prerequisite for migration; existing stable keys can also be preserved.
- Row counts and checksums require consistent snapshots and canonical representations across engines. Change capture and rollback are application-specific migration work, not turnkey SQLite-to-PostgreSQL features claimed by this guide.
- All four official-documentation links resolve to the intended resources; the author URL redirects to the matching GitHub profile. No explicit engine versions, deprecated APIs, executable examples, or configuration syntax needed correction. No application load test was performed because the post supplies no implementation or benchmark workload.
