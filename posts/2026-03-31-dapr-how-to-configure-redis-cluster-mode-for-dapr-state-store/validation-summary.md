# Validation Summary: How to Configure Redis Cluster Mode for Dapr State Store

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state management building block)
- Redis Cluster
- Kubernetes (deployment target)
- Bitnami Helm charts (redis-cluster)
- Python (application code example)
- Prometheus (monitoring/alerting)

## Sources Consulted
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr component metrics source code: `pkg/diagnostics/component_monitoring.go` (metric names `component/state/count` and `component/state/latencies`)
- Bitnami redis-cluster Helm chart values.yaml: https://github.com/bitnami/charts/blob/main/bitnami/redis-cluster/values.yaml
- Redis Cluster specification (hash slots, hash tags, CLUSTER commands)

## Issues Found

### 1. Incorrect Bitnami redis-cluster Helm chart auth parameters
- **What was wrong:** The Helm install command used `--set auth.enabled=true` and `--set auth.password=mySecurePassword`. These are parameters for the `bitnami/redis` chart, not the `bitnami/redis-cluster` chart.
- **What was changed:** Replaced with `--set usePassword=true` and `--set password=mySecurePassword`, which are the correct parameter names for the `bitnami/redis-cluster` chart.
- **Why:** The two Bitnami Redis charts (`redis` vs `redis-cluster`) use different parameter naming conventions. Using the wrong names would result in the cluster deploying without authentication.

### 2. Incorrect Prometheus metric names for Dapr state store
- **What was wrong:** The Prometheus alert rules referenced `dapr_component_state_query_latencies_bucket` and `dapr_component_state_query_total`. These metric names do not exist in Dapr.
- **What was changed:** Corrected to `dapr_component_state_latencies_bucket` and `dapr_component_state_count`. In Dapr, the operation type (get, set, delete, query) is a label on the metric, not part of the metric name itself.
- **Why:** Using non-existent metric names would cause the Prometheus alerts to never fire, silently failing to monitor the state store.

### 3. Missing `sum() by (le)` in histogram_quantile expression
- **What was wrong:** The latency alert used `histogram_quantile(0.99, rate(...))` without aggregating by the `le` label.
- **What was changed:** Added `sum(...) by (le)` to properly aggregate across instances before computing the quantile.
- **Why:** Without `sum() by (le)`, the expression produces separate quantile values per unique label combination, which gives incorrect results in multi-instance deployments.

### 4. Misleading error alert annotation
- **What was wrong:** The `DaprStateStoreErrors` alert summary said "error rate exceeds 10%" but the expression checks `rate(...) > 0.1`, which is a per-second rate (0.1 errors/second), not a percentage.
- **What was changed:** Updated the summary to "Dapr state store errors > 0.1 per second" to accurately describe the alert threshold.
- **Why:** The mismatch between the expression and annotation would mislead operators into thinking they're alerting on a percentage-based error rate when they're actually alerting on an absolute rate.

## Review Notes
- The `CLUSTER SLOTS` Redis command used in the monitoring section is deprecated in Redis 7.0+ in favor of `CLUSTER SHARDS`. It still works for backward compatibility, but users on Redis 7+ should consider using the newer command.
- The Python code example has an unused `import json` statement (harmless but unnecessary since `requests.post(..., json=...)` handles serialization).
- The Prometheus metric label for success/failure status may vary by Dapr version. Users should check their Dapr deployment's `/metrics` endpoint to confirm the exact label name (could be `success` or `status`).
- The Bitnami redis-cluster chart evolves frequently. Parameter names may change in future chart versions. Users should check the chart's `values.yaml` for the version they are deploying.
- The `auth` section placement in the Dapr Component YAML (at root level as a sibling of `spec`) is correct per the Dapr Component CRD schema.
