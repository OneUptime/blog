# Validation Summary: How to Troubleshoot Celery Worker Spans Being Orphaned from Parent Traces Due

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python
- OpenTelemetry Celery instrumentation
- Celery
- Django
- Python distributed tracing
- OTLP exporters

## Sources Consulted
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python agent configuration: https://opentelemetry.io/docs/zero-code/python/configuration/
- OpenTelemetry Celery instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/celery/celery.html
- OpenTelemetry Celery instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/celery.html
- Celery signals documentation: https://docs.celeryq.dev/en/latest/userguide/signals.html
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The install command only installed `opentelemetry-instrumentation-celery`, but the examples also use OpenTelemetry auto-instrumentation, OTLP exporters, and Django instrumentation. Updated the command to include `opentelemetry-distro`, `opentelemetry-exporter-otlp`, and `opentelemetry-instrumentation-django`.
- The manual consumer-side propagation example expected a `headers` argument on `task_prerun`, but Celery documents `task_prerun` as providing `task_id`, `task`, `args`, and `kwargs`, not message headers. Updated the example to extract from `task.request` with a text-map getter, matching the behavior used by OpenTelemetry's Celery instrumentation.
- The manual propagation example attached extracted context without detaching it. Added a `task_postrun` handler that detaches the stored token after the task finishes.
- The worker auto-instrumentation command used the OTLP HTTP port `4318` without specifying the HTTP/protobuf protocol. Added `--exporter_otlp_protocol http/protobuf`.
- The expected trace output used span names that did not match the OpenTelemetry Celery instrumentation source. Updated the illustrative span names to `apply_async/<task name>` and `run/<task name>`.
- The retry and canvas workflow pitfalls made overly specific claims about retry spans and group propagation. Reworded them to recommend verifying trace headers and retry metadata for retried and canvas-published task messages.

## Review Notes
The post is accurate as a practical troubleshooting guide after the fixes. The examples are version-agnostic, but Celery and OpenTelemetry instrumentation behavior can still vary by installed package versions and task canvas patterns, so production setups should verify traces in their actual broker and worker pool configuration.
