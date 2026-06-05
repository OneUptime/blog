# Validation Summary: How to Use Request-Scoped Correlation IDs That Unify Traces, Logs,

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing, baggage, logs, metrics, and exemplars
- OpenTelemetry Python API
- OpenTelemetry Java API
- OpenTelemetry Collector transform processor and OTTL
- Grafana Tempo TraceQL
- Grafana Loki LogQL

## Sources Consulted
- OpenTelemetry Baggage API specification: https://opentelemetry.io/docs/specs/otel/baggage/api/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Python baggage API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java Span Javadoc: https://javadoc.io/doc/io.opentelemetry/opentelemetry-api/latest/io/opentelemetry/api/trace/Span.html
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/

## Issues Found
- The main Python metrics example attached `order.id` and `correlation.id` directly as histogram attributes, contradicting the later cardinality guidance. I changed the example to record only the low-cardinality `order.type` attribute and explain that exemplars should link back to traces with the high-cardinality span attributes.
- The Java example set span attributes and MDC values from baggage without checking for missing baggage entries. I added null checks before setting span attributes and MDC values.
- The Collector section used a `baggage` processor configuration with `rules`, `baggage_key`, and `attribute_key`, but current OpenTelemetry Collector distributions do not provide a built-in baggage processor with that configuration. I replaced it with a transform processor guardrail that deletes high-cardinality IDs from metric datapoint attributes.
- The TraceQL example queried `span.order.id`, which can be interpreted as a dotted path rather than the literal span attribute name `order.id`. I changed it to `span."order.id"`, matching TraceQL quoted-attribute syntax for attribute names containing dots.
- The metrics exemplar comments implied that `order.id` appears directly in the exemplar. I corrected the wording to say that the exemplar provides a trace/span link to the trace containing `order.id` as a span attribute.

## Review Notes
The examples remain illustrative and assume normal OpenTelemetry context propagation is configured between services. The profile step in the investigation workflow is backend-specific; OpenTelemetry profiling support and trace-to-profile linking depend on the chosen observability backend.
