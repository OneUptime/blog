# Validation Summary: How to Monitor Circuit Breaker State in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, resiliency policies, circuit breakers)
- Kubernetes (annotations, kubectl)
- Prometheus (metrics scraping, PromQL, alerting rules)
- Grafana (dashboard queries)
- Jaeger (distributed tracing)
- jq (JSON log filtering)

## Sources Consulted
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr metrics overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Prometheus integration: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr logging documentation: https://docs.dapr.io/operations/observability/logging/logs/
- Dapr resiliency overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr tracing overview: https://docs.dapr.io/operations/observability/tracing/tracing-overview/
- Dapr tracing setup: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr source code (resiliency monitoring): https://github.com/dapr/dapr/blob/master/pkg/diagnostics/resiliency_monitoring.go
- Dapr source code (resiliency package): https://github.com/dapr/dapr/blob/master/pkg/resiliency/resiliency.go

## Issues Found
1. **Alert description text mismatch (line 95):** The text said "fires when a circuit breaker trips more than once in 5 minutes" but the corresponding PromQL expression `increase(...[5m]) > 0` fires when there is *any* trip (at least once, i.e., more than zero). Changed "more than once" to "at least once" to match the expression semantics.

## Review Notes
- **Jaeger trace attribute unverified:** The "Correlating Circuit Breaks with Distributed Traces" section claims Dapr adds a `dapr.resiliency.policy` span attribute to traces when a circuit breaker opens. No official Dapr documentation or source code was found confirming this specific span attribute name. The Jaeger API query shown may not return results as described. This claim could not be definitively confirmed or denied, so it was left as-is, but readers should verify this against their own Dapr deployment.
- **Missing `dapr_resiliency_cb_state` metric:** Dapr source code defines a `resiliency/cb_state` gauge metric (exposed as `dapr_resiliency_cb_state` in Prometheus) that directly reports circuit breaker state as a numeric value (0=closed, 1=half-open, 2=open). This metric is arguably the most directly relevant for monitoring circuit breaker *state* but is not mentioned in the post. This is not an error but a notable omission for a future update.
- **Missing `dapr_resiliency_activations_total` metric:** The source code also defines `resiliency/activations_total` which tracks the number of times a resiliency policy has been activated after a failure or state change. This could complement the `dapr_resiliency_count` metric discussed in the post.
- The example log entries are illustrative and plausible but the exact field names and message text may vary between Dapr versions. The structured JSON logging format is correctly enabled via the documented `dapr.io/log-as-json` annotation.
- All Kubernetes annotations (`dapr.io/log-as-json`, `dapr.io/log-level`, `dapr.io/enable-metrics`, `dapr.io/metrics-port`) are verified correct per the official Dapr annotations reference.
- Default metrics port 9090 is confirmed correct.
- PromQL queries and Prometheus alert rule YAML are syntactically correct.
