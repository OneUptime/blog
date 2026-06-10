# Validation Summary: How to Create Vertical Scaling Decisions

## Status
validated

## Post Type
Guide / Decision Framework (technical, with code examples)

## Technologies Covered
- PostgreSQL (configuration, system catalogs, buffer cache metrics)
- Python (psutil, asyncio, signal, dataclasses, contextlib)
- AWS CLI (ec2, elbv2 target group management)
- Prometheus / PromQL (node_exporter and postgres_exporter metrics, alerting rules)
- Linux sysstat (mpstat)
- Bash (migration shell script)
- Mermaid (flowcharts and sequence diagrams)
- General concepts: vertical vs horizontal scaling, blue-green deployments, graceful shutdown

## Sources Consulted
- PostgreSQL documentation - server configuration parameters: https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL system views: https://www.postgresql.org/docs/current/monitoring-stats.html (pg_statio_user_tables, pg_stat_database)
- psutil documentation: https://psutil.readthedocs.io/ (cpu_percent, virtual_memory, cpu_count)
- Python asyncio docs: https://docs.python.org/3/library/asyncio.html (Event, wait_for, TimeoutError)
- Python signal module: https://docs.python.org/3/library/signal.html
- AWS CLI Reference - elbv2: https://docs.aws.amazon.com/cli/latest/reference/elbv2/ (register-targets, deregister-targets, wait target-in-service)
- AWS CLI Reference - ec2 wait instance-status-ok: https://docs.aws.amazon.com/cli/latest/reference/ec2/wait/instance-status-ok.html
- Prometheus node_exporter metrics: https://github.com/prometheus/node_exporter
- postgres_exporter metrics: https://github.com/prometheus-community/postgres_exporter
- sysstat / mpstat man page: https://man7.org/linux/man-pages/man1/mpstat.1.html

## Issues Found
No technical issues found.

## Review Notes
- The PostgreSQL configuration block is presented in YAML syntax rather than the native `postgresql.conf` `key = 'value'` format. This is a common pattern when configuration is supplied via a Kubernetes Operator (e.g., CloudNativePG, Zalando) or Helm chart values, so it remains a reasonable illustration. Readers applying it directly to `postgresql.conf` would need to translate the syntax (e.g., `shared_buffers = '64GB'`).
- The `GracefulScaler.request_context` example references a `ServiceUnavailable` exception that is not imported or defined in the snippet. This is acceptable in an illustrative example where the reader is expected to substitute their framework's exception (FastAPI's `HTTPException`, Starlette's, etc.), but worth noting if the snippet is intended to be copy-pasted as-is.
- The `SingleCoreBottleneck` PromQL expression uses `max by (instance) (rate(node_cpu_seconds_total{mode!="idle"}[5m]))`. Because the rate is computed per (cpu, mode) before aggregation, the max identifies the busiest non-idle (cpu, mode) pair rather than total per-core busyness. It will fire correctly for single-core saturation in any single mode, but won't catch cases where a core is, say, 60% user + 40% system. Not incorrect, but a more thorough rule could sum modes per CPU before taking the max.
- The `DatabaseCacheMisses` rule uses raw `pg_stat_database_blks_hit / (pg_stat_database_blks_hit + pg_stat_database_blks_read)` counter values. For long-running databases this reflects the lifetime hit ratio rather than current behavior; using `rate()` over a window would be more responsive to current load. Still a valid threshold, just slow to react.
- The `psutil.virtual_memory().used` value can include cached/buffered memory depending on the platform's definition; `memory.percent` or `memory.available` are often preferred for capacity decisions, but `used` is not incorrect here.
- Cost figures in the cost-comparison example are illustrative; readers should plug in their own provider pricing.
