# Validation Summary: How to Implement Distributed Tracing with Jaeger in Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Jaeger v2
- OpenTelemetry Collector
- OpenTelemetry Operator
- Elasticsearch / Elastic Cloud on Kubernetes
- Go OpenTelemetry SDK
- Python OpenTelemetry SDK and Flask instrumentation
- Java / Spring Boot OpenTelemetry instrumentation
- Node.js OpenTelemetry SDK
- PrometheusRule alerting

## Sources Consulted
- Jaeger download and version guidance: https://www.jaegertracing.io/download/
- Jaeger Kubernetes deployment documentation: https://www.jaegertracing.io/docs/2.19/deployment/kubernetes/
- Jaeger v2 configuration documentation: https://www.jaegertracing.io/docs/2.19/deployment/configuration/
- Jaeger Elasticsearch storage documentation: https://www.jaegertracing.io/docs/2.19/storage/elasticsearch/
- Jaeger Operator repository guidance for Jaeger v2 via OpenTelemetry Operator: https://github.com/jaegertracing/jaeger-operator
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Jaeger exporter migration note: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry OTLP exporter SDK configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry JavaScript SDK 2.x migration guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry semantic conventions for deployment attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- Jaeger Service Performance Monitoring documentation: https://www.jaegertracing.io/docs/1.76/deployment/spm/

## Issues Found
- The post used Jaeger Operator v1 and Jaeger v1 CRDs even though Jaeger v1 reached end-of-life on December 31, 2025. Replaced the deployment examples with Jaeger v2 managed by the OpenTelemetry Operator.
- The OpenTelemetry Collector example used the removed native `jaeger` exporter and deprecated `logging` exporter. Replaced them with an OTLP exporter targeting Jaeger and the current `debug` exporter.
- The production Elasticsearch example used Jaeger v1 storage fields. Replaced it with Jaeger v2 `jaeger_storage` configuration and Kubernetes Secret references.
- The Node.js example used `new Resource(...)`, which is no longer exported in OpenTelemetry JS SDK 2.x, and an older semantic-conventions namespace object. Replaced it with `resourceFromAttributes(...)`, stable resource attribute keys, and an OTLP gRPC URL that uses an HTTP scheme.
- The Kubernetes workload example included obsolete Jaeger sidecar/native SDK environment variables. Removed those and added `OTEL_EXPORTER_OTLP_PROTOCOL=grpc`.
- The sampling example used old Jaeger CR sampling fields. Replaced it with OpenTelemetry Collector tail sampling and SDK-level sampling environment variables.
- The Jaeger UI port-forward command referenced the old `jaeger-query` service. Updated it to the service created by the OpenTelemetry Operator for the Jaeger v2 collector.
- The alerting PromQL referenced non-standard `jaeger_spans_total` and `jaeger_span_duration_seconds_bucket` metrics. Updated the rules to use Jaeger SPM/span-metrics-style `calls_total` and `duration_seconds_bucket` metrics, with a note about the prerequisite.
- The Go best-practices snippet assigned the two-value `tracer.Start` result to a single variable. Corrected it to receive both return values.
- The examples used deprecated `deployment.environment` semantic convention attributes. Updated them to `deployment.environment.name`.

## Review Notes
All YAML snippets in the post were parsed successfully after the edits. The Elasticsearch and production Jaeger examples remain illustrative and still require cluster-specific storage classes, TLS secrets, ingress controller setup, and Elasticsearch readiness before applying in a real environment.
