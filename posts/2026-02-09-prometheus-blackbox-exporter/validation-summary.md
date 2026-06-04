# Validation Summary: How to Deploy Prometheus BlackBox Exporter for Endpoint Availability Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus Blackbox Exporter
- Prometheus Operator Probe, ServiceMonitor, and PrometheusRule CRDs
- Kubernetes Deployments, Services, ConfigMaps, and probes
- Helm
- PromQL
- Grafana dashboards

## Sources Consulted
- Prometheus Blackbox Exporter configuration reference: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Prometheus Blackbox Exporter README: https://github.com/prometheus/blackbox_exporter
- Prometheus Community Helm chart values for prometheus-blackbox-exporter: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus-blackbox-exporter/values.yaml
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus configuration reference for relabeling and scrape parameters: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The Kubernetes liveness and readiness probes used `/health`, but the Blackbox Exporter Helm chart and Prometheus-style web handlers use `/-/healthy`. Updated both probes to `/-/healthy`.
- The Blackbox Exporter Service was selected later by a ServiceMonitor using `app: blackbox-exporter`, but the Service did not define that label. Added the matching Service metadata label.
- The Probe CRD example put custom labels at `spec.labels`, which is not a valid ProbeSpec field. Moved the labels under `spec.targets.staticConfig.labels`.
- The dynamic ServiceMonitor section said it selected services by annotation while the YAML used `matchLabels`. Corrected the text to say label.
- The dynamic ServiceMonitor target parameter used shell-style `$(SERVICE_NAME)` and `$(NAMESPACE)` placeholders, which Prometheus does not expand. Replaced this with Prometheus relabeling from `__meta_kubernetes_service_name` and `__meta_kubernetes_namespace` into `__param_target`.
- The SSL certificate warning alert also matched already-expired certificates. Added a positive lower bound so the warning alert only covers certificates expiring in the next 30 days.
- The slow response alert and Grafana response-time panel used `probe_http_duration_seconds`, which is a phase-level HTTP timing metric rather than the overall probe duration. Replaced it with `probe_duration_seconds`.
- The DNS failure alert used `probe_dns_lookup_time_seconds == 0`, which is not a reliable failure indicator. Changed it to alert on `probe_success{job="dns-probe"} == 0` and added `jobName: dns-probe` to the DNS Probe example.
- The "Multi-Step HTTP Probe" heading implied multi-request workflow support, but the snippet only performs content/header validation for a single HTTP probe. Renamed the heading and module to reflect HTTP content validation.

## Review Notes
- The post remains version-neutral. The reviewed snippets align with the current Blackbox Exporter configuration schema and Prometheus Operator CRD documentation as of 2026-06-04.
- The examples use `prom/blackbox-exporter:latest`; pinning to a release tag would be preferable for production deployments, but this is not technically invalid.
