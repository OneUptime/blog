# Validation Summary: How to Build Recovery Time Objectives

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Disaster recovery concepts (RTO, RPO, MTTR, MTBF)
- Mermaid diagrams (graph LR / TB / TD)
- Python (dataclasses, asyncio, abc, Enum, typing)
- Kubernetes (Deployment, ConfigMap, HorizontalPodAutoscaler `autoscaling/v2`, topologySpreadConstraints, podAntiAffinity, readiness/liveness/startup probes)
- Bash scripting (`set -euo pipefail`, arrays, signal-safe constructs)
- AWS CLI (`aws s3 cp`, `aws s3 ls`)
- PostgreSQL (`psql`, `pg_ctl`)
- Redis (`redis-cli`, RDB snapshots)
- Docker Compose
- Prometheus (alerting rules, recording rules, PromQL vector matching, `humanizeDuration` template function)
- `prometheus_client` Python library (Gauge, Counter, Histogram, `start_http_server`)

## Sources Consulted
- Prometheus operator documentation on vector matching and `group_left`/`group_right` (https://prometheus.io/docs/prometheus/latest/querying/operators/#vector-matching)
- Prometheus alerting rules reference (https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- Prometheus template reference for `humanizeDuration` (https://prometheus.io/docs/prometheus/latest/configuration/template_reference/)
- Kubernetes API reference for `autoscaling/v2` HorizontalPodAutoscaler (stable since 1.23)
- Kubernetes Deployment strategy `RollingUpdate` (maxSurge / maxUnavailable)
- Kubernetes Pod topology spread constraints and pod affinity/anti-affinity docs
- Docker Compose V2 migration notice — Compose V1 (`docker-compose`) reached EOL July 2023; Docker recommends `docker compose` (https://docs.docker.com/compose/migrate/)
- `prometheus_client` Python library README (https://github.com/prometheus/client_python)
- PostgreSQL backup/restore using `psql` and `pg_dump` semantics
- Redis persistence documentation (RDB snapshot file `dump.rdb`)
- Python `asyncio` and `dataclasses` standard library docs (3.10+)

## Issues Found

1. **Deprecated `docker-compose` CLI in the Tier 3 recovery script.** The script invoked `docker-compose -f ... pull / up -d / ps` (Compose V1), which reached end of life in July 2023 and is no longer shipped with current Docker Desktop / Docker Engine installations. Updated all three invocations to the Compose V2 form `docker compose -f ... ...` so the script still works on supported Docker installations in 2026.

2. **Prometheus alert label mismatch (`rto_tier` vs `tier`).** The `RTOThresholdExceeded` alert used `group_left(rto_tier)` and templated `{{ $labels.rto_tier }}` in its description, but the exporter defines the metric `service_rto_threshold_seconds` with labels `['service', 'tier']` — there is no `rto_tier` label. `group_left(rto_tier)` would parse but copy nothing, making the description always render `(Tier )`. Renamed both occurrences to `tier` so the alert actually surfaces the tier number.

3. **Invalid PromQL: vector matching modifiers between a scalar and a vector.** The `RTOThresholdApproaching` alert wrote `(0.75 * on(service) group_left() service_rto_threshold_seconds)`. Per the Prometheus operators reference, vector matching keywords (`on`, `ignoring`, `group_left`, `group_right`) cannot be used in scalar/vector operations — only between two instant vectors. This expression would fail to evaluate. Restructured the expression so the matching modifiers apply to the outer `>` comparison instead:
   ```
   (time() - service_last_healthy_timestamp) >
   on(service) group_left()
   (0.75 * service_rto_threshold_seconds)
   ```
   This is the correct way to compare a vector against a scaled-down threshold from a many-to-one paired vector.

## Review Notes

- The Python failover manager uses naive `datetime.now()` (no `timezone.utc`). This is not wrong, but production code that compares timestamps across processes/regions typically wants `datetime.now(timezone.utc)`. Left as-is to preserve author style — the comparison logic is internally consistent.
- The `prometheus_client` example calls `start_http_server(9090)`. Port 9090 is the conventional Prometheus *server* port; exporters typically listen on a different port (commonly 8000 or the 9100+ range) to avoid colocation conflicts. Functionally correct; left as the author wrote it.
- The Prometheus alert `BackupAgeExceedsRPO` references a metric `system_rpo_threshold_seconds` that is not defined in the accompanying exporter example. This is a reasonable tutorial omission (the reader is expected to define their own RPO threshold metric) rather than a bug, so left unchanged.
- The `customer_churn_rate` dataclass field is documented as a "Percentage" but the example value (`0.02`) and the math treat it as a fraction. This is a comment/wording inconsistency rather than a code bug; left as-is per the instruction to limit changes to technical errors.
- All Mermaid diagrams use valid syntax (`graph LR/TB/TD`, `subgraph`, edge `-->`).
- The Kubernetes `autoscaling/v2` HPA, `topologySpreadConstraints`, `podAntiAffinity`, and the three probe types (readiness, liveness, startup) are all current and correctly structured for modern Kubernetes (≥1.25).
- The histogram buckets `[60, 300, 900, 3600, 14400, 86400, 259200]` correctly align with the tier boundaries (1m, 5m, 15m, 1h, 4h, 24h, 72h).
- The Python type hint `tuple[bool, str]` requires Python 3.9+; consistent with the modern Python idioms used elsewhere in the post.
