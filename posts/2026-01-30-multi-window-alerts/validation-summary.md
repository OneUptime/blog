# Validation Summary: How to Implement Multi-Window Alerts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- SRE SLO alerting and error budget burn rates
- Prometheus recording rules and alerting rules
- PromQL
- Prometheus alert templates
- OpenTelemetry Collector
- OpenTelemetry Collector spanmetrics connector
- OneUptime OTLP ingestion
- TypeScript

## Sources Consulted
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector spanmetrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector metricstransform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry

## Issues Found
- The time-to-exhaust values for 14.4x and 6x burn rates were incorrect for a 30-day SLO window. Updated them to approximately 2.1 days and 5 days, and corrected the related Prometheus alert annotations.
- The standard configuration omitted the Google SRE Workbook's 24h/2h 3x ticket-level pattern while the Prometheus warning alert used a nonstandard 6h/1h 3x pairing. Added 2h and 24h recording rules and changed the warning alert to use the 24h/2h 3x pattern.
- The Prometheus annotation query templates mixed Alertmanager-style `.Labels.service` access with Prometheus alert-template variables and used single-quoted PromQL label matchers. Updated them to use `$labels.service` and double-quoted label matchers.
- The OpenTelemetry Collector snippet claimed to compute multi-window aggregations in the Collector and used `metricstransform` with a templated `new_value` that the processor does not support for resource-attribute copying. Changed the wording and configuration to derive span metrics with the `spanmetrics` connector and forward the metrics to OneUptime.
- The Collector trace pipeline did not export to the `spanmetrics` connector, so no span-derived metrics would be produced. Added `spanmetrics` as a trace exporter and kept it as a metrics receiver.
- The OneUptime exporter example omitted the documented JSON encoding and content-type header. Updated the exporter to `otlp_http` with `encoding: json`, `Content-Type: application/json`, and the `x-oneuptime-token` header.
- The TypeScript warning test generated 0.3% errors with only 100 requests per interval, which rounded to zero errors and would not trigger the warning. Increased the interval request count and changed the warning scenario to 0.4% errors so it exceeds the `> 3` burn-rate threshold.

## Review Notes
The deployable YAML snippets were parsed with Prettier's YAML parser, and the TypeScript evaluator plus test snippets were type-checked with `tsc --noEmit --strict --skipLibCheck`. The workspace did not include `promtool` or an `otelcol` binary, so Prometheus and Collector runtime validation was limited to documentation review and YAML parsing.
