# Validation Summary: How to Deploy Jaeger on Rancher for Distributed Tracing - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Rancher-managed Kubernetes clusters
- Jaeger
- Helm
- Elasticsearch
- OpenTelemetry
- Python / Flask

## Sources Consulted
- Jaeger docs, Deploying on Kubernetes: https://www.jaegertracing.io/docs/2.17/deployment/kubernetes/
- Jaeger docs, Sampling: https://www.jaegertracing.io/docs/sampling/
- Jaeger docs, APIs: https://www.jaegertracing.io/docs/2.17/apis/
- Jaeger docs, Deployment: https://www.jaegertracing.io/docs/2.17/deployment/
- Official Jaeger Helm chart README: https://raw.githubusercontent.com/jaegertracing/helm-charts/main/charts/jaeger/README.md
- Official Jaeger Helm chart values: https://raw.githubusercontent.com/jaegertracing/helm-charts/main/charts/jaeger/values.yaml
- Official Jaeger Helm chart ingress template: https://raw.githubusercontent.com/jaegertracing/helm-charts/main/charts/jaeger/templates/jaeger/jaeger-ingress.yaml
- Official Jaeger Helm chart service template: https://raw.githubusercontent.com/jaegertracing/helm-charts/main/charts/jaeger/templates/jaeger/jaeger-service.yaml
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry General SDK Configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry OTLP Exporter Configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- Bitnami Elasticsearch chart README: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/elasticsearch/README.md
- Bitnami Elasticsearch chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/elasticsearch/values.yaml
- Bitnami Elasticsearch service template: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/elasticsearch/templates/service.yaml

## Issues Found
- The post used the old Jaeger Operator / CRD workflow (`jaegertracing.io/v1` resources and a `jaeger-operator` Helm chart). I replaced that with the current official Helm-based Jaeger deployment flow and chart values syntax, because current Jaeger docs for v2 point users to the Helm chart and OpenTelemetry Collector Operator rather than the legacy operator flow.
- The development and production manifests used outdated Jaeger CR fields and service topology assumptions. I rewrote those sections to use the current Jaeger Helm chart values format, including ingress settings, replica/resource settings, and Elasticsearch-backed storage configuration.
- The production Elasticsearch setup omitted the current official Bitnami installation path and mixed in old service naming assumptions. I updated the install command to the current OCI-based Bitnami chart reference and aligned the Jaeger storage URLs with the chart’s actual service naming.
- The Python instrumentation example sent traces to an OpenTelemetry Collector that the article never deployed, omitted the `service.name` resource, and was not self-contained. I updated it to export directly to Jaeger’s OTLP endpoint, added the required resource configuration, and made the snippet runnable as written.
- The Jaeger Agent DaemonSet section was outdated for current OpenTelemetry-based deployments. I replaced it with environment-variable based OTLP configuration for applications, which matches current Jaeger and OpenTelemetry guidance.
- The sampling example embedded comments inside JSON, which made it invalid, and it was not wired into the deployment. I replaced it with current OpenTelemetry SDK sampling configuration using `OTEL_TRACES_SAMPLER` and `OTEL_TRACES_SAMPLER_ARG`.
- The UI access and troubleshooting commands referenced outdated service and deployment names (`jaeger-prod-query`, `jaeger-prod-collector`) and old log patterns. I updated them to the current Helm release resources and current Jaeger/OpenTelemetry Collector metrics (`otelcol_receiver_accepted_spans`, `otelcol_exporter_sent_spans`).
- The API section treated Jaeger’s `/api/*` endpoints like a stable public interface. I kept the examples but added the correct caveat that these endpoints are used by the UI and are not a stable public API.
- The introduction referenced Jaeger client libraries as a current recommendation. I corrected that to OpenTelemetry-based instrumentation, which is the current recommended direction in Jaeger documentation.

## Review Notes
- The official Jaeger Helm chart is marked as under active development / experimental in the upstream README, so chart values can change faster than older operator-based examples.
- The article now matches current Jaeger v2 deployment guidance, which uses a unified Jaeger deployment that exposes OTLP, Jaeger, Zipkin, query, and metrics ports from the same service.
- The Bitnami Elasticsearch chart currently defaults to `security.enabled=false`; if a reader enables Elasticsearch authentication or TLS, they must also add the matching Jaeger storage credentials and TLS settings.
- Jaeger’s `/api/*` HTTP endpoints remain useful for ad hoc inspection, but automation should prefer Jaeger’s documented query APIs where stability matters.
