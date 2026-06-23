# Validation Summary: How to Integrate MetalLB Metrics with OneUptime

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- MetalLB
- Kubernetes
- Helm
- OpenTelemetry Collector
- Prometheus receiver and scrape configuration
- OTLP/HTTP
- OneUptime telemetry ingestion

## Sources Consulted
- MetalLB Prometheus metrics documentation: https://metallb.universe.tf/prometheus-metrics/
- MetalLB installation and Helm documentation: https://metallb.universe.tf/installation/
- MetalLB Helm chart values and templates: https://github.com/metallb/metallb/tree/main/charts/metallb
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/prometheusreceiver
- OpenTelemetry health check extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/healthcheckextension
- OpenTelemetry OTLP HTTP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlphttpexporter
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry
- OneUptime cloud telemetry documentation: https://oneuptime.com/docs/en/telemetry/cloud-environments

## Issues Found
- The post used the older MetalLB metrics port `7472` as the default. Current MetalLB releases expose HTTPS metrics on port `9120`; I updated diagrams, commands, scrape configs, and troubleshooting examples while noting the older-port caveat.
- The Helm values used non-existent `controller.metrics` and `speaker.metrics` keys for the official MetalLB chart. I replaced them with the official `prometheus.scrapeAnnotations`, `prometheus.metricsPort`, and `prometheus.serviceMonitor` values.
- The post referenced monitor services named `controller-metrics` and `speaker-metrics`. The official chart creates names like `metallb-controller-monitor-service` and `metallb-speaker-monitor-service`; I updated the text and service-based scrape example.
- The post listed and used `metallb_layer2_announcements_total`, which is not documented as a current MetalLB metric. I replaced it with scrape health and Kubernetes API/config metrics where appropriate.
- The BGP metric guidance did not mention the default FRR-K8s backend, which emits `frrk8s_` metrics. I added notes and alert/dashboard alternatives for `frrk8s_bgp_*`.
- The OpenTelemetry Collector config used HTTP scraping and unescaped Prometheus replacement variables. I changed the scrapes to HTTPS with TLS skip verification for MetalLB's default self-signed metrics endpoint and escaped capture groups as `$${1}` for Collector config parsing.
- The Collector Deployment configured liveness/readiness probes on port `13133` without enabling the `health_check` extension. I added the extension and enabled it in `service.extensions`.
- The Collector config used the deprecated/ignored `service.telemetry.metrics.address` field for current Collector versions. I replaced it with the current `readers.pull.exporter.prometheus` form.
- The OneUptime OTLP endpoint used `https://otlp.oneuptime.com`. I updated it to the documented `https://oneuptime.com/otlp` endpoint with JSON encoding and the `x-oneuptime-token` header.
- The Collector image was pinned to the old `0.96.0` release. I updated the examples to `0.154.0`, the latest OpenTelemetry Collector release available during review.
- The memory limiter comment said data would be dropped at 350 MB even though `limit_mib: 400` and `spike_limit_mib: 100` produce a soft limit of roughly 300 MB. I corrected the explanation.

## Review Notes
- All YAML snippets in the post were parsed after editing to confirm syntax validity.
- The post remains a general guide and still assumes users adapt names, namespaces, TLS policy, and OneUptime token handling to their own cluster security requirements.
