# Validation Summary: How to Correlate Customer Support Tickets with Specific OpenTelemetry Traces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing APIs for JavaScript and Python
- OpenTelemetry baggage and context propagation
- Flask request hooks
- Grafana Tempo TraceQL and Tempo HTTP Search API
- Jaeger query API
- curl, jq, and GNU date

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python baggage API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry baggage concept documentation: https://opentelemetry.io/docs/concepts/signals/baggage/
- OpenTelemetry trace exception specification: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry semantic conventions registry for end user attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/enduser/
- OpenTelemetry semantic conventions registry for HTTP attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Grafana Tempo HTTP API documentation: https://grafana.com/docs/tempo/latest/api_docs/
- Jaeger API documentation: https://www.jaegertracing.io/docs/2.0/apis/
- Jaeger query parser source for `/api/traces` parameters: https://github.com/jaegertracing/jaeger/blob/main/cmd/jaeger/internal/extension/jaegerquery/internal/query_parser.go

## Issues Found
- The post originally said child spans inherit the user context after setting user attributes at the request entry point. Span attributes are attached to the span where they are set; child spans remain linked by trace context but do not inherit those attributes. I updated the wording to say the entry span carries the user attributes and child spans remain linked in the same trace.
- The Jaeger API example used `tags=user.id%3Dusr_k8x9m2`, which is not the documented Jaeger `tags` format. Jaeger accepts `tags` as a JSON map or repeatable `tag=key:value` parameters. I changed it to the URL-encoded JSON map form.
- The Tempo self-service lookup example passed ISO strings directly as `/api/search` `start` and `end` parameters. Tempo Search documents those parameters as Unix epoch seconds. I added ISO-to-epoch conversion before making the request.
- The Tempo lookup example attempted to compute `has_error` from a top-level `spans` array in the search response. Tempo search returns trace summaries, not full trace span lists. I changed the example to run a second TraceQL search with `status = error` and mark matching trace IDs as errors.

## Review Notes
- The examples use `user.id` as a custom attribute. OpenTelemetry's semantic convention registry currently has `enduser.id` as a development-status end-user attribute, so teams may prefer that key if they want to align with the published convention.
- Baggage propagation is technically correct, but the privacy section should remain strict because baggage may be propagated to downstream or third-party services.
