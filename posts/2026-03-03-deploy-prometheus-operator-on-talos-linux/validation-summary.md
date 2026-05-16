# Validation Summary: How to Deploy Prometheus Operator on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Prometheus Operator
- kube-prometheus-stack Helm chart
- Alertmanager
- Grafana
- node-exporter
- kube-state-metrics
- PromQL
- Helm

## Sources Consulted
- kube-prometheus-stack chart: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- kube-prometheus-stack README: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/README.md
- Alertmanager configuration docs: https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager v0.22 CHANGELOG (matchers introduction): https://github.com/prometheus/alertmanager/blob/release-0.22/CHANGELOG.md
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Talos Linux — Expose etcd metrics: https://docs.siderolabs.com/kubernetes-guides/monitoring-and-observability/etcd-metrics
- Kubernetes component default ports (kube-controller-manager 10257, kube-scheduler 10259)

## Issues Found
- **Deprecated Alertmanager `match` syntax**: The Alertmanager configuration example used the `match:` field for severity-based routing. `match` and `match_re` have been deprecated since Alertmanager v0.22.0 (May 2021) in favor of the new `matchers:` list syntax (PromQL-style inline matchers). Updated both route entries in the `Configuring Alertmanager` section to use `matchers: - severity = "critical"` / `matchers: - severity = "warning"`.

## Review Notes
- All kube-prometheus-stack Helm values referenced (`prometheus.prometheusSpec.*`, `alertmanager.alertmanagerSpec.storage.*`, `grafana.adminPassword`, `serviceMonitorSelectorNilUsesHelmValues`, `podMonitorSelectorNilUsesHelmValues`, `kubeEtcd.service.targetPort`, `kubeControllerManager.service.targetPort`, `kubeScheduler.service.targetPort`) are valid in the current chart.
- Service and StatefulSet/Pod naming conventions (`prometheus-kube-prometheus-prometheus`, `prometheus-kube-prometheus-alertmanager`, `prometheus-grafana`, `prometheus-prometheus-kube-prometheus-prometheus-0`, `alertmanager-prometheus-kube-prometheus-alertmanager-0`, Secret `alertmanager-prometheus-kube-prometheus-alertmanager`) are correct for the default release name `prometheus`.
- Grafana service port mapping `3000:80` is correct (chart exposes Grafana on service port 80 targeting container port 3000).
- Talos-specific component ports (etcd metrics 2381, controller-manager 10257, scheduler 10259) are correct. Note (not added to post): exposing these on Talos also requires `listen-metrics-urls` for etcd and `bind-address: 0.0.0.0` extraArgs for the controller-manager and scheduler in the Talos machine config — the post correctly focuses on the Prometheus side but readers may need that Talos-side configuration too.
- All referenced PromQL metrics (`node_cpu_seconds_total`, `node_memory_MemAvailable_bytes`, `container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`, `apiserver_request_total`, `etcd_server_is_leader`, `node_filesystem_avail_bytes`, `kube_pod_container_status_restarts_total`, `kube_deployment_status_replicas_available`) are valid metric names from node-exporter, cAdvisor, kube-apiserver, etcd, and kube-state-metrics.
- All Prometheus Operator CRDs listed (Prometheus, Alertmanager, ServiceMonitor, PodMonitor, PrometheusRule, ThanosRuler) are valid `monitoring.coreos.com/v1` resources.
