# Validation Summary: How to Configure Distributed Tracing in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- ingress-nginx
- OpenTelemetry
- OpenTelemetry Collector
- OpenTelemetry Operator
- Java
- Python
- Node.js
- Grafana
- Grafana Tempo
- Prometheus Operator

## Sources Consulted
- OpenTelemetry Java instrumentation docs: https://opentelemetry.io/docs/languages/java/instrumentation/
- OpenTelemetry Java SDK/resource docs: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Resources concept docs: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/service/
- OpenTelemetry Python manual instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Flask instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry SQLAlchemy instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry JavaScript getting started docs: https://github.com/open-telemetry/opentelemetry-js
- OpenTelemetry JavaScript OTLP gRPC exporter docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-grpc.html
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- ingress-nginx OpenTelemetry docs: https://kubernetes.github.io/ingress-nginx/user-guide/third-party-addons/opentelemetry/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector tail sampling processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Grafana Service Graph docs: https://grafana.com/docs/grafana/latest/datasources/tempo/service-graph/
- Grafana Tempo service graph view docs: https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/service-graph-view/
- Grafana Tempo span metrics docs: https://grafana.com/docs/tempo/latest/metrics-from-traces/span-metrics/span-metrics-metrics-generator/

## Issues Found
- The Java example used the tracer name as if it were the service identity. I added a `service.name` resource on the `SdkTracerProvider` and changed the tracer name to an instrumentation scope name, because backends and service graphs use resource attributes for service identity.
- The Java auto-instrumentation comment showed `-javaagent` without placing it in the Java command. I clarified that it should be added to the Java command line.
- The Python example omitted required imports and app setup for `Flask`, `requests`, and SQLAlchemy. I added the missing imports plus minimal `app` and `engine` setup so the snippet is internally consistent.
- The Python example used programmatic instrumentation calls that do not match the current Flask and SQLAlchemy docs. I changed them to `FlaskInstrumentor().instrument_app(app)` and `SQLAlchemyInstrumentor().instrument(engine=engine)`.
- The Python example did not set `service.name`, which would result in `unknown_service` by default. I added a `Resource` to the `TracerProvider`.
- The Python OTLP gRPC exporter example omitted `insecure=True` while using an `http://` collector endpoint. I added the flag to match the documented gRPC exporter configuration.
- The Python status-setting code used `trace.Status` and `trace.StatusCode` inline. I switched to explicit `Status` and `StatusCode` imports to match the documented API shape more clearly.
- The Node.js example used older resource construction style and the deprecated `deployment.environment` attribute. I updated it to `resourceFromAttributes(...)` and `deployment.environment.name`.
- The ingress example manually rewrote `X-Trace-Id` and partial B3 headers, which is not a correct substitute for standard OpenTelemetry context propagation. I replaced it with ingress-nginx’s supported OpenTelemetry annotations so standard trace context is trusted and propagated.
- The tail-sampling section omitted an important operational constraint. I added a note that all spans for a trace must reach the same collector instance for tail sampling to work correctly.
- The Grafana section referred to “Service Map” in Tempo Explore and used the outdated `traces_spanmetrics_duration_milliseconds_bucket` metric. I updated it to the current Service Graph terminology and current span-metrics histogram name, converting seconds to milliseconds in the query.
- The Prometheus alert for dropped spans used `otelcol_processor_dropped_spans`, which is not a current collector internal metric. I replaced it with supported exporter failure metrics from the collector’s internal telemetry docs.
- The latency alert used the outdated span-metrics histogram name and old units. I updated it to the current seconds-based metric and converted the expression to milliseconds so the existing threshold and annotation remain correct.

## Review Notes
- The post is technically valid after the fixes above.
- Tail-based sampling still requires careful deployment design in production. If the Collector is horizontally scaled, traces need sticky routing or a topology that guarantees all spans for a trace land on the same collector instance.
- Grafana service graphs and the span-metrics queries shown here require Tempo metrics generation or Grafana Alloy plus a Prometheus-compatible metrics store linked to the Tempo data source.
