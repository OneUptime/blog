# Validation Summary: How to Build a Logs-to-Metrics Pipeline in the OpenTelemetry Collector for

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib count connector
- OpenTelemetry Collector Contrib sum connector
- OpenTelemetry transform processor and OTTL
- OpenTelemetry metricstransform processor
- OTLP receiver and exporter
- PromQL alert expressions

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector connectors component list: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector Contrib count connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/countconnector
- OpenTelemetry Collector Contrib count connector implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/counter.go
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry OTTL log context documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottllog
- OpenTelemetry OTTL functions documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OpenTelemetry Collector Contrib metricstransform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/metricstransformprocessor
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Local validation with `otelcol-contrib` v0.153.0.

## Issues Found
- The post described count and spanmetrics support as built into the Collector generally. I changed this to the OpenTelemetry Collector Contrib distribution, matching the component distribution list for the count connector.
- The introduction said the pipeline extracts counts and gauges, but the count connector emits counts as delta, monotonic sum metrics. I removed the gauge claim.
- The count connector condition used numeric literal `17` for ERROR severity. I changed it to `SEVERITY_NUMBER_ERROR`, which is the documented OTTL enum for log severity.
- The transform processor examples used unprefixed `body`, `attributes`, and `severity_number` paths. I updated them to current log-context paths such as `log.body`, `log.attributes`, and `log.severity_number`.
- The transform examples assumed `log.body` was always a map. I added `IsMap(log.body)` guards before indexing into `log.body`.
- The count connector explanation called the output a counter. I clarified that the connector emits delta, monotonic sum metric data points.
- The PromQL alert used `rate(...[1m]) > 50` while describing more than 50 errors per minute. I changed it to `increase(...[1m]) > 50`.
- The "Going Beyond Counts" section implied OTTL could build histogram buckets from logs. I revised it to recommend a connector such as `sum` or a custom connector for non-count metric shapes.

## Review Notes
- The main Collector configuration and the smaller transform/metricstransform snippets were validated with `otelcol-contrib` v0.153.0.
- The count connector is currently documented as alpha for logs-to-metrics pipeline use.
