# Validation Summary: How to Configure Read Replicas

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- PostgreSQL streaming replication
- PostgreSQL `pg_basebackup`
- MySQL replication and GTID auto-positioning
- Node.js with Knex
- Python with SQLAlchemy
- Replication lag monitoring and read/write routing

## Sources Consulted
- PostgreSQL 18 documentation: Replication configuration: https://www.postgresql.org/docs/current/runtime-config-replication.html
- PostgreSQL 18 documentation: Log-shipping standby servers: https://www.postgresql.org/docs/current/warm-standby.html
- PostgreSQL 18 documentation: `pg_basebackup`: https://www.postgresql.org/docs/current/app-pgbasebackup.html
- PostgreSQL 18 documentation: recovery and WAL administration functions: https://www.postgresql.org/docs/current/functions-admin.html
- MySQL 8.4 Reference Manual: `SHOW BINARY LOG STATUS`: https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html
- MySQL 8.4 Reference Manual: `CHANGE REPLICATION SOURCE TO`: https://dev.mysql.com/doc/refman/8.4/en/change-replication-source-to.html
- MySQL 8.4 Reference Manual: setting up replication using GTIDs: https://dev.mysql.com/doc/refman/8.4/en/replication-gtids-howto.html
- MySQL 8.4 Reference Manual: creating a replication user: https://dev.mysql.com/doc/refman/8.4/en/replication-howto-repuser.html
- MySQL 8.4 Reference Manual: replica options and `replica_skip_errors`: https://dev.mysql.com/doc/refman/8.4/en/replication-options-replica.html
- MySQL 8.4 Reference Manual: checking replication status: https://dev.mysql.com/doc/refman/8.4/en/replication-administration-status.html
- Knex documentation: raw queries: https://knexjs.org/guide/raw.html
- Knex documentation: query builder: https://knexjs.org/guide/query-builder.html
- SQLAlchemy documentation: connection pooling and `pool_pre_ping`: https://docs.sqlalchemy.org/en/latest/core/pooling.html

## Issues Found
- The PostgreSQL primary configuration comment said "Enable WAL archiving" even though the shown settings configure streaming replication, not WAL archiving. Changed the comment to "Configure WAL for streaming replication."
- The MySQL example used `SHOW MASTER STATUS`, which is no longer supported in current MySQL 8.4 documentation. Replaced it with `SHOW BINARY LOG STATUS`.
- The MySQL replica configuration directly enabled `replica_skip_errors = 1062`. MySQL documents this as risky because it can make replicas diverge from the source. Commented the setting out and added a warning comment.
- The PostgreSQL lag query calculated time lag only from `pg_last_xact_replay_timestamp()`. On an idle replica, that timestamp can be old even when the replica has replayed all received WAL. Updated the SQL and JavaScript monitoring query to report `0` seconds/milliseconds when received and replayed LSNs match.
- The PostgreSQL lag query used direct `pg_lsn` subtraction for byte lag. Replaced it with the documented `pg_wal_lsn_diff()` function.

## Review Notes
- The MySQL setup uses current source/replica terminology (`CHANGE REPLICATION SOURCE TO`, `START REPLICA`, `SHOW REPLICA STATUS`) and GTID auto-positioning.
- The PostgreSQL `pg_basebackup` flags are current: `-R` writes standby configuration, `-C` creates the named slot, `-S` selects the slot, and `-X stream` streams WAL during the backup.
- The Node.js and Python snippets are illustrative wrappers. In production, routing should also consider replica health checks, connection errors, and per-request consistency needs.
