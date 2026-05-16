# Validation Summary: How to Set Up Jaeger for Distributed Tracing on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Helm
- Elasticsearch
- Jaeger
- Jaeger Operator
- OpenTelemetry
- Python
- Go
- Node.js
- PrometheusRule

## Sources Consulted
- Jaeger v1.76 deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Jaeger v1.76 Operator for Kubernetes documentation: https://www.jaegertracing.io/docs/1.76/deployment/operator/
- Jaeger v1.76 CLI flags documentation: https://www.jaegertracing.io/docs/1.76/deployment/cli/
- Jaeger v2 Kubernetes deployment documentation: https://www.jaegertracing.io/docs/2.dev/deployment/kubernetes/
- Jaeger migration to OpenTelemetry SDK documentation: https://www.jaegertracing.io/sdk-migration/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Go exporters documentation: https://opentelemetry.io/docs/languages/go/exporters/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- Elastic Helm charts repository and chart metadata: https://github.com/elastic/helm-charts
- cert-manager installation documentation: https://cert-manager.io/docs/installation/kubectl/

## Issues Found
- The Jaeger Operator install command used the floating `latest` release URL. The current Jaeger documentation distinguishes Jaeger v2 Kubernetes management through the OpenTelemetry Operator from the v1 Jaeger Operator CRD flow used in this post, and the documented v1.76.0 operator URL is not an available release asset. I pinned the tutorial to the available Jaeger Operator `v1.65.0` manifest so the `jaegertracing.io/v1` custom resource remains consistent.
- The Jaeger Query configuration set `query.base-path: /jaeger` while the access instructions opened `http://localhost:16686`. With that base path, the UI would be served under `/jaeger`. I removed the base path configuration to match the port-forward instructions.
- The Python example used `opentelemetry.exporter.jaeger.thrift.JaegerExporter` and sent spans to the Jaeger Agent UDP port. OpenTelemetry and Jaeger now recommend OTLP for sending traces to Jaeger. I changed the example to use `OTLPSpanExporter` over HTTP to the collector on port `4318`.
- The Go example used the Jaeger exporter and Jaeger Agent endpoint. I changed it to the current OTLP HTTP exporter with `otlptracehttp`, added the required `context` import, and updated the semantic conventions import to `semconv/v1.37.0`.
- The Node.js example used `@opentelemetry/exporter-jaeger`, `NodeTracerProvider.addSpanProcessor`, and older resource APIs. I replaced it with the current `NodeSDK` plus OTLP HTTP exporter pattern and `resourceFromAttributes`.
- The sampling section implied the Jaeger Operator sampling strategy controls all instrumentation. I clarified that the operator publishes this strategy to compatible remote samplers; SDK-side sampling such as the Go example's `TraceIDRatioBased` sampler is configured in application code.

## Review Notes
- The tutorial still uses the archived Elastic Helm chart because replacing it with an ECK-based deployment would be a larger restructuring. For a future refresh, consider moving the Elasticsearch deployment to Elastic Cloud on Kubernetes or OpenSearch, which Jaeger documentation now recommends over Cassandra for large-scale deployments.
- YAML snippets were parsed successfully after edits.
