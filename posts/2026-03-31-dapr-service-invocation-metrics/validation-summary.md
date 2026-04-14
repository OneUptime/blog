# Validation Summary: How to Monitor Dapr Service Invocation Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (service invocation building block)
- Prometheus (PromQL queries and alert rules)
- gRPC and HTTP metrics instrumentation

## Sources Consulted
- Dapr source code: `pkg/diagnostics/http_monitoring.go` (HTTP metric definitions)
- Dapr source code: `pkg/diagnostics/grpc_monitoring.go` (gRPC metric definitions)
- Dapr source code: `pkg/diagnostics/metrics.go` (label/tag key definitions)
- Dapr metrics overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr GitHub issue #7045 (gRPC server status label fix)
- Dapr GitHub issue #5484 (service invocation metrics proposal)

## Issues Found

1. **Incorrect metric name `dapr_http_server_latency_ms`**: The correct Prometheus metric name is `dapr_http_server_latency` (no `_ms` suffix). The unit is milliseconds but the suffix is not part of the exported name. Fixed all occurrences including the `_bucket` histogram variant.

2. **Incorrect metric name `dapr_grpc_server_io_latency_ms`**: The correct name is `dapr_grpc_io_server_server_latency`. The internal OpenCensus name is `grpc.io/server/server_latency`, which maps to this Prometheus name. Fixed in the metric listing.

3. **Incorrect metric name `dapr_http_client_roundtrip_latency_ms`**: The correct name is `dapr_http_client_roundtrip_latency` (no `_ms` suffix). Fixed all occurrences including `_bucket` and `_count` histogram variants used in PromQL queries.

4. **Incorrect metric name `dapr_grpc_client_io_latency_ms`**: The correct name is `dapr_grpc_io_client_roundtrip_latency`. The internal OpenCensus name is `grpc.io/client/roundtrip_latency`. Fixed in the metric listing.

5. **Incorrect label name `status_code`**: Dapr HTTP metrics use the label `status`, not `status_code`. Fixed in all PromQL queries, label selectors, success rate calculations, and alert rule expressions.

6. **Non-existent label `protocol`**: The `protocol` label does not exist on any Dapr metric. Removed from the labels list.

## Review Notes
- The PromQL query patterns (rate, histogram_quantile, topk, success rate calculations) are all syntactically correct and follow best practices.
- The Prometheus alert rule YAML format is correct.
- gRPC metrics use different label names than HTTP metrics (`grpc_server_method` vs `method`, `grpc_server_status` vs `status`). The post focuses on HTTP metrics in its queries, which is fine, but readers should be aware that gRPC label names differ.
- Dapr also exposes runtime-level service invocation metrics (`dapr_runtime_service_invocation_req_sent_total`, etc.) which provide additional visibility with `src_app_id` and `dst_app_id` labels. These are not covered in the post but could be a useful addition in a future update.
