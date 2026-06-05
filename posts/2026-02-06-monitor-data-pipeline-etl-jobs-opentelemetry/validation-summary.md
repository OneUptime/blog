# Validation Summary: How to Monitor Data Pipeline ETL Jobs with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry tracing
- OpenTelemetry metrics
- OTLP gRPC exporters
- Python async ETL pipeline instrumentation
- Batch ETL checkpointing and dead letter queues

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python SDK trace documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python SDK metrics documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry resource concepts documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry deployment semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry common attributes specification: https://opentelemetry.io/docs/specs/otel/common/

## Issues Found
- The setup snippet used the deprecated `deployment.environment` resource attribute. Updated it to `deployment.environment.name`, which is the current OpenTelemetry semantic convention for deployment environment names.
- The text said spans and metrics might not export because the batch processor might not flush. Metrics in the snippet use `PeriodicExportingMetricReader`, not a span batch processor, so the explanation now refers to telemetry providers flushing.
- The extract and orchestrator snippets manually called `span.record_exception(e)` and then re-raised the exception from inside `start_as_current_span`. OpenTelemetry Python records escaped exceptions by default for context-managed spans, so those calls could create duplicate exception events. Removed the duplicate manual calls while preserving the failure attributes.
- The load-stage snippet used `asyncio.sleep()` without importing `asyncio`. Added the import to make the snippet syntactically complete.
- The retry loop slept after the final retry attempt even though no retry would follow. Changed the example to apply exponential backoff only when another retry remains.
- The orchestrator set `pipeline_config.scheduled_time` directly as a span attribute. OpenTelemetry attributes must be primitive values or homogeneous arrays, so the example now converts the scheduled time to a string before setting the attribute.

## Review Notes
The examples remain illustrative and depend on application-specific objects such as `source_config`, `schema_validator`, `warehouse_client`, `RetryableError`, `NonRetryableError`, `JobContext`, and checkpoint/dead-letter queue implementations. The OpenTelemetry API usage is current, but a production version should also consider cardinality controls for custom metric attributes such as source names and failure reasons.
