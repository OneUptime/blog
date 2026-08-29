# Validation Summary: Patroni Switchover vs Failover for Planned Maintenance

## Status
validated

## Post Type
Operational guide / maintenance runbook

## Technologies Covered

- PostgreSQL streaming and synchronous replication
- Patroni 4.1.5 high availability, `patronictl`, and REST API
- etcd and `etcdctl`
- HAProxy role-aware health checks
- PgBouncer connection pooling
- PostgreSQL `pg_rewind`
- TLS-enabled libpq/`psql` connections

## Sources Consulted

- Patroni `patronictl` documentation: https://patroni.readthedocs.io/en/latest/patronictl.html
- Patroni REST API, including switchover/failover and healthy-standby rules: https://patroni.readthedocs.io/en/latest/rest_api.html#switchover-and-failover-endpoints
- Patroni dynamic configuration: https://patroni.readthedocs.io/en/latest/dynamic_configuration.html
- Patroni replication modes: https://patroni.readthedocs.io/en/latest/replication_modes.html
- Patroni watchdog lifecycle: https://patroni.readthedocs.io/en/latest/watchdog.html
- Patroni node tag semantics: https://patroni.readthedocs.io/en/latest/yaml_configuration.html#tags
- Patroni pause mode: https://patroni.readthedocs.io/en/latest/pause.html
- Patroni 4.1.5 CLI implementation and tests: https://github.com/patroni/patroni/blob/v4.1.5/patroni/ctl.py and https://github.com/patroni/patroni/blob/v4.1.5/tests/test_ctl.py
- Patroni 4.1.5 REST/HA implementation: https://github.com/patroni/patroni/blob/v4.1.5/patroni/api.py and https://github.com/patroni/patroni/blob/v4.1.5/patroni/ha.py
- etcd cluster-status and endpoint-health documentation: https://etcd.io/docs/v3.7/tasks/operator/how-to-check-cluster-status/
- PostgreSQL monitoring statistics: https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL WAL control functions: https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL standby failover and timelines: https://www.postgresql.org/docs/current/warm-standby-failover.html and https://www.postgresql.org/docs/current/continuous-archiving.html
- PostgreSQL libpq connection and TLS documentation: https://www.postgresql.org/docs/current/libpq-connect.html and https://www.postgresql.org/docs/current/libpq-ssl.html
- PostgreSQL `pg_rewind`: https://www.postgresql.org/docs/current/app-pgrewind.html
- HAProxy active health checks: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- PgBouncer usage and FAQ: https://www.pgbouncer.org/usage and https://www.pgbouncer.org/faq.html

## Issues Found

- The comparison table incorrectly said current `patronictl switchover` requires `--candidate`. Patroni 4.1.5 source and tests allow it to be omitted, in which case eligible replicas race. Updated the table while retaining the recommendation to name a candidate for a deterministic planned move.
- The failover description implied lag, timeline, and synchronous eligibility are always bypassed. A healthy leader still applies `maximum_lag_on_failover` and `check_timeline` before demotion, although manual failover omits synchronous-member eligibility. The full lag/timeline bypass applies when there is no leader. Qualified both the table and failover section accordingly.
- The post tied data-loss risk to `--force`, but that flag only skips confirmation prompts. Changed “forced failover” to “manual failover”; the risk comes from failover semantics and candidate freshness, not from the prompt-control flag.
- The post called `patronictl list` authoritative for candidate eligibility. It is a DCS-derived snapshot; Patroni's server-side REST and HA-loop checks make the decision. Corrected the wording while keeping the list and SQL queries as useful preflight evidence.
- The preflight checks mentioned only `nofailover: true` and said a standby watchdog should be armed. Added the equivalent `failover_priority <= 0` exclusion and clarified that a required watchdog must be usable and capable of activation; Patroni normally activates it before promotion and disables it after demotion.
- “Use Patroni rewind” could be read as a manual Patroni command. Clarified that Patroni runs configured automatic `pg_rewind` recovery, while `patronictl reinit` is the explicit destructive rebuild alternative.

## Review Notes

- The rendered Patroni 4.1.5 `patronictl` synopsis presents `--candidate` as required for switchover, but the 4.1.5 implementation, help behavior, unit tests, and REST API allow omission. Patroni's current master documentation has corrected the synopsis to mark it optional.
- All shown `patronictl`, `etcdctl`, curl, and `psql` commands are syntactically valid. The REST fields and documented `200`, `202`, `400`, `412`, and `503` outcomes are current.
- `pg_stat_replication` reports directly connected standbys only. A cascading topology needs additional evidence for downstream replicas.
- Full cross-user detail in `pg_stat_activity` requires a superuser or a monitoring role such as `pg_read_all_stats`/`pg_monitor`.
- `sslmode=verify-full` requires certificates presented through `postgres-write.internal` to contain that route name in the certificate SAN.
- Successful `pg_rewind` recovery requires data checksums or `wal_log_hints`, `full_page_writes = on`, and access to the required WAL.
