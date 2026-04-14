# Validation Summary: How to Handle State Store Failover in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (resiliency API, state management, health API, metrics)
- Redis Sentinel
- Dapr JavaScript SDK (`@dapr/dapr`)
- Kubernetes
- Prometheus (alerting rules)

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Redis State Store Reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Health API Reference: https://docs.dapr.io/reference/api/health_api/
- Dapr Sidecar Health Checks: https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr JS SDK (npm `@dapr/dapr`): https://github.com/dapr/js-sdk
- Dapr Component Monitoring Source: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/component_monitoring.go
- Dapr Component Secrets: https://docs.dapr.io/operations/components/component-secrets/

## Issues Found

### 1. Invalid `initialInterval` field in retry policy
- **What was wrong:** The resiliency YAML included `initialInterval: 100ms` under the exponential retry policy. This field does not exist in the Dapr resiliency retry spec. Dapr's exponential back-off uses an internal formula (`PreviousBackOffDuration * Random(0.5, 1.5) * 1.5`) and only exposes `maxInterval` and `maxRetries` as configurable fields.
- **What was changed:** Removed the `initialInterval: 100ms` line from the retry policy YAML.
- **Why:** Using a non-existent field would be silently ignored by Dapr, but is misleading to readers who would expect it to control the initial retry delay.

### 2. Incorrect Prometheus metric name
- **What was wrong:** The Prometheus alert rule used `dapr_component_state_get_total{success="false"}`. The actual Dapr metric is `dapr_component_state_count`, and the operation type (`get`, `set`, `delete`, etc.) is a label (`operation`), not part of the metric name.
- **What was changed:** Updated the PromQL expression from `rate(dapr_component_state_get_total{success="false"}[5m])` to `rate(dapr_component_state_count{operation="get", success="false"}[5m])`.
- **Why:** Using the wrong metric name would cause the alert rule to never fire, giving a false sense of monitoring coverage.

## Review Notes
- The Dapr docs warn against depending on `/v1.0/healthz` endpoints in application code (they are intended for infrastructure probes like Kubernetes liveness/readiness). The blog uses it for monitoring, which is acceptable, but readers should be aware of this caveat.
- The Redis Sentinel YAML could optionally include `redisType: "node"` for explicitness, though it defaults to `"node"` which is correct for Sentinel mode.
- The `success` label with values `"true"`/`"false"` on the corrected metric is confirmed correct from the Dapr source code.
