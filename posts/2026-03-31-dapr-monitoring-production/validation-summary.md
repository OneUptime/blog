# Validation Summary: How to Set Up Dapr Monitoring for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Prometheus (metrics scraping)
- Grafana (dashboards and visualization)
- Zipkin (distributed tracing)
- Kubernetes (deployment platform)

## Sources Consulted
- Dapr metrics configuration docs: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr metrics reference (GitHub): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Grafana setup guide: https://docs.dapr.io/operations/observability/metrics/grafana/
- Dapr official Grafana dashboards (GitHub): https://github.com/dapr/dapr/tree/master/grafana
- Dapr Zipkin tracing setup: https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Grafana CLI documentation: https://grafana.com/docs/grafana/latest/administration/cli/

## Issues Found

1. **Configuration field name `metric` should be `metrics` (plural)**: The Dapr Configuration spec uses `spec.metrics` (plural), not `spec.metric`. Fixed to `metrics`.

2. **Incorrect metric name `dapr_service_invocation_req_sent_total`**: The correct metric name includes the `runtime_` prefix: `dapr_runtime_service_invocation_req_sent_total`. Fixed.

3. **Incorrect metric name `dapr_pubsub_incoming_messages_total`**: This metric does not exist. The correct metric for pub/sub ingress is `dapr_component_pubsub_ingress_count`. Fixed.

4. **Incorrect metric name `dapr_pubsub_publish_count`**: This metric does not exist. The correct metric for pub/sub egress is `dapr_component_pubsub_egress_count`. Fixed.

5. **Incorrect metric name `dapr_placement_actor_count`**: This metric does not exist. Replaced with `dapr_placement_runtimes_total`, which is an actual Dapr placement service metric. Fixed.

6. **Fabricated Grafana dashboard IDs (14850, 14848)**: These dashboard IDs do not exist on grafana.com (both return 404). The official Dapr documentation directs users to import JSON dashboard files from the dapr/dapr GitHub repository. Fixed to use the correct approach with `curl` to download JSON files and the Grafana HTTP API to import them.

7. **Non-existent `grafana-cli dashboards import` command**: The `grafana-cli` tool does not have a `dashboards` subcommand. It only supports `plugins` and `admin` commands. Fixed by replacing with the Grafana HTTP API import method.

## Review Notes
- The Prometheus scrape configuration for Dapr sidecars uses a label selector `app.kubernetes.io/part-of: dapr` which is a reasonable approach, though the exact label may vary depending on the Dapr installation method (Helm vs CLI). Users should verify the labels on their Dapr sidecar pods.
- The tracing configuration is correct but uses `zipkin.monitoring` as the namespace for the Zipkin service. Official examples use `zipkin.default.svc.cluster.local`. The blog's choice is valid but readers should adjust for their own namespace.
- The `dapr_grpc_io_server_server_latency` metric is a histogram base name; in Prometheus it will appear with `_bucket`, `_count`, and `_sum` suffixes. This is not mentioned in the post but is standard Prometheus behavior that most readers would know.
