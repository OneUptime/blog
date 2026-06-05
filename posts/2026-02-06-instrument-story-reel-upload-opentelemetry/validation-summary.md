# Validation Summary: How to Instrument Story and Reel Upload, Processing, and Distribution Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python tracing API and SDK
- OpenTelemetry Python metrics API and SDK
- OTLP/gRPC exporters
- Video upload, transcoding, moderation, and CDN distribution pipelines

## Sources Consulted
- OpenTelemetry Python instrumentation guide: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporter guide: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python trace Span API: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python OTLP exporter API: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html

## Issues Found
- The setup snippet created metrics instruments from the global meter but did not configure a metrics SDK `MeterProvider` or metric reader, so the metrics would not be collected/exported in a typical application. Added `OTLPMetricExporter`, `PeriodicExportingMetricReader`, and `metrics.set_meter_provider(...)`.
- The local OTLP/gRPC exporter endpoint used an `http://` collector URL without explicitly setting `insecure=True`. Added `insecure=True` for both span and metric exporters to match OpenTelemetry Python OTLP/gRPC examples for local/plaintext collectors.
- The raw storage span tried to calculate duration from `store_span.end_time - store_span.start_time` while the span was still active. `end_time` is set when the span ends, so this would not provide a valid in-block duration. Replaced it with `time.perf_counter()` around the storage call and recorded milliseconds.

## Review Notes
- The remaining upload, transcoding, CDN distribution, span attribute, event, histogram, and counter examples are syntactically valid Python snippets and use current OpenTelemetry Python APIs.
- In a production asynchronous queue, trace context should be injected into the queued job and extracted by the worker so upload and transcode spans appear in the same trace. The post's code focuses on stage-level instrumentation and does not show queue propagation.
- Attribute names such as `user.id` and playback URLs can contain sensitive data. Production systems should apply their organization's telemetry data handling and privacy policies before emitting them.
