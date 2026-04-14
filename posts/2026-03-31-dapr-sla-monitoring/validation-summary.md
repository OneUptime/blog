# Validation Summary: How to Implement Dapr SLA Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (runtime metrics for service invocation)
- Prometheus (recording rules, PromQL, HTTP API)
- Prometheus Operator (PrometheusRule CRD)
- Grafana (gauge panel configuration, dashboards)
- Bash / curl / jq (for querying Prometheus API)

## Sources Consulted
- Dapr metrics reference: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr metrics configuration docs: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr service invocation metrics proposal: https://github.com/dapr/dapr/issues/5484
- Dapr gRPC latency metric issue: https://github.com/dapr/dapr/issues/7045
- Dapr Prometheus integration docs: https://docs.dapr.io/operations/observability/metrics/prometheus/

## Issues Found

### 1. Incorrect Dapr metric name (missing `_runtime_` prefix)
- **What was wrong:** The post used `dapr_service_invocation_req_sent_total` throughout, but the actual Dapr metric name is `dapr_runtime_service_invocation_req_sent_total`. All Dapr runtime metrics use the `dapr_runtime_` prefix.
- **What was changed:** Replaced all 6 occurrences of `dapr_service_invocation_req_sent_total` with `dapr_runtime_service_invocation_req_sent_total` in the recording rules, Grafana dashboard query, and weekly report script.
- **Why:** Using the wrong metric name would cause all PromQL queries to return no results, making the entire monitoring setup non-functional.

### 2. Incorrect label name for status codes
- **What was wrong:** The post used `status_code=~"2.."` as the label filter, but the actual label on Dapr service invocation metrics is `status`, not `status_code`.
- **What was changed:** Replaced `status_code` with `status` in both recording rule expressions (rate5m and rate1h).
- **Why:** Filtering on a non-existent label would cause the numerator query to return no matches, resulting in a success rate of 0% regardless of actual availability.

### 3. SLO description inconsistent with implementation
- **What was wrong:** The availability SLO was described as "99.9% of service invocation requests succeed (non-5xx)" but the PromQL implementation filters for `status=~"2.."` (2xx only), which excludes 3xx and 4xx responses as well.
- **What was changed:** Updated the SLO description to "99.9% of service invocation requests return 2xx" to match the actual PromQL implementation.
- **Why:** The SLO definition must match the measurement implementation to avoid confusion. Filtering for 2xx-only success is the more common SRE practice for service-to-service invocation availability.

## Review Notes
- The `dapr_grpc_io_server_server_latency_bucket` metric name used in the latency section was verified as correct — the double "server" follows the OpenCensus `grpc.io/server/server_latency` naming convention.
- The error budget calculation formula is mathematically correct (verified: 30 days = 43,200 minutes, 0.1% error budget = 43.2 minutes allowed downtime).
- The `histogram_quantile` usage correctly includes `le` in the `by` clause, which is required for proper histogram quantile computation.
- The Prometheus HTTP API usage (`/api/v1/query` with `--data-urlencode`) and jq parsing of the response format are both correct.
- The PrometheusRule CRD format (`apiVersion: monitoring.coreos.com/v1`) is correct for the Prometheus Operator.
- Recording rule names follow the Prometheus naming convention `level:metric:operations`.
- The Grafana gauge panel JSON is a valid partial panel definition with appropriate threshold configuration.
