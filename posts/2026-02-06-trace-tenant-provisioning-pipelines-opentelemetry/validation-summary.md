# Validation Summary: How to Trace Tenant Provisioning and Environment Setup Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OpenTelemetry trace links and span context
- OpenTelemetry semantic conventions for database, cloud, and AWS S3 attributes
- Python async provisioning workflow examples
- SaaS tenant provisioning pipeline observability

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry metric semantic convention units guidance: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry PostgreSQL semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/postgresql/
- OpenTelemetry cloud attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/cloud/
- OpenTelemetry AWS S3 client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/object-stores/s3/

## Issues Found
1. **Outdated database semantic attributes**: The database span used `db.system`, `db.operation`, and `db.schema`. Current OpenTelemetry database conventions use `db.system.name`, `db.operation.name`, and `db.namespace`. Updated the example accordingly.
2. **Non-standard S3/cloud attributes**: The storage span used `cloud.service: "s3"` and a generic `storage.bucket` attribute. Current OpenTelemetry conventions list `cloud.provider`, `cloud.region`, and AWS S3-specific `aws.s3.bucket`. Updated the span attributes and kept the tenant-specific bucket value under a custom `tenant.storage.bucket` key.
3. **Non-UCUM metric duration units**: The duration histograms used `unit="seconds"`. OpenTelemetry metric guidance recommends UCUM units, where seconds are represented as `s`. Updated both duration histogram units to `s`.

## Review Notes
- The Python tracing examples use current OpenTelemetry APIs such as `trace.get_tracer()`, `start_as_current_span()`, `SpanContext`, `Link`, `set_status()`, and `record_exception()`.
- The metrics example correctly creates histograms for durations and a counter for failures. It defines instruments only; production code would also need to call `record()` and `add()` at the relevant provisioning points.
- The post uses custom tenant, DNS, SSL, and provisioning attributes. That is acceptable because OpenTelemetry allows custom attributes when no standard semantic convention exists, but teams should keep custom names consistent and avoid high-cardinality or sensitive values where possible.
