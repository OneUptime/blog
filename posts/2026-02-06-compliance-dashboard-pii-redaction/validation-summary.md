# Validation Summary: How to Build a Compliance Dashboard That Tracks PII Redaction Effectiveness

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry tracing spans and resource attributes
- Prometheus / PromQL
- Prometheus alerting rules
- Grafana dashboard queries
- PII redaction and validation scanning

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The `scan_and_redact` helper returned only `value` for non-string attributes, but callers unpacked a two-value tuple. Changed it to return `(value, False)` so spans with numeric, boolean, or other non-string attributes do not raise a `TypeError`.
- The span redaction example mutated `span.attributes` directly. Updated it to iterate over a list copy of attributes and call `span.set_attribute(...)`, which matches the OpenTelemetry span API.
- The validation scanner used `datetime.utcnow()`, which returns a naive UTC timestamp and is deprecated in modern Python. Changed it to `datetime.now(timezone.utc)` and imported `timezone`.
- The validation scanner accessed `span.resource["service.name"]`, which was inconsistent with OpenTelemetry resource access used elsewhere in the post. Changed it to read `span.resource.attributes.get("service.name", "unknown")`.
- The Prometheus alert label `compliance: true` could be parsed by YAML as a boolean instead of a string label value. Quoted it as `compliance: "true"`.
- Removed an unused `MeterProvider` import from the first Python snippet.
- The introduction implied auditors could be shown that rules caught 100% of the PII that flowed through. Reworded this to focus on providing evidence that configured redaction rules are working, because the validation scanner is sampled and pattern-based.

## Review Notes
- The PromQL examples assume the default OpenTelemetry-to-Prometheus translation where dotted metric and label names are converted to underscore-separated Prometheus names and counters receive a `_total` suffix.
- The post correctly presents the post-redaction scanner as sampled validation rather than absolute proof that every exported telemetry record was inspected.
