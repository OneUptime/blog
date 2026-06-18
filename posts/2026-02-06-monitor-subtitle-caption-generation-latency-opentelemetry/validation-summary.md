# Validation Summary: How to Monitor Subtitle and Caption Generation Pipeline Latency

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry metrics
- Python manual instrumentation
- Subtitle and caption generation pipelines
- Speech-to-text transcription
- Caption translation, validation, and CDN delivery

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry semantic convention naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry metric semantic convention guidance: https://opentelemetry.io/docs/specs/semconv/general/metrics/

## Issues Found
- The pipeline used `target_languages` as a stringified span attribute. OpenTelemetry attributes support scalar values and homogeneous sequences, so this was changed to `caption.target_languages` with the language list preserved as a sequence.
- Metric attributes used `video_id` while span attributes used `video.id`. This was changed to `video.id` for consistency with OpenTelemetry naming guidance and with the existing span attribute.
- The translation latency dashboard claims tracking per language pair, but the metric only recorded the target language. The translation span and metric now record both `translation.source_language` and `translation.target_language`.
- The exception handler manually called `span.record_exception(e)` and then re-raised inside a `start_as_current_span` context. Because OpenTelemetry Python context managers record uncaught exceptions by default, this could create duplicate exception events on the pipeline span. The manual call was removed while preserving the failure counter and re-raise.

## Review Notes
The OpenTelemetry Python APIs used in the examples (`trace.get_tracer`, `metrics.get_meter`, `meter.create_histogram`, `meter.create_counter`, `Histogram.record`, `Counter.add`, `Span.set_attribute`, and `start_as_current_span`) match current official documentation. The local environment did not have the `opentelemetry` package installed, so runtime import testing was not possible; both Python code blocks were parsed successfully with `python3` for syntax validation.
