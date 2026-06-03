# Validation Summary: How to Configure Traefik Ingress with Prometheus Metrics and Tracing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Traefik Proxy v3
- Prometheus metrics and PromQL
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- OpenTelemetry tracing
- Jaeger
- Zipkin
- Grafana dashboards

## Sources Consulted
- Traefik Prometheus metrics documentation: https://doc.traefik.io/traefik/v3.0/observability/metrics/prometheus/
- Traefik metrics overview and metric names: https://doc.traefik.io/traefik/reference/install-configuration/observability/metrics/
- Traefik OpenTelemetry tracing documentation: https://doc.traefik.io/traefik/v3.4/observability/tracing/opentelemetry/
- Traefik v2 to v3 migration details for tracing changes: https://doc.traefik.io/traefik/master/migrate/v2-to-v3-details/
- Traefik access logs documentation: https://doc.traefik.io/traefik/observability/access-logs/
- Traefik Kubernetes IngressRoute documentation: https://doc.traefik.io/traefik/master/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Prometheus Operator API reference for ServiceMonitor and PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/

## Issues Found
- The post described direct Traefik tracing support for Jaeger and Zipkin and used `tracing.jaeger` / `tracing.zipkin` configuration. Traefik v3 tracing is OpenTelemetry-only and no longer supports direct vendor-specific tracing exporters, so the examples were changed to `tracing.otlp`.
- The Jaeger deployment commands installed only the Jaeger CRD and then created a Jaeger custom resource without installing the Jaeger Operator. Replaced this with a direct Jaeger all-in-one Kubernetes Service and Deployment that exposes OTLP and the Jaeger UI.
- The Zipkin example used obsolete Traefik direct Zipkin fields. Replaced it with Traefik OTLP output to an OpenTelemetry Collector configuration using the Zipkin exporter.
- The Traefik Deployment example was not a complete createable `apps/v1` Deployment because it omitted required selector, pod labels, and image fields. Added the required fields and included web, websecure, and metrics container ports.
- The Traefik metrics configuration did not enable Kubernetes providers even though the article configures IngressRoute resources. Added `providers.kubernetesCRD` and `providers.kubernetesIngress`.
- The Grafana dashboard ConfigMap used an API-style wrapper with a top-level `dashboard` object instead of a dashboard JSON model. Changed the JSON to a dashboard object with top-level `title` and `panels`.
- The per-service metrics section implied Kubernetes `IngressRoute` metadata labels become Prometheus labels. Corrected the text to use Traefik's generated `service` metric label and removed misleading labels from the example.
- Several PromQL queries and alert expressions used histogram buckets without aggregation by `le`, or divided error rates without aggregating away the `code` label. Updated the quantile, latency, average duration, and error-rate expressions to aggregate over the correct labels.
- The Jaeger port-forward command referenced `svc/jaeger-query`, which no longer matched the corrected deployment. Updated it to `svc/jaeger`.
- The `traefik_service_server_up` metric was presented as a generic backend health metric. Clarified that it is available for Traefik services configured with health checks.

## Review Notes
- YAML snippets and embedded dashboard JSON were parsed successfully locally after edits.
- `promtool`, `kubectl`, and Ruby were not installed in the workspace, so Prometheus rule validation and Kubernetes dry-run validation could not be run locally.
