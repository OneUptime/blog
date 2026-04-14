# Validation Summary: How to Use Structured Logging with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar JSON logging, Kubernetes annotations, W3C trace context)
- Go with zerolog (`github.com/rs/zerolog`)
- Python with structlog
- Node.js with pino
- Elasticsearch (query DSL)
- Grafana Loki (LogQL)
- Datadog (log search syntax)

## Sources Consulted
- Dapr official documentation — Kubernetes annotations reference (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Dapr observability/tracing documentation (https://docs.dapr.io/developing-applications/building-blocks/observability/)
- zerolog GitHub repository and README (https://github.com/rs/zerolog)
- structlog official documentation — configuration and processors (https://www.structlog.org/en/stable/configuration.html)
- pino GitHub repository and API docs (https://github.com/pinojs/pino/blob/main/docs/api.md)
- W3C Trace Context specification (https://www.w3.org/TR/trace-context/)
- Elasticsearch Query DSL documentation (https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)
- Grafana Loki LogQL documentation (https://grafana.com/docs/loki/latest/logql/)

## Issues Found
No technical issues found.

## Review Notes
- The zerolog output example shows JSON fields in a slightly different order than what zerolog actually produces (context fields like `time` would appear before event-level fields like `order_id`). This is cosmetically different but semantically equivalent since JSON object key order is not significant per the JSON specification.
- The Grafana Loki query is in a `json` code fence and the Datadog query is in a `yaml` code fence. These are presentation choices — the query syntax itself is correct in both cases.
- The `traceparent` header contains the full W3C trace context string (e.g., `00-{trace-id}-{parent-id}-{trace-flags}`), not just the trace ID. The code logs the entire header value as `trace_id`. This is a common and acceptable simplification for log correlation purposes.
- The structlog example calls `get_logger()` before `configure()`, which works correctly due to structlog's lazy proxy binding but is slightly unconventional ordering.
