# Validation Summary: How to Instrument Product Search Ranking Algorithms with OpenTelemetry to

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- Python
- E-commerce product search ranking
- Search quality metrics

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry overview specification for spans, span context, and links: https://opentelemetry.io/docs/reference/specification/overview/
- OpenTelemetry handling sensitive data guidance: https://opentelemetry.io/docs/security/handling-sensitive-data/
- Python `time` module documentation for `perf_counter`: https://docs.python.org/3/library/time.html#time.perf_counter

## Issues Found
- The search span recorded `search.raw_query` and `search.user_id` directly. OpenTelemetry guidance warns that telemetry may contain PII and recommends data minimization. Changed the query attribute to `search.query_length` and replaced the direct user ID with a short SHA-256-derived hash.
- The zero-result metric used the raw query as a metric attribute. This can expose sensitive query text and create very high-cardinality metric series. Removed `search.raw_query` from the counter attributes.
- The latency example used `time.time()` for elapsed duration. Since wall-clock time can move backwards or forwards, changed it to `time.perf_counter()`, which Python documents as a monotonic performance counter.
- The ranking span accessed `ranked[0].score` before checking whether any results existed. Changed `search.top_score` to use `0` when the ranked result list is empty, matching the existing guarded `search.score_spread` behavior.
- The downstream click/conversion section said events were linked back to the original span, but the code only stored the trace ID as an attribute and did not create an OpenTelemetry span link. Updated the wording and comment to say the events are correlated back to the original search trace.

## Review Notes
The examples are illustrative and still depend on application-specific objects such as `query_parser`, `search_index`, `feature_extractor`, `ranking_model`, and `post_processor`. The OpenTelemetry API usage shown for tracers, meters, histograms, counters, span attributes, and metric recording is current and syntactically valid.
