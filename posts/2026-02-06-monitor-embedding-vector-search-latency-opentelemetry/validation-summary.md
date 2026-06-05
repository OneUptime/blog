# Validation Summary: How to Monitor Embedding Generation and Vector Search Latency with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python tracing and metrics
- OTLP trace and metric exporters
- OpenAI Embeddings API
- OpenAI Chat Completions API
- ChromaDB vector search
- Prometheus-style metric queries
- Retrieval-Augmented Generation (RAG)

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry exception semantic conventions: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenAI Embeddings API reference: https://developers.openai.com/api/reference/resources/embeddings/methods/create
- OpenAI Chat Completions API reference: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- ChromaDB query documentation: https://docs.trychroma.com/docs/querying-collections/query-and-get
- ChromaDB Python collection reference: https://docs.trychroma.com/reference/python/collection

## Issues Found
- The embedding error handling used ad hoc `error` and `error.message` span attributes. Updated it to use `span.record_exception(e)` and `span.set_status(Status(StatusCode.ERROR, str(e)))`, matching OpenTelemetry guidance for recording exceptions and error status.
- The batch embedding snippet was labeled as a separate file but omitted required imports and did not increment the request counter for batch calls. Added `time` and shared instrumentation imports, and recorded batch request counts.
- The vector search alert and dashboard referenced request/error metrics that the code did not create. Added a `rag.vector_search.requests` counter and failure-path recording.
- The post referred to ChromaDB distances as similarity scores and used `best_score` even though Chroma returns `distances`, where lower values are better. Renamed the span attributes and metric to `best_distance` / `worst_distance`, updated the dashboard, optimization note, and alert text accordingly.
- The dashboard referenced `llm.completion.duration`, but the sample code only created a span and did not record an LLM duration metric. Added `rag.llm.duration` and `rag.llm.requests` metrics with success/error status attributes.
- The Prometheus alert examples used metric names and aggregations that would not match default OpenTelemetry-to-Prometheus translation for histograms and counters. Updated the examples to use the translated `_milliseconds_bucket` and `_total` names, a rate-based `histogram_quantile`, and histogram `_sum` / `_count` for average vector distance.
- The complete pipeline example used the older `gpt-4` model string. Updated it to `gpt-4o`, which is aligned with current OpenAI Chat Completions examples.

## Review Notes
The code examples are illustrative and assume the required packages are installed and that the OTLP endpoint is configured through standard OpenTelemetry exporter environment variables or defaults. The exact exported Prometheus metric names can vary if a backend or exporter uses a non-default translation strategy.
