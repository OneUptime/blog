# Validation Summary: How to Set Up Prometheus on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Prometheus
- Prometheus Community Helm chart
- Kubernetes
- Helm
- PromQL
- Alertmanager
- node-exporter
- kube-state-metrics
- etcd metrics

## Sources Consulted
- Prometheus Community Helm chart `Chart.yaml`: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/prometheus/Chart.yaml
- Prometheus Community Helm chart `values.yaml`: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/prometheus/values.yaml
- Prometheus configuration documentation, including Kubernetes service discovery and EndpointSlice meta labels: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Talos Linux guide for exposing the etcd metrics endpoint: https://www.talos.dev/v1.10/kubernetes-guides/configuration/etcd-metrics/
- Talos Linux CLI reference for `talosctl health` and `talosctl stats`: https://www.talos.dev/v1.10/reference/cli/

## Issues Found
- The Helm values used outdated dependency keys: `nodeExporter`, `kubeStateMetrics`, and `pushgateway`. Updated them to the current chart keys `prometheus-node-exporter`, `kube-state-metrics`, and `prometheus-pushgateway`, matching the chart dependency conditions.
- The Alertmanager persistence configuration used `persistentVolume`, which is not the current Alertmanager subchart key under this chart. Updated it to `alertmanager.persistence`.
- The verification section listed `prometheus-node-exporter` as the node-exporter pod prefix. With the shown release name, current chart resources are prefixed with `prometheus-prometheus-node-exporter`, so the example was corrected.
- The default scrape target list claimed CoreDNS was scraped by default and did not clearly distinguish annotated services/pods from enabled subcharts. Updated the list to match the chart's current default scrape configs.
- The custom scrape config used `role: endpoints` and the `__meta_kubernetes_endpoint_port_name` label. The current chart defaults use EndpointSlice discovery, so the example was updated to `role: endpointslice` and `__meta_kubernetes_endpointslice_port_name`.
- The Talos-specific metrics example used port `9100`, which is the node-exporter port, not a Talos-specific metrics endpoint. Updated the section to describe Talos-managed etcd metrics, which must be explicitly exposed, and changed the scrape targets to port `2381`.

## Review Notes
The post remains technically valid as a basic Prometheus chart deployment guide. In the future, it could mention that production Talos clusters should secure any exposed etcd metrics endpoint and that many users may prefer `kube-prometheus-stack` when they want Prometheus Operator, ServiceMonitor, Grafana, and more batteries-included defaults.
