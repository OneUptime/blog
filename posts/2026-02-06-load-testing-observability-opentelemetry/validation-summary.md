# Validation Summary: How to Use OpenTelemetry for Load Testing Observability

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python API
- OpenTelemetry baggage and context propagation
- OpenTelemetry metrics
- k6
- Python
- JavaScript
- Distributed tracing
- Load testing observability

## Sources Consulted
- OpenTelemetry baggage concept documentation: https://opentelemetry.io/docs/concepts/signals/baggage/
- OpenTelemetry baggage API specification: https://opentelemetry.io/docs/specs/otel/baggage/api/
- OpenTelemetry context specification: https://opentelemetry.io/docs/specs/otel/context/
- OpenTelemetry Python baggage API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry Python context API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/context.html
- OpenTelemetry Python instrumentation and metrics documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- Grafana k6 OpenTelemetry output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/opentelemetry/
- Grafana k6 custom metrics documentation: https://grafana.com/docs/k6/latest/using-k6/metrics/create-custom-metrics/
- Grafana k6 Trend metric documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/trend/
- Grafana k6 thresholds documentation: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Grafana k6 HTTP post API documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-http/post/

## Issues Found
- The baggage middleware called `set_baggage()` but did not attach the returned OpenTelemetry context, so downstream calls would not reliably see the baggage in the current context. Updated the middleware to attach the context and detach it in a `finally` block.
- The middleware used the Starlette/FastAPI-style `call_next` pattern but was written as a synchronous function. Updated it to `async def` and `await call_next(request)` so baggage remains attached while the request is processed.
- The post said every span in the trace gets tagged automatically by baggage. OpenTelemetry documents baggage as separate from span attributes, so the wording now explains that services must copy baggage to span attributes or use a baggage span processor for trace-wide filtering.
- The k6 custom latency metric used `new Trend('order_creation_latency')` without marking the values as time values. Updated it to `new Trend('order_creation_latency', true)`.
- The k6 section described exporting metrics to OpenTelemetry but did not show the required OpenTelemetry output invocation. Added a minimal `k6 run -o opentelemetry` example with the documented insecure local gRPC exporter environment variable.
- The bottleneck metrics example used `gc.get_stats()` without importing `gc` and referenced `engine` without defining it. Added the missing import and wrapped the metric registration in `register_load_test_metrics(engine)`.
- The bottleneck metrics example used informal units such as `percent`, `threads`, and `collections`. Updated them to UCUM-compatible units (`%`, `{thread}`, and `{collection}`) consistent with OpenTelemetry's unit guidance.

## Review Notes
- The trace analysis example uses a placeholder `trace_client.query_traces()` interface because OpenTelemetry itself does not define a vendor-neutral trace query API. This is acceptable as illustrative backend-specific pseudocode, but a production article could make that caveat explicit.
- The event loop lag histogram is created but the post does not show the application-specific code that records lag measurements. The snippet is structurally valid, but a future improvement could include a concrete asyncio recording loop.
