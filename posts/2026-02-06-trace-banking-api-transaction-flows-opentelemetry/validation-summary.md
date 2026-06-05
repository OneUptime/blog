# Validation Summary: How to Trace Banking API Transaction Flows with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK
- OpenTelemetry OTLP gRPC exporter
- Distributed tracing
- Trace context propagation
- Python
- Banking API transaction flows

## Sources Consulted
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python API documentation for spans, status, tracer provider, and `start_as_current_span`: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python instrumentation documentation for default propagation formats: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry sensitive data guidance: https://opentelemetry.io/docs/security/handling-sensitive-data/

## Issues Found
- The OTLP gRPC exporter example used `endpoint="otel-collector:4317"` without explicitly configuring plaintext transport. Updated it to `endpoint="http://otel-collector:4317", insecure=True`, matching OpenTelemetry Python OTLP gRPC exporter examples for a local/plaintext collector endpoint.
- The tracing examples recorded account IDs and exact financial values as span attributes. OpenTelemetry's sensitive data guidance calls out PII and financial information as sensitive telemetry risks. Updated the examples to use hashed account identifiers and coarse-grained amount buckets, and removed exact balances, holds totals, and post-transfer balances from span attributes.
- The balance example fetched an available balance and then subtracted active holds, which could double-count holds if available balance already excludes them. Updated the example to fetch the current balance before applying active holds.
- The transfer execution text described debit and credit as running within a database transaction, but the code did not show a transaction boundary and attempted a reversal even if the debit failed. Updated the code to wrap debit, credit, and hold release in `ledger.transaction()` and clarified that the database transaction rolls back debit and credit changes on failure.
- The transfer execution was described as a "two-phase operation," which could be confused with two-phase commit. Updated the wording to "multi-step operation."

## Review Notes
The post remains an illustrative tutorial rather than a complete runnable application. Repository objects such as `account_repo`, `ledger`, `hold_repo`, `message_queue`, `hash_for_trace`, and `amount_bucket` are assumed to be application-provided helpers.
