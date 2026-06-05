# Validation Summary: How to Read and Interpret Collector Internal Logs

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry
- OpenTelemetry Collector logs and metrics configuration
- OTLP, OTLP HTTP, Prometheus, and Prometheus Remote Write
- Collector receivers, processors, exporters, and extensions
- jq, grep, GNU date, kubectl logs

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporterhelper package documentation: https://go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Collector OTLP HTTP exporter documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlphttpexporter
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- jq manual: https://jqlang.org/manual/
- GNU Coreutils date options: https://www.gnu.org/software/coreutils/manual/html_node/Options-for-date.html
- GNU grep manual: https://www.gnu.org/software/grep/manual/

## Issues Found
- The post stated that the Collector supports five log levels while listing seven values. Updated the description and configuration comment to the four common levels documented for `service.telemetry.logs`: `debug`, `info`, `warn`, and `error`.
- The throughput section showed periodic span summary log lines that are not documented as standard Collector internal logs. Replaced them with documented internal metrics such as `otelcol_receiver_accepted_spans`, `otelcol_receiver_refused_spans`, `otelcol_exporter_sent_spans`, and `otelcol_exporter_send_failed_spans`.
- Two configuration examples used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current `service.telemetry.metrics.readers` Prometheus pull exporter syntax using `host` and `port`.
- Some YAML snippets had duplicate top-level `service:` blocks, which would be misleading as standalone examples. Merged the telemetry and pipeline settings under a single `service:` key in each affected snippet.
- The post used the deprecated `otlphttp` exporter component alias. Updated the log export example to use the current `otlp_http` component name.
- The metrics correlation list referenced `otelcol_processor_refused_spans`, which is not a documented internal metric. Replaced it with the documented `otelcol_receiver_refused_spans` metric.
- The structured logging example defined an OTLP HTTP logs exporter in the regular pipeline component list even though Collector internal log export is configured under `service.telemetry.logs.processors`. Updated the example to use the documented internal logs export configuration.

## Review Notes
Collector internal log messages and formatting are not stable across releases, so the example log lines should be treated as representative patterns rather than exact strings guaranteed by the Collector API. YAML snippets were parsed locally with PyYAML, but `otelcol validate` could not be run because no Collector binary was installed in the workspace.
