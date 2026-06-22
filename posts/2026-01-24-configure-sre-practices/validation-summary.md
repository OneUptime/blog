# Validation Summary: How to Configure SRE Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Site Reliability Engineering practices
- Service Level Objectives and error budgets
- Prometheus alerting rules and PromQL
- OpenTelemetry Collector
- OTLP/HTTP export
- Mermaid flowcharts
- YAML configuration

## Sources Consulted
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector telemetry transformation documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor
- OpenTelemetry Collector resource processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector OTLP HTTP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OneUptime OpenTelemetry telemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry

## Issues Found
- The Prometheus fast-burn alert used different burn-rate thresholds for the 1-hour and 5-minute windows. Updated both thresholds to 14.4x, matching the Google SRE Workbook's common multi-window SLO alerting guidance for 2% budget consumption in 1 hour.
- The OpenTelemetry Collector filter processor example used the legacy `spans.exclude.match_type/span_names` style. Updated it to the current documented OTTL `trace_conditions` syntax with `error_mode: ignore`.
- The OpenTelemetry Collector example said it collected traces, metrics, and logs, but only configured traces and metrics pipelines. Added a `logs` pipeline.
- The OTLP/HTTP exporter used `otlphttp`, which current OpenTelemetry Collector documentation marks as a deprecated alias. Updated it to `otlp_http`.
- The OneUptime OTLP endpoint was shown as `https://otlp.oneuptime.com`. Updated it to `https://oneuptime.com/otlp`, matching OneUptime's telemetry documentation.
- The Collector environment-variable reference used `${ONEUPTIME_TOKEN}`. Updated it to `${env:ONEUPTIME_TOKEN}`, matching current Collector configuration syntax.
- Added `encoding: json` and the JSON content type header to the OneUptime OTLP/HTTP exporter example, matching OneUptime's Collector example.

## Review Notes
All YAML snippets were parsed locally with PyYAML after the edits. Native `promtool` and `otelcol` validation could not be run because those binaries are not installed in the review environment.
