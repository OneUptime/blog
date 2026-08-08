# Validation Summary: Debug PostgreSQL Standby Connection Failures

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- PostgreSQL 18 and supported PostgreSQL releases
- Physical streaming replication and cascading replication
- Standby recovery and hot standby
- `primary_conninfo` and recovery configuration
- `pg_hba.conf` host-based authentication
- PostgreSQL roles, SCRAM-SHA-256, and password files
- TLS and GSSAPI transport negotiation through libpq
- Physical replication slots and WAL retention
- Timeline recovery and `pg_rewind`
- Linux/OpenBSD network diagnostic utilities

## Sources Consulted

- [PostgreSQL standby server operation and streaming replication](https://www.postgresql.org/docs/current/warm-standby.html)
- [PostgreSQL replication configuration](https://www.postgresql.org/docs/current/runtime-config-replication.html)
- [PostgreSQL monitoring statistics, including replication and SSL views](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL system administration and recovery functions](https://www.postgresql.org/docs/current/functions-admin.html)
- [PostgreSQL session information functions](https://www.postgresql.org/docs/current/functions-info.html)
- [PostgreSQL hot standby behavior](https://www.postgresql.org/docs/current/hot-standby.html)
- [PostgreSQL `pg_hba.conf` documentation](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)
- [PostgreSQL `pg_hba_file_rules` view](https://www.postgresql.org/docs/current/view-pg-hba-file-rules.html)
- [PostgreSQL role attributes](https://www.postgresql.org/docs/current/role-attributes.html) and [`CREATE ROLE`](https://www.postgresql.org/docs/current/sql-createrole.html)
- [PostgreSQL libpq connection parameters](https://www.postgresql.org/docs/current/libpq-connect.html), [SSL support](https://www.postgresql.org/docs/current/libpq-ssl.html), and [password-file format](https://www.postgresql.org/docs/current/libpq-pgpass.html)
- [PostgreSQL `pg_replication_slots` view](https://www.postgresql.org/docs/current/view-pg-replication-slots.html)
- [PostgreSQL streaming replication protocol](https://www.postgresql.org/docs/current/protocol-replication.html)
- [PostgreSQL logical replication security](https://www.postgresql.org/docs/current/logical-replication-security.html)
- [PostgreSQL `pg_isready`](https://www.postgresql.org/docs/current/app-pg-isready.html)
- [PostgreSQL `pg_rewind`](https://www.postgresql.org/docs/current/app-pgrewind.html)
- [Linux `getent(1)` manual](https://man7.org/linux/man-pages/man1/getent.1.html) and [OpenBSD `nc(1)` manual](https://man.openbsd.org/nc.1)

## Issues Found

1. **Replication-role privilege wording** - The post incorrectly implied that a superuser does not need `LOGIN`. PostgreSQL superusers bypass the `REPLICATION` check but not the right to log in. Updated the introduction, role explanation, diagnostic query, and error map to require `LOGIN` plus either `REPLICATION` or `SUPERUSER`; added `rolsuper` to the query.
2. **Password-expiration scope** - The original wording suggested that an expired `rolvaliduntil` blocks every authentication method. Clarified that `VALID UNTIL` expires the role's password and therefore affects password authentication, not non-password authentication.
3. **Recovery timestamp label** - `pg_last_xact_replay_timestamp()` can describe a replayed commit or abort record, so the alias `last_replayed_commit` was inaccurate. Renamed the alias to `last_xact_replay_timestamp`.
4. **Hot-standby precondition** - The local SQL checks and visibility canary were presented as available on every standby. During recovery they require a consistent state and a queryable hot standby. Added that precondition and specified a new query snapshot for the visibility check.
5. **Configuration reload semantics** - `pg_reload_conf()` requests a SIGHUP reload but does not prove that edited settings parsed or took effect. Changed the instructions to re-query `pg_settings` and inspect the server log, and added the documented empty-string exception to `primary_conninfo` WAL-receiver restart behavior.
6. **`pg_isready` rejection meaning** - The failure map blurred `pg_isready`'s "rejecting connections" state with HBA or credential failures. Clarified that rejection means the reachable server is currently disallowing connections, while HBA, role, TLS, and capacity diagnosis must follow the actual standby connection error.
7. **Listener-function scope** - `inet_server_addr()` and `inet_server_port()` report only the endpoint used by the current SQL session and return null for Unix-domain sockets; they do not enumerate listeners. Added this limitation next to the listener checks.
8. **TLS versus GSSAPI negotiation** - Libpq prefers GSSAPI encryption when it is available, even when `sslmode=verify-full` is set. Added `gssencmode=disable` to the TLS-specific `primary_conninfo` example and explained why it is necessary when the policy and HBA rule specifically require TLS.
9. **Version-specific catalog columns** - The unqualified HBA query used `pg_hba_file_rules.rule_number`, which requires PostgreSQL 16 or later, while the slot query used `inactive_since` and `invalidation_reason`, which require PostgreSQL 17 or later. Added precise instructions for omitting those columns on older supported releases.
10. **Slot reservation and missing-WAL recovery** - Clarified that immediate slot reservation starts retention but cannot recover WAL already removed. Replaced the overly narrow claim that only `restore_command` can recover missing WAL with the accurate requirement that some valid source, typically a WAL archive, must still hold it; otherwise a new base backup is required.

## Review Notes

- The review targeted PostgreSQL 18, the current stable documentation set on the validation date. All SQL functions, PostgreSQL 18 catalog columns, configuration keys, and command options used after correction are current and non-deprecated.
- PostgreSQL 14 through 18 are supported on the validation date. The post now calls out the catalog-column differences that affect PostgreSQL 14 through 16.
- The post correctly uses `scram-sha-256`; MD5-encrypted PostgreSQL passwords are deprecated in PostgreSQL 18.
- `pg_settings.sourcefile` and `sourceline` can be null for users without sufficient settings privileges, and replication statistics can hide fields from users without `pg_read_all_stats`. These privilege-dependent nulls do not make the queries incorrect.
- Libpq's backward-compatibility behavior can make `sslmode=require` validate a CA when a root CA file exists, but it still does not perform the hostname check provided by `verify-full`; the corrected comparison remains accurate.
