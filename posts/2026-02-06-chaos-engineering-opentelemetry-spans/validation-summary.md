# Validation Summary: How to Tag Chaos Engineering Experiments in OpenTelemetry Spans

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry Baggage
- OpenTelemetry span attributes and span events
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector Kubernetes attributes processor
- PromQL-style metric queries
- Jaeger-style trace query examples

## Sources Consulted
- OpenTelemetry Python baggage API: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry Python trace export SDK API: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry trace SDK specification, SpanProcessor behavior: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Baggage concept documentation: https://opentelemetry.io/docs/concepts/signals/baggage/
- W3C Baggage specification: https://www.w3.org/TR/baggage/
- OpenTelemetry Collector transform processor documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Kubernetes attributes processor documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- Jaeger API documentation: https://www.jaegertracing.io/docs/1.76/architecture/apis/

## Issues Found
- The tracer registration snippet imported and used `BatchSpanExporter`, which is not an OpenTelemetry Python SDK class. The SDK registers exporters through `SimpleSpanProcessor` or `BatchSpanProcessor`, so the snippet now imports and uses `BatchSpanProcessor(your_exporter)`.
- The custom `SpanProcessor.force_flush` method returned `None`. The Python SDK's processor contract returns a boolean, so the example now returns `True`.
- The Collector transform example referenced a Kubernetes pod annotation as if it were automatically available in resource attributes. The Kubernetes attributes processor must explicitly extract annotations, so the example now adds a `k8sattributes` processor extraction rule and transforms the extracted `chaos.experiment.name` resource attribute.
- The Collector example did not state the required processor ordering. A short note now explains that `k8sattributes` must run before `transform` in the traces pipeline.

## Review Notes
The PromQL and trace query examples are backend-dependent illustrations rather than portable OpenTelemetry APIs. They are acceptable as examples, but future revisions could name a concrete backend or span-metrics setup to make the query syntax fully reproducible.
