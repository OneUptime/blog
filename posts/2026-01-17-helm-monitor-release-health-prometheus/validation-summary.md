# Validation Summary: How to Monitor Helm Release Health with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule CRDs
- Grafana
- kube-state-metrics
- Alertmanager
- OpenTelemetry Collector
- Prometheus Pushgateway

## Sources Consulted
- Helm Exporter README and metric documentation: https://github.com/sstarcher/helm-exporter/blob/master/README.md
- Helm Exporter source code for metric names, labels, status codes, and environment variables: https://github.com/sstarcher/helm-exporter/blob/master/main.go
- sstarcher Helm chart repository index and packaged chart values/templates: https://shanestarcher.com/helm-charts/
- Prometheus Operator API reference for ServiceMonitor and PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus / OpenMetrics exposition format documentation: https://prometheus.io/docs/specs/om/open_metrics_spec/
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- kube-state-metrics deployment metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/

## Issues Found
- The post used non-existent Helm Exporter metrics: `helm_release_status`, `helm_release_revision`, and `helm_release_updated_timestamp`. I replaced these with the actual metrics exposed by `sstarcher/helm-exporter`: `helm_chart_info`, `helm_chart_timestamp`, and `helm_chart_outdated`.
- The post used incorrect Helm Exporter label names such as `chart_version` and `app_version`. I corrected them to the exporter labels `version` and `appVersion`.
- The post queried a `status` label without enabling it. I added `statusInMetric=true` to the install command and values file because the exporter only adds the `status` label when that option is enabled.
- The chart values used `serviceMonitor.enabled`, `namespaces: []`, and `config.helmDriver`, which do not match the current chart. I changed them to `serviceMonitor.create`, `namespaces: ""`, and an `HELM_DRIVER` environment variable.
- The pinned exporter image tag was outdated relative to the current chart repository. I updated the example from `1.2.5` to `1.3.0`.
- The rollback alert attempted to detect rollbacks with a negative revision delta, but Helm revisions increase even on rollbacks and the exporter does not expose a numeric revision metric. I changed the alert to use the custom `helm_rollback_total` hook metric introduced later in the post.
- The Pushgateway hook examples emitted multi-line metric samples, which are not valid Prometheus text-format samples. I changed each pushed sample to a single line with labels and value.
- The Alertmanager route used deprecated `match` syntax. I changed it to the current `matchers` syntax.

## Review Notes
- The Grafana dashboard JSON is a minimal illustrative dashboard, not a full exported Grafana dashboard with schema metadata and datasource references.
- The workload health alerts are broad examples and are not limited to Helm-owned workloads unless users add labels or selectors that identify Helm-managed resources.
- Pushgateway is acceptable for short-lived hook jobs, but production users should choose stable grouping keys and lifecycle cleanup policies deliberately.
