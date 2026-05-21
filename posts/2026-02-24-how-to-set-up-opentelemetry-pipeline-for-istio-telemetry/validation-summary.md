# Validation Summary: How to Set Up OpenTelemetry Pipeline for Istio Telemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio
- Istio Telemetry API
- OpenTelemetry Collector
- Kubernetes
- Prometheus
- Grafana Tempo
- Grafana Loki
- Helm

## Sources Consulted
- Istio OpenTelemetry tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio OpenTelemetry access logging documentation: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector releases repository: https://github.com/open-telemetry/opentelemetry-collector-releases
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki Helm installation documentation: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Tempo Helm documentation: https://grafana.com/docs/tempo/latest/setup/helm-chart/

## Issues Found
- The post described Istio proxy metrics as if they were sent to the collector over OTLP. Istio standard metrics are exposed for Prometheus scraping, so the wording and collector pipelines were updated to make metrics scraping explicit.
- The gateway Prometheus receiver only scraped `istiod`, so `istio_requests_total` from sidecars and gateways would not be collected. Added the documented Envoy `/stats/prometheus` scrape job.
- The `istiod` scrape job used a pod relabeling workaround with `${1}`, which can conflict with OpenTelemetry Collector environment-variable expansion and is less accurate than the documented endpoint scrape. Replaced it with the documented `istiod;http-monitoring` endpoint scrape.
- The DaemonSet agent was described as node-local, but the Service could load balance to agents on other nodes. Added `internalTrafficPolicy: Local` and clarified that the agent handles traces and access logs.
- The OpenTelemetry Collector image was pinned to the old `0.96.0` release. Updated examples to `0.151.0`, matching the current official collector release series available at review time.
- The gateway used the deprecated/removed Loki exporter pattern. Replaced it with `otlphttp/loki` and Loki's native OTLP endpoint, as recommended by Grafana Loki documentation.
- The backend installation commands did not install Loki even though the pipeline exported logs to Loki. Added a Loki Helm install example and Helm repository setup commands.
- The pipeline health dashboard queries referenced collector metrics without exposing or scraping collector internal telemetry. Added internal metrics listeners and collector scrape jobs.
- The dashboard used a timeout-trigger counter as if it were a latency histogram and used a non-collector memory metric. Replaced those with the batch send-size histogram and `otelcol_process_memory_rss`.

## Review Notes
The Kubernetes YAML blocks parse successfully, and the embedded OpenTelemetry Collector agent and gateway configs validate with `otel/opentelemetry-collector-contrib:0.151.0`. The Loki Helm chart is changing naming conventions around `SingleBinary` and `Monolithic`; production users should pin and test chart values for their chosen chart version.
