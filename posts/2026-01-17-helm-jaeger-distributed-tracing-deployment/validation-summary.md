# Validation Summary: Deploying Jaeger Distributed Tracing with Helm

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Jaeger
- Jaeger Helm chart
- Kubernetes
- Helm
- Elasticsearch
- Cassandra
- Kafka
- OpenTelemetry Collector
- OpenTelemetry Operator
- OpenTelemetry SDKs for Python, Go, and Node.js
- Prometheus Operator ServiceMonitor and PrometheusRule

## Sources Consulted
- Jaeger v2.19 Deployment documentation: https://www.jaegertracing.io/docs/2.19/deployment/
- Jaeger v2.19 Architecture documentation: https://www.jaegertracing.io/docs/2.19/architecture/
- Jaeger v2.19 Kubernetes deployment documentation: https://www.jaegertracing.io/docs/2.19/deployment/kubernetes/
- Jaeger v1.76 archived Operator documentation: https://www.jaegertracing.io/docs/1.76/deployment/operator/
- Jaeger SDK migration guidance: https://www.jaegertracing.io/sdk-migration/
- Jaeger Helm chart README and values.yaml: https://github.com/jaegertracing/helm-charts/tree/main/charts/jaeger
- Jaeger v2 sample configuration files: https://github.com/jaegertracing/jaeger/tree/main/cmd/jaeger
- OpenTelemetry Collector Jaeger exporter migration note: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry Operator Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Go exporters documentation: https://opentelemetry.io/docs/languages/go/exporters/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/

## Issues Found
- The Helm values used legacy Jaeger v1 chart keys such as `allInOne`, `collector`, `query`, `agent`, and `provisionDataStore`. Updated the examples to the current Jaeger v2 chart model using the unified `jaeger` deployment and `userconfig`.
- The post referenced Jaeger v1.52 images and components. Updated image usage to the supported Jaeger v2 `jaegertracing/jaeger` image and tag `2.19.0`.
- The architecture diagram centered on the retired Jaeger agent and separate v1 binaries. Updated it to show Jaeger v2, OTLP ingestion, OpenTelemetry Collector, Kafka buffering, and storage backends.
- The Elasticsearch and Cassandra examples used legacy chart storage fields for runtime configuration. Updated them to use Jaeger v2 `jaeger_storage` configuration while keeping chart storage settings only where the current chart uses them for maintenance jobs.
- The Kafka example used v1 `SPAN_STORAGE_TYPE=kafka` and `jaeger-ingester` patterns. Replaced it with OpenTelemetry Collector-style Kafka receiver/exporter pipelines used by Jaeger v2.
- The Jaeger Operator section used the archived Jaeger Operator and `jaegertracing.io/v1` CR. Updated it to the OpenTelemetry Operator, which current Jaeger documentation recommends for Jaeger v2 Kubernetes management.
- The OpenTelemetry Collector example used the removed `jaeger` exporter. Replaced it with the OTLP exporter targeting Jaeger's OTLP gRPC endpoint.
- Python, Go, and Node.js instrumentation examples used deprecated Jaeger exporters or retired Jaeger/OpenTracing clients. Replaced them with OTLP exporters and OpenTelemetry SDK APIs.
- The rate-limiting sampling example was not a complete Kubernetes ConfigMap. Added the missing `apiVersion`, `kind`, `metadata`, and `data` structure.
- The ServiceMonitor used a non-existent `admin-http` port for the current Jaeger chart. Updated it to the chart's `internal-metrics` service port.
- Troubleshooting commands referenced legacy `jaeger-collector`, `jaeger-query`, and `jaeger-agent` resources and ports. Updated them to the current unified deployment, service, health endpoint, and metrics endpoint.

## Review Notes
- Helm is not installed in the local environment, so I could not run `helm template` locally. I verified chart values, generated resource names, and service port names against the official chart templates and values in the Jaeger Helm chart repository.
- The current Jaeger Helm chart README marks the chart experimental and notes that breaking changes can occur in minor versions. Future reviews should re-check chart values before publication.
- The Elasticsearch chart snippet is illustrative and depends on the Elasticsearch Helm chart/version in use; Elasticsearch security and TLS settings often require additional certificate and secret configuration in real clusters.
