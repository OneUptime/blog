# Validation Summary: How to Set Up Full Observability Stack on Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Prometheus
- Grafana
- Loki
- Promtail
- Tempo
- OpenTelemetry Collector

## Sources Consulted
- Prometheus Community `kube-prometheus-stack` README: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/README.md
- `kube-prometheus-stack` values: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/values.yaml
- `kube-prometheus-stack` Grafana datasource template: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/templates/grafana/configmaps-datasources.yaml
- `kube-prometheus-stack` helpers template: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/templates/_helpers.tpl
- Loki Helm install docs: https://grafana.com/docs/loki/latest/setup/install/helm/
- Loki Helm chart components docs: https://grafana.com/docs/loki/latest/setup/install/helm/concepts/
- Loki storage docs: https://grafana.com/docs/loki/latest/setup/install/helm/configure-storage/
- Loki chart values: https://raw.githubusercontent.com/grafana/loki/main/production/helm/loki/values.yaml
- Loki chart validation template: https://raw.githubusercontent.com/grafana/loki/main/production/helm/loki/templates/validate.yaml
- Loki gateway service template: https://raw.githubusercontent.com/grafana/loki/main/production/helm/loki/templates/gateway/service-gateway.yaml
- Promtail chart values: https://raw.githubusercontent.com/grafana/helm-charts/main/charts/promtail/values.yaml
- Tempo Helm chart docs: https://grafana.com/docs/tempo/latest/setup/helm-chart/
- Tempo chart values: https://raw.githubusercontent.com/grafana/helm-charts/main/charts/tempo/values.yaml
- Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Tempo datasource provisioning docs: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- OpenTelemetry Collector Helm chart docs: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector chart values: https://raw.githubusercontent.com/open-telemetry/opentelemetry-helm-charts/main/charts/opentelemetry-collector/values.yaml

## Issues Found
- The Loki install command was not valid for current chart defaults. The chart now defaults to Simple Scalable mode, which requires object storage, and the chart validation also requires either an explicit schema config or `loki.useTestSchema=true` for quick testing. I changed the command to a single-binary filesystem-backed dev install and added `loki.useTestSchema=true`.
- Promtail was configured to push directly to `loki:3100`, but the current Loki chart enables the gateway service by default and documents that Grafana and log shippers should use the gateway. I changed the push URL to `loki-gateway.observability.svc.cluster.local`.
- The Tempo datasource URL used port `3100`, but the current monolithic Tempo chart defaults the HTTP server port to `3200`. I corrected the datasource URL to port `3200`.
- The Grafana datasource ConfigMap duplicated the Prometheus datasource that `kube-prometheus-stack` already provisions by default. I removed the duplicate Prometheus datasource entry and left Prometheus to the chart’s built-in provisioning.
- The Loki and Tempo datasource entries were missing explicit `uid` values even though the Tempo correlation config referenced datasource UIDs. I added `uid: loki` and `uid: tempo` so `tracesToLogsV2` and `tracesToMetrics` resolve correctly.
- The OpenTelemetry Collector install command only set `mode=daemonset`, but the chart’s default configuration exports traces to the `debug` exporter rather than Tempo. I added an OTLP exporter pointed at Tempo and updated the traces pipeline to use it.
- The verification step hard-coded Grafana credentials as `admin/prom-operator`. I replaced that with the chart-backed secret lookup so the instructions match the actual installed admin secret instead of assuming a specific password value.
- The architecture diagram implied a deployed Mimir layer and showed the Grafana-to-Alertmanager relationship incorrectly for this guide. I adjusted the diagram so Prometheus feeds Grafana directly and Prometheus routes alerts to Alertmanager.

## Review Notes
- The Loki command now uses `filesystem` storage and `loki.useTestSchema=true`, which is suitable for development or testing only. Production deployments should use object storage and an explicit Loki schema configuration.
- The post still uses Promtail, which remains available, but current Grafana Loki docs increasingly steer Kubernetes log collection guidance toward Grafana Alloy. This is not incorrect, but it is a likely future refresh point.
- The OpenTelemetry Collector changes in this post only wire traces to Tempo. Metrics remain handled by Prometheus and logs by Promtail, which matches the post’s architecture.
