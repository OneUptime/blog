# Validation Summary: How to Build Alert Runbooks That Auto-Populate

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- Prometheus and PromQL
- Grafana Tempo
- Grafana Loki and LogQL
- Prometheus Alertmanager
- Python
- PyYAML
- HTTPX
- Slack Block Kit
- YAML
- Mermaid

## Sources Consulted
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Grafana Tempo HTTP API documentation: https://grafana.com/docs/tempo/latest/api_docs/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki labels documentation: https://grafana.com/docs/loki/latest/get-started/labels/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry RPC metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/rpc-metrics/
- Slack Block Kit header block documentation: https://docs.slack.dev/reference/block-kit/blocks/header-block
- Slack Block Kit section block documentation: https://docs.slack.dev/reference/block-kit/blocks/section-block
- Slack Block Kit text object documentation: https://docs.slack.dev/reference/block-kit/composition-objects/text-object/

## Issues Found
- The HTTP error-rate PromQL query used the older `http_status_code` label. Updated it to `http_response_status_code`, matching current OpenTelemetry HTTP semantic conventions after Prometheus-style label conversion.
- The Tempo trace search example built a tag query from `filters` and joined key-value pairs with `&`, but Tempo's tag search parameter expects logfmt and its current search examples prefer TraceQL via `q`. Changed the runbook template to use a TraceQL query and updated the Python code to send it as the `q` parameter.
- The Loki log query used dotted OTel attribute names (`service.name`) as LogQL labels. Loki stores default OTel resource attributes as labels with periods replaced by underscores, so the example now uses `service_name`. The severity filter was updated to `severity_text`, which matches the OTel log field naming commonly exposed through OTLP-to-Loki ingestion.
- The RPC dependency metric used `rpc_client_duration_seconds_*`, but current OpenTelemetry RPC semantic conventions define `rpc.client.call.duration`. Updated the Prometheus metric names to `rpc_client_call_duration_seconds_sum` and `rpc_client_call_duration_seconds_count`.
- The Python code imported `timedelta` but did not use the runbook `time_range` values. Added a small helper to convert values such as `last_10m` into `start` and `end` query parameters for Tempo and Loki.
- The Python code treated the Alertmanager webhook body as a single alert, while Alertmanager webhook receivers send grouped payloads containing an `alerts` array. Updated `process_alert` to enrich each alert when a grouped payload is received.
- The Prometheus query code passed `datetime.utcnow().isoformat()` as the `time` parameter. Since Prometheus defaults instant queries to server time and accepts an optional RFC3339 or Unix timestamp, the example now omits the parameter.

## Review Notes
The snippets are intentionally illustrative and still assume that the Prometheus and Loki deployments promote `service_name` and related OpenTelemetry attributes into labels. That is common in Grafana/OpenTelemetry pipelines but can vary by collector and backend configuration.
