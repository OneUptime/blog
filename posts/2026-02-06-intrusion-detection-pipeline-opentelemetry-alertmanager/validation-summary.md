# Validation Summary: How to Build an Intrusion Detection Alert Pipeline Using OpenTelemetry Logs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Logs API and SDK for Go
- OpenTelemetry Collector
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector count connector
- Prometheus exporter and PromQL alert rules
- Prometheus Alertmanager
- OTLP HTTP log ingestion

## Sources Consulted
- OpenTelemetry Logs API specification: https://opentelemetry.io/docs/specs/otel/logs/api/
- OpenTelemetry Go Logs API package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/log
- OpenTelemetry Go Logs SDK package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/log
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector connectors README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/connector/README.md
- OpenTelemetry Collector count connector documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/countconnector
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The transform processor examples used unqualified `attributes[...]` paths in log statements. Updated them to `log.attributes[...]`, matching the current transform processor documentation for log OTTL paths.
- The injection detection transform statement split the `where` condition across lines in a way that could be ambiguous in YAML. Kept the same condition but made it a single OTTL statement.
- Alertmanager routes used the older `match` map form. Updated them to the current `matchers` list syntax.
- The PagerDuty receiver used `service_key`, which is for the older Prometheus integration type. Updated the example to `routing_key` for PagerDuty Events API v2.
- Prometheus alert rules described counts over a five-minute window but used `rate()`, which returns a per-second average rate. Replaced those rules with `increase(...[5m])` so the thresholds match the prose.

## Review Notes
- The OpenTelemetry Collector `count` connector is documented as alpha for logs-to-metrics pipelines, so production users should pin and test their Collector distribution/version.
- The Go Logs API package is current but still versioned below v1 as of the reviewed documentation, so applications should pin module versions deliberately.
