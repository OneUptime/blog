# Validation Summary: How to Set Up Comprehensive Dapr Monitoring Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Prometheus (metrics collection and scraping)
- Grafana (dashboard visualization)
- Kubernetes (PodMonitor CRD, pod annotations)
- Prometheus Operator (monitoring.coreos.com/v1 PodMonitor)

## Sources Consulted
- Dapr metrics overview documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Configuration spec: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr metrics list (GitHub): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr official Grafana dashboards: https://github.com/dapr/dapr/tree/master/grafana
- Grafana HTTP API documentation: https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/
- Prometheus Operator PodMonitor CRD documentation

## Issues Found

1. **`spec.metric` should be `spec.metrics` (plural)**: The Dapr Configuration resource uses `spec.metrics` (plural), not `spec.metric`. Fixed to `metrics`.

2. **Incorrect gRPC metric name**: `dapr_grpc_server_completed_rpcs` is not the actual metric name. The correct name is `dapr_grpc_io_server_completed_rpcs` (with `_io_` infix). Fixed.

3. **Non-existent state store metric names**: `dapr_component_state_get_count` and `dapr_component_state_set_count` do not exist. Dapr uses a single metric `dapr_component_state_count` with an `operation` label to distinguish between get, set, and delete operations. Fixed both to `dapr_component_state_count{..., operation="get"}` and `dapr_component_state_count{..., operation="set"}`.

4. **Non-existent memory metric**: `dapr_runtime_mem_sys_bytes` does not exist as a Dapr-specific metric. The sidecar exposes standard Go runtime metrics; the correct metric for memory tracking is `go_memstats_alloc_bytes`. Fixed.

5. **Incorrect label on CPU metric**: `process_cpu_seconds_total{app=daprd}` used a fabricated `app=daprd` label that does not exist on this standard Prometheus process collector metric. Fixed by removing the non-existent label filter.

6. **Wrong Grafana dashboard filenames in URLs**: The blog used invented filenames (`dashboard-dapr-sidecar-resources.json` and `dashboard-dapr-system-services.json`). The actual filenames in the Dapr repo are `grafana-sidecar-dashboard.json` and `grafana-system-services-dashboard.json`. Fixed both URLs.

7. **Non-functional Grafana import command**: The curl command had three issues: (a) used `/api/dashboards/import` instead of the documented `/api/dashboards/db` endpoint, (b) missing required authentication header, and (c) the raw dashboard JSON file needs to be wrapped in a `{"dashboard": ..., "overwrite": true}` envelope. Fixed all three issues.

## Review Notes
- The Dapr annotations section is correct but note that `dapr.io/enable-metrics: "true"` is the default, so it is technically redundant. This is not an error, just a note.
- The PodMonitor configuration is correct and uses the proper port name `dapr-metrics` that the Dapr sidecar injector assigns.
- The PromQL expressions in the Grafana dashboard panels are syntactically correct and use proper aggregation patterns, though they reference the metric names that were corrected above. The panel JSON was not updated since it serves as an illustrative snippet and uses the same `dapr_http_server_request_count` metrics which are correct.
- The `graph` panel type in Grafana JSON is legacy (replaced by `timeseries` in newer Grafana versions) but still functional. Not changed since it works.
