# Validation Summary: How to Trace Search and Recommendation Engines with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK
- OTLP gRPC exporters
- Distributed tracing
- OpenTelemetry metrics
- Search engines
- Recommendation engines
- Elasticsearch and Solr concepts
- Machine learning re-ranking

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/

## Issues Found
- The resource example used `deployment.environment`, but the current OpenTelemetry semantic convention uses `deployment.environment.name`. Updated the resource attribute so the example matches the current convention.
- The `search.query.latency` histogram was defined but never recorded. Added `time.perf_counter()` timing around the search handler and recorded elapsed milliseconds.
- The `search.ml.inference_latency` histogram was defined but never recorded. Added timing around `model.predict(features)` and recorded elapsed milliseconds.

## Review Notes
The remaining code is illustrative and depends on application-specific objects such as `tokenizer`, `search_index`, `model`, and `ranking_model`. The OpenTelemetry Python APIs used for spans, attributes, events, counters, histograms, SDK providers, and OTLP gRPC exporters are current.
