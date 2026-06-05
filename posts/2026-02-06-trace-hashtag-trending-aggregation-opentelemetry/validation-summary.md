# Validation Summary: How to Trace Hashtag Trending Algorithm and Real-Time Aggregation Performance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OTLP gRPC exporters
- OpenTelemetry Collector
- Python stream-processing instrumentation patterns
- Real-time hashtag trending and spam-filtering pipelines

## Sources Consulted
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python OTLP exporter API reference: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python metrics API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/metrics/

## Issues Found
- The setup snippet imported `metrics` and created metric instruments later, but it did not configure a `MeterProvider` or metric exporter. I added `OTLPMetricExporter`, `PeriodicExportingMetricReader`, and `MeterProvider` setup so the metric instruments use an SDK provider instead of the default no-op meter provider.
- The OTLP gRPC exporter endpoint used `http://otel-collector:4317` without `insecure=True`. The official OpenTelemetry Python gRPC exporter example uses `insecure=True` for an insecure local HTTP endpoint, so I added it to both trace and metric exporters.
- The setup snippet did not set a service resource. The official OpenTelemetry Python exporter examples note that service name is required by most backends, so I added a `Resource` with `service.name` for both trace and metric providers.
- The latency metric was named `trending.computation.latency_ms` while also specifying a unit. OpenTelemetry semantic conventions state that units should generally be carried in metric metadata rather than the metric name, and duration instruments should use seconds. I renamed it to `trending.computation.latency` and changed the unit to `s`.

## Review Notes
- The remaining functions such as `increment_hashtag_counter`, `calculate_velocity`, and `apply_editorial_overrides` are domain placeholders. Their use is appropriate for a conceptual instrumentation guide, but a production example would need concrete implementations and calls to record the metric instruments.
- The post stores identifiers such as `user.id`, `post.id`, and individual hashtags as span attributes. This is technically valid OpenTelemetry usage, but production systems should consider privacy and cardinality controls before emitting these attributes at high volume.
