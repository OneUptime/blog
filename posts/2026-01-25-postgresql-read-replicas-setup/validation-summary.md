# Validation Summary: How to Set Up Read Replicas in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL streaming replication
- PostgreSQL physical replication slots
- PostgreSQL WAL archiving
- PostgreSQL standby promotion and failover
- PostgreSQL synchronous replication
- PgBouncer
- Python psycopg2

## Sources Consulted
- PostgreSQL 18 Documentation: Log-Shipping Standby Servers and Streaming Replication - https://www.postgresql.org/docs/current/warm-standby.html
- PostgreSQL 18 Documentation: Replication Configuration - https://www.postgresql.org/docs/current/runtime-config-replication.html
- PostgreSQL 18 Documentation: Write Ahead Log Configuration - https://www.postgresql.org/docs/current/runtime-config-wal.html
- PostgreSQL 18 Documentation: pg_basebackup - https://www.postgresql.org/docs/current/app-pgbasebackup.html
- PostgreSQL 18 Documentation: CREATE ROLE - https://www.postgresql.org/docs/current/sql-createrole.html
- PostgreSQL 18 Documentation: Password Authentication - https://www.postgresql.org/docs/current/auth-password.html
- PostgreSQL 18 Documentation: pg_hba.conf - https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL 18 Documentation: System Administration Functions - https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL 18 Documentation: Cumulative Statistics System - https://www.postgresql.org/docs/current/monitoring-stats.html
- PgBouncer Documentation: Configuration - https://www.pgbouncer.org/config.html

## Issues Found
- The `hot_standby` comment implied it was a primary-side setting that allowed queries on replicas. Updated the comment to clarify that the setting must be enabled on replicas to allow read-only queries during standby recovery.
- The archive command used a bare `cp`, which can overwrite an existing archived WAL file. Updated it to check that the destination file does not already exist before copying.
- The replication user example used `ENCRYPTED PASSWORD` and described a database `CONNECT` grant as necessary. PostgreSQL accepts `ENCRYPTED` only for backward compatibility and physical replication does not need a database `CONNECT` grant. Updated the example to set `password_encryption = 'scram-sha-256'` and create only the replication user.
- The synchronous replication section said "zero data loss" and "guarantees the replica has committed transactions", which was too broad. Updated it to describe the documented guarantee more precisely: with `remote_apply`, commits wait until the selected synchronous standby has replayed the transaction and made it visible to queries.
- The PgBouncer section was titled "with Target Session Attrs" even though the example did not use `target_session_attrs`. Renamed it to describe separate read/write pools and adjusted the comment accordingly.
- The resync command for a replica that fell too far behind omitted `-X stream` and `-S replica_1_slot`, so `pg_basebackup -R` would not preserve the intended physical replication slot configuration. Updated the command to include both options.

## Review Notes
- PostgreSQL 16 paths are used in the examples. The reviewed concepts and commands remain valid in current PostgreSQL documentation, but package paths and service names can vary by operating system and installation method.
- PgBouncer supports comma-separated backend hosts, but its documentation notes that all listed hosts should be available; production deployments should use appropriate health checks or service discovery when replicas can be unavailable.
