# Validation Summary: How to Deploy OpenTelemetry Collector on Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher-managed Kubernetes
- Helm
- OpenTelemetry Collector
- Jaeger
- Prometheus
- Kubernetes Pod environment variables

## Sources Consulted
- OpenTelemetry Collector Helm chart README: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/README.md
- OpenTelemetry Collector Helm chart values: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/values.yaml
- OpenTelemetry Collector Helm chart upgrading notes: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/UPGRADING.md
- OpenTelemetry Collector OTLP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry Collector Kubelet Stats receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kubeletstatsreceiver/README.md
- OpenTelemetry Collector component registry: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector releases manifests: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol-k8s/manifest.yaml and https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol-contrib/manifest.yaml
- Jaeger APIs documentation: https://www.jaegertracing.io/docs/1.76/architecture/apis/
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Kubernetes dependent environment variables documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The Helm chart examples were missing the now-required `image.repository` and `command.name` values. I added explicit collector images and binary names so the install commands match current chart requirements.
- The DaemonSet example manually configured `kubeletstats` but did not include the chart-side RBAC and environment wiring needed for that receiver. I switched it to the chart's `presets.kubeletMetrics.enabled` flow and kept the metrics pipeline wired to `kubeletstats`.
- The DaemonSet exported to `otel-gateway-collector.observability.svc.cluster.local`, but the chart would not generate that name by default for a release called `otel-gateway`. I added `fullnameOverride: otel-gateway-collector` so the example DNS name resolves as written.
- The Gateway example used a `jaeger` exporter pointed at port `14250`. Current Jaeger documentation recommends OTLP, and the current official Collector exporter list does not include a Jaeger exporter. I replaced it with `otlp/jaeger` targeting Jaeger's OTLP gRPC port `4317`.
- The post described Prometheus as a backend the Collector routes metrics to directly. The Collector's `prometheus` exporter exposes a `/metrics` endpoint for scraping instead. I updated the description, diagram, Gateway wording, and exposed port `8889` so Prometheus can scrape it.
- The post claimed logs were being routed to Loki, but the configuration did not define a working logs pipeline for Loki. I removed the Loki and log-routing claims so the prose matches the configuration that is actually shown.
- The application pod example referenced `$(HOST_IP)` before defining `HOST_IP`. Kubernetes only expands previously defined environment variables, so I reordered the variables and added `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` to make the OTLP endpoint example explicit.
- The chart merges user `config` with its defaults. Without additional cleanup, the rendered configuration would keep extra default receivers, pipelines, and open ports that the post did not describe. I nullified the unused defaults and disabled unused ports so the snippets better reflect what would run.

## Review Notes
- The `jaeger-collector.observability.svc.cluster.local` hostname is still an example and may need to be adjusted to match the Jaeger service name created in a specific cluster.
- With `replicaCount: 2`, Prometheus should scrape the Gateway collector endpoints or a ServiceMonitor/PodMonitor target set, not a single manually hard-coded load-balanced request path.
