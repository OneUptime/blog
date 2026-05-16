# Validation Summary: How to Set Up Node Exporter on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Prometheus Node Exporter
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Kubernetes DaemonSet, Service, hostPath volumes, host networking, and tolerations
- Helm and the prometheus-community Helm charts
- PromQL
- Grafana dashboards

## Sources Consulted
- Prometheus Node Exporter README: https://github.com/prometheus/node_exporter/blob/master/README.md
- Prometheus Node Exporter v1.11.1 release: https://github.com/prometheus/node_exporter/releases/tag/v1.11.1
- Prometheus Node Exporter v1.11.1 `--help` output from the official release binary
- Prometheus guide for monitoring Linux host metrics with Node Exporter: https://prometheus.io/docs/guides/node-exporter/
- prometheus-community prometheus-node-exporter Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus-node-exporter/values.yaml
- prometheus-community kube-prometheus-stack Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Talos Linux architecture documentation: https://docs.siderolabs.com/talos/v1.10/learn-more/architecture
- Talos Linux disk management documentation: https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/storage-and-disk-management/disk-management
- Talos Linux machine configuration reference for CNI settings: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config

## Issues Found
- The manual DaemonSet pinned `prom/node-exporter:v1.7.0`, which is outdated and does not match the current upstream image repository used by Prometheus documentation and the prometheus-community chart. Updated it to `quay.io/prometheus/node-exporter:v1.11.1`, the latest Node Exporter release available during review.
- The manual DaemonSet used Docker-oriented filesystem exclusions and did not include the current filesystem type exclusions used by the chart. Updated the mount-point exclusions for Talos/containerd paths and added the filesystem type exclusion list, including `erofs`.
- The later Talos filesystem tuning snippet omitted `run/containerd` and `erofs`. Updated it to match the corrected DaemonSet collector configuration.

## Review Notes
The remaining Kubernetes, Helm, ServiceMonitor, PrometheusRule, PromQL, and troubleshooting snippets are syntactically plausible and align with the upstream documentation reviewed. The `node_timex_offset_seconds` alert depends on the Node Exporter `timex` collector being available; upstream notes that some containerized deployments may require the `SYS_TIME` capability for that collector, so operators should verify that metric appears in their environment.
