# Validation Summary: How to Monitor Dapr State Store Capacity

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (state management building block)
- Dapr Go SDK (client.SaveState, client.GetBulkState)
- Redis (as Dapr state store backend)
- Prometheus (metrics and alerting)
- redis_exporter (Prometheus exporter for Redis)
- PrometheusRule CRD (prometheus-operator)
- Grafana (alerting)
- Kubernetes

## Sources Consulted
- Dapr State Store API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Go SDK client documentation: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr Go SDK pkg.go.dev reference: https://pkg.go.dev/github.com/dapr/go-sdk/client#Client
- Dapr metrics documentation: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr component monitoring source code: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/component_monitoring.go
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/

## Issues Found

### Issue 1: Incorrect Dapr Prometheus metric name (all occurrences)
- **What was wrong:** The post used `dapr_state_req_total` as the Dapr state store Prometheus metric name. This metric does not exist.
- **What was changed:** Replaced all occurrences of `dapr_state_req_total` with `dapr_component_state_count`, which is the correct metric name per the Dapr metrics documentation and source code. The metric has labels including `success` (with values `"true"`/`"false"`), `operation`, `component`, `namespace`, and `app_id`.
- **Why:** The Dapr runtime exposes state store operation counts under `dapr_component_state_count` (defined as `component/state/count` internally). The name `dapr_state_req_total` does not exist in any Dapr version.

### Issue 2: Alert expression did not match its annotation
- **What was wrong:** The `DaprStateStoreErrors` PrometheusRule alert used the expression `rate(dapr_component_state_count{success="false"}[5m]) > 0.1`, which triggers when the absolute error rate exceeds 0.1 errors per second. However, the annotation summary stated "Dapr state store error rate above 10%", implying a percentage-based threshold.
- **What was changed:** Updated the expression to `rate(dapr_component_state_count{success="false"}[5m]) / rate(dapr_component_state_count[5m]) > 0.1`, which correctly computes the error rate as a ratio and triggers when it exceeds 10%.
- **Why:** The original expression and annotation were inconsistent. The ratio-based expression matches the documented intent of alerting on a 10% error rate.

## Review Notes
- The Go SDK `SaveState` signature `(ctx, storeName, key, data, meta, ...StateOption)` is used correctly, with metadata passed as `map[string]string{"ttlInSeconds": "3600"}`.
- The Go SDK `GetBulkState` signature `(ctx, storeName, keys, meta, parallelism)` is used correctly, with `nil` metadata and `10` as the parallelism limit.
- The `ttlInSeconds` metadata field is confirmed as a valid component-level metadata field for the Redis state store component.
- The Redis CLI commands (`INFO memory`, `DBSIZE`, `CONFIG GET maxmemory-policy`) are all correct.
- The redis_exporter metric names (`redis_memory_used_bytes`, `redis_memory_max_bytes`, `redis_evicted_keys_total`) are correct.
- The PrometheusRule CRD format is correct for prometheus-operator.
- The `RedisMemoryHigh` alert expression using `redis_memory_used_bytes / redis_memory_max_bytes > 0.85` is correct and matches its annotation.
