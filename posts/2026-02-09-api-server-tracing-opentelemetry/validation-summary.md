# Validation Summary: How to Use Kubernetes API Server Tracing with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes kube-apiserver tracing
- Kubernetes feature gates and component configuration
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- OpenTelemetry Collector tail sampling and spanmetrics connector
- Jaeger
- kubectl
- Go client-go

## Sources Consulted
- Kubernetes: Traces For Kubernetes System Components: https://kubernetes.io/docs/concepts/cluster-administration/system-traces/
- Kubernetes: API server config API (v1): https://kubernetes.io/docs/reference/config-api/apiserver-config.v1/
- Kubernetes: API server config API (v1beta1): https://kubernetes.io/docs/reference/config-api/apiserver-config.v1beta1/
- Kubernetes: Feature Gates: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- OpenTelemetry Collector exporters: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector connectors: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry: Migrating away from the Jaeger exporter in the Collector: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- Jaeger APIs, OTLP support: https://www.jaegertracing.io/docs/1.76/architecture/apis/

## Issues Found
- The post stated that API server tracing requires feature gates. Updated the wording to reflect Kubernetes version behavior: alpha and feature-gated in 1.22-1.26, enabled by default in 1.27+, and GA in 1.34+.
- The tracing configuration used `apiserver.config.k8s.io/v1beta1`. Updated examples to the current `apiserver.config.k8s.io/v1` API.
- The OpenTelemetry Collector examples used the removed/deprecated native Jaeger exporter and sent to Jaeger's legacy gRPC port `14250`. Updated the examples to use the OTLP exporter (`otlp/jaeger`) and Jaeger's OTLP/gRPC port `4317`.
- The collector example used the old `logging` exporter. Updated it to the current `debug` exporter syntax.
- The collector image was the core collector, but examples later require contrib-only components such as `tail_sampling` and `spanmetrics`. Updated the image to `otel/opentelemetry-collector-contrib:latest`.
- The Jaeger Kubernetes example exposed only port `14250`. Updated the container and service to expose `4317` for OTLP/gRPC ingestion.
- The application correlation section incorrectly claimed the API server continues incoming application trace context. Updated it to state that kube-apiserver propagates W3C Trace Context on outgoing requests but does not use incoming client trace context.
- The Go snippet had unused variables/imports and would not compile. Replaced it with a minimal compiling client-go example.
- The span metrics configuration used `spanmetrics` as an exporter with the old `metrics_exporter` pattern. Updated it to the current spanmetrics connector pattern with a traces pipeline exporting to `spanmetrics` and a metrics pipeline receiving from `spanmetrics`.

## Review Notes
The examples still use `latest` container tags, which is convenient for a blog tutorial but not ideal for production. Pinning specific OpenTelemetry Collector and Jaeger versions would make future behavior more reproducible.
