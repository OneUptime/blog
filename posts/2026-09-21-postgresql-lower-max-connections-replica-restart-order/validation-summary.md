# Validation Summary: How to Lower PostgreSQL Replica max_connections in the Right Restart Order

## Status
validated

## Post Type
Technical operations guide with SQL examples.

## Technologies Covered
- PostgreSQL 18 configuration and connection limits
- Physical replication, cascading standbys, and hot standby recovery
- Write-ahead logging (WAL), checkpoints, and replay LSNs
- High availability, restart sequencing, and rollback
- SQL administration functions and configuration views

## Sources Consulted
- [PostgreSQL 18: Hot Standby](https://www.postgresql.org/docs/18/hot-standby.html)
- [PostgreSQL 18: Connections and Authentication](https://www.postgresql.org/docs/18/runtime-config-connection.html)
- [PostgreSQL 18: Replication Configuration](https://www.postgresql.org/docs/18/runtime-config-replication.html)
- [PostgreSQL 18: System Administration Functions](https://www.postgresql.org/docs/18/functions-admin.html)
- [PostgreSQL 18: pg_settings](https://www.postgresql.org/docs/18/view-pg-settings.html)
- [PostgreSQL 18: ALTER SYSTEM](https://www.postgresql.org/docs/18/sql-altersystem.html)
- [PostgreSQL 18: CHECKPOINT](https://www.postgresql.org/docs/18/sql-checkpoint.html)
- [PostgreSQL 18: pg_lsn Type](https://www.postgresql.org/docs/18/datatype-pg-lsn.html)
- [PostgreSQL 18: Log-Shipping Standby Servers](https://www.postgresql.org/docs/18/warm-standby.html)
- [PostgreSQL 18: Logical Replication](https://www.postgresql.org/docs/18/logical-replication.html)
- [PostgreSQL 12 release notes: separate WAL sender connection accounting](https://www.postgresql.org/docs/12/release-12.html)
- [PostgreSQL REL_18_STABLE source: xlog.c](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/access/transam/xlog.c)
- [PostgreSQL REL_18_STABLE source: xlogrecovery.c](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/access/transam/xlogrecovery.c)

## Issues Found
1. **Connection budget accounting:** The original paragraph included replication connections in the reduced connection capacity. WAL sender connections have been accounted for separately from `max_connections` since PostgreSQL 12. Updated the paragraph to budget them under `max_wal_senders` and to account for reserved slots within the ordinary connection limit.
2. **Recovery resume behavior:** The original explanation described shutdown as a possible consequence of retrying an incompatible WAL record. PostgreSQL pauses inside its parameter compatibility check and raises a fatal error after that pause ends. Updated the sentence to state that unpausing after this error causes shutdown; changing startup configuration and restarting remains the remedy.

## Review Notes
- Confirmed the primary-first order for decreases, standby-first order for increases and rollback, and the need to include cascading descendants. Promotion changes which server supplies the required parameter values.
- Verified SQL syntax, configuration names, view columns, function return types, and the `pg_lsn` comparison against PostgreSQL 18 documentation. No deprecated APIs were identified. There are no terminal commands or configuration-file snippets to validate.
- Checked the WAL boundary against PostgreSQL source: parameter changes are logged and flushed, and replay updates the standby control file and minimum recovery position. The post-restart checkpoint and subsequent flushed LSN provide a conservative boundary for this procedure.
- The standby query assumes a queryable hot standby. `pg_is_wal_replay_paused()` reports a pause request and can only run during recovery; a promoted node can therefore make the query fail, which must stop the rollout. A false result is appropriate for the required unpaused state.
- Configuration-source visibility requires superuser or `pg_read_all_settings` privileges. Modification commands need their own administrative privileges: `ALTER SYSTEM` requires superuser or the relevant parameter privilege and cannot run inside a transaction block; `CHECKPOINT` requires superuser or `pg_checkpoint` privileges.
- Confirmed the physical versus logical replication distinction and same-major-version scope. The numerical connection limit and example LSN are illustrative, and the post correctly requires workload budgeting and substitution of the actual barrier.
- All PostgreSQL documentation links in the post resolved to the intended resources. HA-manager and service-manager steps remain platform-specific, as the post explicitly states.
- Validation was based on official documentation and PostgreSQL source inspection. No live database restart or replication experiment was performed.
