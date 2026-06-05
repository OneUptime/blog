# Validation Summary: How to Monitor Database Replication Lag with OpenTelemetry Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry Collector
- PostgreSQL streaming replication monitoring
- MySQL replication monitoring
- MariaDB replication monitoring
- MongoDB replica set monitoring
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- PostgreSQL current monitoring statistics documentation for `pg_stat_replication`: https://www.postgresql.org/docs/current/monitoring-stats.html
- MySQL 8.0 `SHOW REPLICA STATUS` documentation: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MariaDB `SHOW REPLICA STATUS` documentation: https://mariadb.com/docs/server/reference/sql-statements/administrative-sql-statements/show/show-replica-status
- MongoDB `replSetGetStatus` documentation: https://www.mongodb.com/docs/manual/reference/command/replsetgetstatus/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The PostgreSQL query calculated per-replica time lag on the primary with `pg_last_xact_replay_timestamp()`, which is a standby-side replay timestamp function and does not provide each standby's replay delay from `pg_stat_replication`. Changed it to use `EXTRACT(EPOCH FROM replay_lag)`, the lag interval exposed by `pg_stat_replication`.
- The MySQL/MariaDB example only handled MySQL 8.0.22+ `Source`/`Replica` field names. MariaDB `SHOW REPLICA STATUS` still reports fields such as `Seconds_Behind_Master`, `Master_Host`, `Slave_IO_Running`, and `Slave_SQL_Running`. Added fallback handling for those field names.
- The MySQL/MariaDB example mutated each replica config with `pop("replica_name")` and then restored it later. Replaced that with a derived connection-parameter dictionary so the monitoring configuration is not mutated during collection.
- The Collector example used a OneUptime gRPC endpoint form that does not match current OneUptime documentation. Updated it to use the documented `otlphttp` exporter, `https://oneuptime.com/otlp`, JSON encoding, and `${env:ONEUPTIME_TOKEN}` environment-variable syntax.
- The metric naming section claimed `db.replication.lag_bytes` applied to MySQL, but the MySQL example emits relay log space rather than a `lag_bytes` metric. Changed that line to PostgreSQL only.

## Review Notes
The OpenTelemetry Python examples use synchronous gauges in a polling loop. This is valid with the current API, though an observable gauge callback would also be a natural fit for periodically read values. The PostgreSQL `replay_lag` column reports recent replay acknowledgment delay and can become `NULL` when a standby is caught up and the primary is idle, so alerting rules should account for missing values.
