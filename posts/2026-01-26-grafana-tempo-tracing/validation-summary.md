# Validation Summary: How to Use Grafana Tempo for Tracing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Tempo
- Grafana data source provisioning
- TraceQL
- OpenTelemetry Python SDK and Flask instrumentation
- OpenTelemetry JavaScript/Node.js SDK
- OpenTelemetry Collector tail sampling
- Docker Compose
- Prometheus remote write for Tempo metrics-generator output

## Sources Consulted
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo metrics-generator documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-generator/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Grafana Tempo data source documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry JavaScript Node.js getting started documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript resources API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript NodeSDK API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry deployment environment semantic convention: https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/
- Prometheus feature flags documentation: https://prometheus.io/docs/prometheus/latest/feature_flags/

## Issues Found
- The local Tempo configuration included a metrics-generator `remote_write` target pointing at `http://prometheus:9090`, but the Docker Compose stack did not define Prometheus. Removed the metrics-generator block from the minimal local setup so the stack remains coherent.
- The Grafana Tempo datasource provisioning referenced Loki and Prometheus data source UIDs that were not provisioned in the Docker Compose example. Removed those correlation settings from the minimal datasource configuration.
- The Python example said the `/health` endpoint was not traced, but Flask auto-instrumentation traces it unless excluded. Added `excluded_urls="/health"` to `FlaskInstrumentor().instrument_app(...)`.
- The Python resource used the older `deployment.environment` attribute. Updated it to the current `deployment.environment.name` semantic convention.
- The Node.js example used the older `new Resource(...)` pattern and `SemanticResourceAttributes`. Updated it to `resourceFromAttributes(...)` and current semantic convention constants.
- The Node.js custom span example created `create_user` with `startSpan`, so the later database span would not be a child of that custom span. Changed it to `startActiveSpan` so nested spans inherit the intended active context.
- TraceQL examples used shorthand intrinsic names such as `status`, `name`, and `duration`, and described trace ID prefix search. Updated examples to current scoped intrinsics such as `span:status`, `span:name`, `span:duration`, `trace:duration`, and exact `trace:id` matching.
- The service graph metrics-generator snippet configured processor settings but did not enable processors. Added the required `overrides.defaults.metrics_generator.processors: [service-graphs, span-metrics]` setting.
- The span metrics snippet listed intrinsic values under `dimensions`. Replaced those with regular HTTP span attributes and left intrinsic dimensions to the default processor behavior.
- The troubleshooting section suggested unsupported `query_frontend.search.query_shards` and `query_frontend.cache.max_size_mb` fields. Replaced them with supported `most_recent_shards`, `trace_by_id.query_shards`, and `trace_by_id.concurrent_shards`.
- The summary and introductory Tempo storage wording implied Tempo only operates with object storage. Adjusted this to say Tempo can use object storage without a separate trace index, which is accurate alongside the local filesystem backend used in the tutorial.

## Review Notes
- The post is technically relevant and remains a useful tracing tutorial after correction.
- The local Docker Compose example intentionally provisions only Tempo and Grafana. Service graphs still require a Prometheus-compatible remote write receiver and a Grafana metrics datasource when readers apply the later service graph section.
- The OpenTelemetry JavaScript packages evolve quickly; the updated Node.js resource setup follows the current OpenTelemetry JS resources documentation.
