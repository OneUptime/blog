# Validation Summary: How to Monitor GPU Usage in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- NVIDIA GPU Operator
- NVIDIA DCGM Exporter
- Prometheus
- Prometheus Operator
- Grafana
- Helm

## Sources Consulted
- Rancher monitoring docs: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- NVIDIA GPU Operator getting started: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html
- NVIDIA GPU Operator chart values: https://github.com/NVIDIA/gpu-operator/blob/master/deployments/gpu-operator/values.yaml
- NVIDIA DCGM Exporter docs: https://docs.nvidia.com/datacenter/dcgm/latest/gpu-telemetry/dcgm-exporter.html
- NVIDIA DCGM Exporter repository README: https://github.com/NVIDIA/dcgm-exporter
- NVIDIA DCGM Exporter default counters: https://github.com/NVIDIA/dcgm-exporter/blob/main/etc/default-counters.csv
- NVIDIA GPU monitoring dashboard doc: https://docs.nvidia.com/datacenter/cloud-native/openshift/25.3/enable-gpu-monitoring-dashboard.html
- kube-prometheus-stack chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus `promtool` docs: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus HTTP API docs: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus Operator troubleshooting: https://prometheus-operator.dev/docs/platform/troubleshooting/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana plugin installation docs: https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-install/

## Issues Found
- The post described "Memory Utilization" as "GPU memory used vs available", but that wording does not match `DCGM_FI_DEV_MEM_COPY_UTIL`. I changed the bullet to "Framebuffer Memory Usage" and renamed the CSV subsection to "Utilization" so the narrative matches the actual DCGM metrics being exported.
- The GPU Operator values snippet pinned `dcgmExporter.version` to an older image tag. I removed the hardcoded version so the example follows the current GPU Operator configuration model instead of freezing the post to a stale exporter build.
- The Grafana step instructed readers to install `grafana-piechart-panel` inside the running Grafana pod. Current NVIDIA guidance points to importing the official DCGM Exporter dashboard JSON / Grafana dashboard `12239` instead. I replaced that step with the official dashboard JSON download.
- The Prometheus query examples were not valid as written. `promtool query instant` and `promtool query range` require a Prometheus server argument, `query range` requires absolute start and end times, and the hardcoded `prometheus-0` pod name is not portable. I replaced the section with `kubectl port-forward` plus Prometheus HTTP API queries against `svc/prometheus-operated`, which matches current Prometheus Operator guidance.

## Review Notes
- `additionalLabels.release: prometheus` is only correct when the Prometheus release label is actually `prometheus`. The post already notes that this label must match the Prometheus stack label, which is important because `kube-prometheus-stack` defaults to `serviceMonitorSelectorNilUsesHelmValues: true`.
- `DCGM_FI_DEV_MEMORY_TEMP` availability can vary by GPU model, and per-workload labels such as `pod` and `namespace` depend on how workloads are scheduled and exposed by `dcgm-exporter`. The remaining examples are valid, but operators may need to trim unsupported metrics for specific hardware.
