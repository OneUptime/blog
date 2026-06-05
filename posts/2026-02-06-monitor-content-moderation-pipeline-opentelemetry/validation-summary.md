# Validation Summary: How to Monitor Content Moderation Pipeline Latency with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python tracing
- OpenTelemetry Python metrics
- OTLP gRPC exporters
- Content moderation pipeline instrumentation
- AI classification and human review observability

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html

## Issues Found
- The setup snippet initialized a TracerProvider but did not initialize a MeterProvider. In current OpenTelemetry Python, metrics use the default no-op meter unless a real MeterProvider is configured, so the metric instruments would not export data. I added an OTLPMetricExporter, PeriodicExportingMetricReader, and MeterProvider setup.
- The gRPC OTLP span exporter used an insecure HTTP endpoint without explicitly setting `insecure=True`. The official OpenTelemetry Python gRPC OTLP examples set `insecure=True` for non-TLS collector endpoints, so I added it to both trace and metric exporters.
- The AI classifier section said models were "running in parallel", but the code runs classifiers sequentially in a loop. I changed the wording to say the stage involves multiple models without claiming parallel execution.
- The human review queue depth metric used a synchronous UpDownCounter while describing a current sampled queue depth. I changed it to an ObservableGauge with a callback, which matches OpenTelemetry guidance for reporting current values observed during metric collection.
- The metric named `moderation.ai.accuracy` was a Counter, which is appropriate for monotonic event counts but misleading for an accuracy ratio. I renamed it to `moderation.ai.agreements` and clarified the description as a count of agreements with human reviewers.

## Review Notes
The code examples are illustrative and still assume application-specific functions and data models such as `run_policy_checks`, `ClassificationResult`, `get_human_review_queue_depth`, and `queue_human_review`. The OpenTelemetry API usage, exporter setup, span/event APIs, and metric instrument choices are now aligned with current official documentation.
