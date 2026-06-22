# Validation Summary: How to Handle PostgreSQL Failover

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL streaming replication and standby promotion
- PostgreSQL client connection handling with libpq/psycopg
- Patroni high availability management
- HAProxy health checks
- Prometheus alerting
- Bash and SQL operational procedures

## Sources Consulted
- PostgreSQL documentation: Failover - https://www.postgresql.org/docs/current/warm-standby-failover.html
- PostgreSQL documentation: pg_ctl - https://www.postgresql.org/docs/current/app-pg-ctl.html
- PostgreSQL documentation: pg_promote and system administration functions - https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL documentation: recovery configuration changes and promote_trigger_file - https://www.postgresql.org/docs/current/recovery-config.html
- PostgreSQL documentation: pg_rewind - https://www.postgresql.org/docs/current/app-pgrewind.html
- PostgreSQL documentation: libpq connection strings and target_session_attrs - https://www.postgresql.org/docs/current/libpq-connect.html
- PostgreSQL documentation: event trigger behavior - https://www.postgresql.org/docs/current/event-trigger-definition.html
- Psycopg 3 documentation: basic module usage - https://www.psycopg.org/psycopg3/docs/basic/usage.html
- Patroni documentation: REST API - https://patroni.readthedocs.io/en/latest/rest_api.html
- Patroni documentation: patronictl - https://patroni.readthedocs.io/en/latest/patronictl.html
- HAProxy documentation: health checks - https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/

## Issues Found
- The manual promotion section used a PostgreSQL 16 data directory with a legacy trigger file example. PostgreSQL 16 documentation recommends `pg_ctl promote` or `pg_promote()`; `promote_trigger_file` applies only to older versions when configured. Updated the example to make the version limitation explicit.
- The Patroni switchover command used `--master`, while current Patroni documentation uses `--leader` or `--primary`. Updated the command and prompt wording.
- The Patroni failover example omitted the required candidate in the first command and omitted the cluster name in the second command. Updated both examples to match current `patronictl failover` syntax.
- The HAProxy health check used Patroni's old `/master` endpoint. Current Patroni documentation lists `/primary` for primary-with-leader-lock checks. Updated the endpoint and clarified `/health` semantics.
- The HAProxy backend was missing `mode tcp`, which is needed when proxying PostgreSQL traffic while using HTTP health checks against Patroni's REST port. Added `mode tcp`.
- The `pg_rewind` recovery procedure omitted the documented requirement that the target have `wal_log_hints` enabled or data checksums. Added a short prerequisite comment.
- The Prometheus alert examples used non-authoritative exporter metric names for primary detection and lag. Replaced them with Patroni metrics documented by the Patroni `/metrics` endpoint.
- The failover logging section used an event trigger to log role changes, but PostgreSQL event triggers fire for supported database events such as DDL, not promotion or role changes. Replaced it with an explicit insert suitable for failover automation and corrected composite-field access for `pg_control_checkpoint()`.

## Review Notes
- The Patroni YAML is a minimal illustrative snippet, not a complete production configuration. A real deployment should include authentication, bootstrap/init settings, PostgreSQL parameters, pg_hba rules, and DCS security.
- The connection-string example is correct for libpq-style multi-host selection with `target_session_attrs=read-write`, but existing connections still need application-level retry or pool reconnection after a failover.
