# Validation Summary: How to Implement Recovery Point Objectives

## Status
validated

## Post Type
Tutorial / Guide — practical engineering guide on defining and implementing Recovery Point Objectives (RPO) with code, configuration, and operational guidance.

## Technologies Covered
- Recovery Point Objective (RPO) / Recovery Time Objective (RTO) concepts
- Python 3 (dataclasses, asyncio, enums, hashlib, deque)
- PostgreSQL streaming replication (WAL, hot standby, archive mode)
- Kubernetes ConfigMap resource format
- Prometheus recording rules and alerting rules
- Alertmanager routing and receivers (PagerDuty, Slack, email)
- Bash shell scripting (set -euo pipefail, psql client)
- Continuous Data Protection (CDP) patterns
- Synchronous vs. asynchronous database replication

## Sources Consulted
- PostgreSQL documentation — Streaming Replication & Archive Recovery (https://www.postgresql.org/docs/current/warm-standby.html)
- PostgreSQL release notes / docs on the removal of `recovery.conf` in PostgreSQL 12 (https://www.postgresql.org/docs/12/recovery-config.html and https://www.postgresql.org/docs/current/runtime-config-replication.html)
- PostgreSQL docs for `standby.signal` and `recovery.signal` (https://www.postgresql.org/docs/current/warm-standby.html#STANDBY-SERVER-SETUP)
- PostgreSQL docs for `pg_last_xact_replay_timestamp()` (https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-RECOVERY-INFO-TABLE)
- PostgreSQL docs for `wal_keep_size`, `synchronous_commit`, `synchronous_standby_names` (https://www.postgresql.org/docs/current/runtime-config-replication.html and https://www.postgresql.org/docs/current/runtime-config-wal.html)
- Python `dataclasses`, `asyncio`, and `datetime` standard library docs (https://docs.python.org/3/library/)
- Prometheus alerting rules documentation (https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- Prometheus recording rules documentation (https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- Alertmanager configuration documentation (https://prometheus.io/docs/alerting/latest/configuration/)
- Kubernetes ConfigMap documentation (https://kubernetes.io/docs/concepts/configuration/configmap/)

## Issues Found
1. **PostgreSQL replica configuration used the obsolete `recovery.conf` file.**
   - **What was wrong:** The replica ConfigMap contained a `recovery.conf` key with `primary_conninfo` and `primary_slot_name`, and the surrounding comment described this as "Recovery configuration (PostgreSQL 12+)". This is contradictory and incorrect: `recovery.conf` was removed in PostgreSQL 12. In PostgreSQL 12 and later, `primary_conninfo`, `primary_slot_name`, `restore_command`, etc. must be set in `postgresql.conf` (or `postgresql.auto.conf`), and standby mode is triggered by the presence of a `standby.signal` file.
   - **Fix applied:** Moved `primary_conninfo` and `primary_slot_name` into the replica's `postgresql.conf` section, removed the `recovery.conf` entry, and updated the comments to accurately describe the PostgreSQL 12+ behavior (recovery parameters live in `postgresql.conf`; `standby.signal` triggers standby mode on startup).
   - **Why:** Following the original snippet on a real PostgreSQL 12+ cluster would not configure replication — PostgreSQL silently ignores any file named `recovery.conf` on startup in 12+ (and actually refuses to start if such a file is present in some configurations), so the replica would not connect to the primary.

## Review Notes
- `datetime.utcnow()` is used in the Python examples (`cdp_manager.py`, `rpo_monitor.py`). This works correctly but is deprecated as of Python 3.12 in favor of `datetime.now(timezone.utc)`. The current behavior is unambiguous and the deprecation does not break the examples, so I left this unchanged; readers running 3.12+ will see a `DeprecationWarning` but the code still functions.
- The Prometheus metric name `pg_replication_lag_seconds` is treated as illustrative. `postgres_exporter` exposes lag via several related metrics (e.g., `pg_replication_lag_seconds` is a common name produced by community recording rules / queries.yaml customizations). Readers using a vanilla `postgres_exporter` install may need to adapt the metric to match their exporter's actual output (e.g., `pg_stat_replication_*` series). This is implementation-dependent and not factually wrong.
- The `tier` label used in the example alert expressions (`{tier="1"}`) assumes the operator has configured the exporter or recording rules to attach a `tier` label to the underlying series — this is a reasonable convention but is not produced by `postgres_exporter` out of the box.
- The CDP `_replication_worker` exception path references `event` in the generic `except Exception` block. If a non-`TimeoutError` exception were ever raised by `asyncio.wait_for(self._event_queue.get(), ...)` itself (rather than during downstream processing), `event` could be undefined. In practice this branch is reached after `event` has been assigned, so the example is safe for the documented flow. Not corrected because it would require restructuring the example and the original behavior is reasonable.
- The bash script's reliance on `bc` for floating-point comparison and unquoted shell expansion patterns (e.g., `$(($(date +%s) + TEST_DURATION_MINUTES * 60))`) is conventional and works under `set -euo pipefail`.
- The `wal_keep_size` parameter used in the primary config is correct for PostgreSQL 13+. Operators on PostgreSQL 12 would need `wal_keep_segments` instead; this is not a defect because the surrounding text references PostgreSQL 12+ and the modern parameter applies to current supported releases.
