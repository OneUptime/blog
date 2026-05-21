# Validation Summary: How to Set Up Grafana Dashboards for Istio Workload Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio telemetry and standard metrics
- Grafana dashboards and dashboard JSON
- Prometheus and PromQL
- Kubernetes workload and container metrics

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Grafana integration: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Prometheus querying functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Grafana dashboard JSON model: https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Kubernetes node metrics data: https://kubernetes.io/docs/reference/instrumentation/node-metrics/
- Kubernetes kube-state-metrics concept documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/

## Issues Found
- The Grafana addon command used Istio `release-1.20`, which is outdated compared with the current Istio documentation. Changed it to `release-1.30`, matching the official Istio Grafana integration documentation current on 2026-05-21.
- The Kubernetes resource metrics section said `container_cpu_usage_seconds_total` and `container_memory_working_set_bytes` require kube-state-metrics. These are container usage metrics from kubelet/cAdvisor scraping, while kube-state-metrics exposes Kubernetes object-state metrics. Updated the text to say Prometheus must scrape kubelet/cAdvisor metrics.
- The ConfigMap dashboard example was described as automatic Grafana provisioning in general. A ConfigMap labeled `grafana_dashboard: "1"` is a common dashboard sidecar pattern, not native Grafana file provisioning by itself. Updated the text to specify that this applies when Grafana is deployed with a dashboard sidecar that watches ConfigMaps.

## Review Notes
- The Istio metric names and labels used in the workload-level PromQL examples are consistent with Istio standard metrics documentation. Per-pod Istio panels depend on the Prometheus scrape configuration retaining Kubernetes pod metadata as a `pod` label, which the Istio sample Prometheus configuration does.
- Grafana dashboard import/export UI labels can vary by Grafana version, but the post's JSON model guidance is broadly correct.
