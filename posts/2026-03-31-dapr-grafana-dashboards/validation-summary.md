# Validation Summary: How to Create Grafana Dashboards for Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Grafana (dashboard visualization)
- Prometheus (metrics collection and PromQL queries)
- Kubernetes (ConfigMap for dashboard provisioning)

## Sources Consulted
- Dapr GitHub repository source code (`dapr/dapr`) — `pkg/diagnostics/http_monitoring.go` for HTTP metric definitions and label names
- Dapr GitHub repository — `grafana/` directory for official dashboard JSON filenames (`grafana-system-services-dashboard.json`, `grafana-sidecar-dashboard.json`, `grafana-actor-dashboard.json`)
- Dapr metrics source code (`pkg/diagnostics/`) for actor, pub/sub, and component metric name definitions
- Dapr OpenCensus Prometheus exporter configuration (`pkg/metrics/exporter.go`) for metric namespace and naming conventions

## Issues Found

1. **Incorrect GitHub URL for Grafana dashboard**: The post referenced `grafana-components-dashboard.json` which does not exist in the Dapr repository. The actual files are `grafana-system-services-dashboard.json`, `grafana-sidecar-dashboard.json`, and `grafana-actor-dashboard.json`. Fixed the URL to use `grafana-system-services-dashboard.json` and added comments listing the other available dashboards.

2. **Wrong HTTP latency metric name**: The post used `dapr_http_server_latency_ms_bucket` but the correct Prometheus metric name is `dapr_http_server_latency_bucket` (no `_ms` suffix). Dapr uses OpenCensus with `stats.UnitMilliseconds` as the unit, but the unit is not appended to the Prometheus metric name. Fixed all three histogram_quantile queries.

3. **Wrong HTTP status code label**: The error rate panel used `status_code` as the label name, but Dapr's HTTP metrics use `status` as the label key (defined as `tag.MustNewKey("status")` in the source). Fixed the PromQL filter from `status_code!~"2.."` to `status!~"2.."`.

4. **Non-existent actor metrics**: The post referenced `dapr_actor_activated_total` and `dapr_actor_active_actors`, neither of which exist in Dapr's metrics. Dapr does not expose an actor activation counter or active actors gauge. The actual actor metrics use the `dapr_runtime_actor_` prefix and include `dapr_runtime_actor_pending_actor_calls`, `dapr_runtime_actor_timers`, and `dapr_runtime_actor_reminders`. Rewrote the Actor panel section to use these real metrics.

## Review Notes
- The PromQL syntax throughout the post is correct (rate(), histogram_quantile(), sum by(), regex label matching).
- The Grafana dashboard variable JSON format and the ConfigMap provisioning approach are both correct.
- The `app_id` label used throughout is confirmed correct in Dapr's metric definitions.
- The pub/sub metrics (`dapr_component_pubsub_egress_count` and `dapr_component_pubsub_ingress_count`) are correct.
- Dapr's metric naming could change in future versions if they migrate from OpenCensus to OpenTelemetry SDK, which may alter metric names or label conventions.
