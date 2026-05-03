# Validation Summary: How to Deploy Jaeger on Rancher for Distributed Tracing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jaeger (Jaeger Operator, Jaeger CRD `jaegertracing.io/v1`)
- Rancher / Kubernetes
- Helm (cert-manager and Jaeger Operator charts)
- OpenTelemetry Python SDK (`opentelemetry-api`, `opentelemetry-sdk`, `opentelemetry-exporter-otlp`)
- Elasticsearch (as Jaeger storage backend)
- cert-manager

## Sources Consulted
- Jaeger Operator docs: https://www.jaegertracing.io/docs/1.76/deployment/operator/
- Jaeger Operator API reference: https://pkg.go.dev/github.com/jaegertracing/jaeger-operator/pkg/apis/jaegertracing/v1
- Jaeger Operator Helm charts: https://github.com/jaegertracing/helm-charts
- Jaeger v2 architecture docs: https://www.jaegertracing.io/docs/2.10/architecture/
- OpenTelemetry Python exporters: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python CHANGELOG (Jaeger exporter removal in v1.22.0): https://github.com/open-telemetry/opentelemetry-python/blob/main/CHANGELOG.md
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/

## Issues Found

1. **Removed OpenTelemetry Python Jaeger exporter.** The post imported `from opentelemetry.exporter.jaeger.thrift import JaegerExporter`, but that package was deprecated in OTel Python v1.16 and **removed in v1.22.0** (mid-2023). The import would fail on any current SDK. Replaced the example with the OTLP gRPC exporter (`opentelemetry.exporter.otlp.proto.grpc.trace_exporter.OTLPSpanExporter`) pointed at the Jaeger collector's OTLP port (`4317`), since Jaeger natively supports OTLP from v1.35+. Also added a short comment explaining why.

2. **Deprecated cert-manager Helm flag.** The post used `--set installCRDs=true`. The cert-manager Helm chart marked this option as deprecated in favor of `--set crds.enabled=true` (current docs from v1.16+). Updated to the current flag.

3. **Legacy Jaeger agent endpoint.** As part of fix #1, the example previously sent traces to `jaeger-dev-agent.observability.svc.cluster.local:6831` (UDP Thrift compact). The Jaeger v2 architecture docs explicitly recommend OTLP to the collector instead of the legacy agent. The replacement code now targets `jaeger-dev-collector.observability.svc.cluster.local:4317`.

## Review Notes

- `strategy: allInOne` (camelCase) is left as-is. The canonical CRD constant is lowercase `allinone`, but the operator accepts and normalizes `allInOne`, and official Jaeger docs use the camelCase form in YAML examples — so it works and matches upstream conventions.
- The `jaegertracing/jaeger-operator` Helm chart used here is correct for Jaeger **v1.x** (latest operator v1.65 as of Jan 2025). For greenfield Jaeger **v2** deployments, the upstream guidance is to deploy via the **OpenTelemetry Operator** rather than the Jaeger Operator, since Jaeger v2 is built on the OTel Collector. Worth noting in a future revision but not strictly an error today.
- The Elasticsearch storage block is structurally correct (`spec.storage.type: elasticsearch`, `options.es.server-urls`, `secretName`). Production users should also configure `es.index-prefix`, retention via the spark-dependencies/rollover jobs, and authentication, but the snippet is intentionally minimal.
- The `kubectl port-forward` to `svc/jaeger-dev-query` on `16686:16686` is correct — the Jaeger Operator creates a `<name>-query` service exposing the UI on port 16686 even with the all-in-one strategy.
