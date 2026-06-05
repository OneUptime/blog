# Validation Summary: How to Implement RAG Pipeline Tracing with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OTLP trace exporting
- Python RAG pipeline instrumentation
- Vector search tracing
- LLM inference tracing
- Span attributes and events

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry GenAI semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/
- OneUptime Host OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The setup snippet used the OTLP gRPC trace exporter with `https://oneuptime.com/otlp`. OpenTelemetry documents separate gRPC and HTTP/protobuf exporters, and OneUptime's documented ingestion examples use OTLP HTTP with token authentication. Changed the snippet to install `opentelemetry-exporter-otlp-proto-http`, import the HTTP trace exporter, send traces to `https://oneuptime.com/otlp/v1/traces`, and include `x-oneuptime-token` when `ONEUPTIME_TOKEN` is set.
- The full pipeline snippet imported `numpy` but did not use it. Removed the unused import so the example only lists required dependencies.

## Review Notes
The RAG-specific span names and `rag.*` attributes are custom application attributes, which is valid OpenTelemetry usage. OpenTelemetry GenAI semantic conventions are still marked Development; a future revision could optionally map some custom attributes to `gen_ai.*` conventions, but the current custom attributes are technically acceptable.
