# Validation Summary: How to Implement RPO and RTO for Dapr Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Resiliency spec, Component CRD, state store integration)
- Redis (replication, INFO command, master/replica offset tracking)
- Kubernetes (kubectl patch, rollout restart, rollout status)
- Prometheus / prometheus-operator (PrometheusRule CRD, recording rules, alerting rules)
- Bash scripting

## Sources Consulted
- Dapr Resiliency overview and schema reference — https://docs.dapr.io/operations/resiliency/resiliency-overview/ and https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Redis INFO command documentation — https://redis.io/docs/latest/commands/info/ (replication section confirming `master_repl_offset` and `slave_repl_offset` field names)
- Kubernetes kubectl reference for `patch`, `rollout restart`, and `rollout status` commands
- Prometheus Operator PrometheusRule CRD specification — https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
No technical issues found.

## Review Notes
- The Dapr Resiliency YAML uses `consecutiveFailures >= 3` in the circuit breaker `trip` expression. Official Dapr examples typically use `>` (strict greater-than), but `>=` is valid CEL syntax and works correctly — it simply trips on the 3rd consecutive failure rather than the 4th. The author's choice is intentional and correct.
- The Redis replication lag script measures lag in bytes, not time. The comment "10MB = ~60 seconds of writes at typical load" is a reasonable approximation but is workload-dependent. Redis also exposes a per-replica `lag` field (in seconds) in the primary's `INFO replication` output which could complement this approach, but what's shown is a valid and common technique.
- The Prometheus recording rule references `redis_connected_slaves_lag_seconds` as a source metric. This metric name is illustrative; actual metric names depend on which Redis exporter is deployed (e.g., oliver006/redis_exporter). Users will need to adapt the metric name to their specific exporter's naming conventions.
- `date +%s%3N` in the RTO measurement script requires GNU date (standard on Linux/Kubernetes nodes) and does not work with BSD date on macOS.
