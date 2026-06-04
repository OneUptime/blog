# Validation Summary: How to Configure NVIDIA GPU Operator for Automated Driver Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- NVIDIA GPU Operator
- NVIDIA GPU Driver containers
- NVIDIA Container Toolkit
- NVIDIA Kubernetes Device Plugin
- GPU Feature Discovery and Node Feature Discovery
- DCGM Exporter
- Prometheus and PromQL
- Grafana dashboards
- MIG
- GPU time-slicing
- Helm

## Sources Consulted
- NVIDIA GPU Operator installation documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html
- NVIDIA GPU Operator v23.9.2 installation documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/23.9.2/getting-started.html
- NVIDIA GPU Operator MIG documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-mig.html
- NVIDIA GPU Operator time-slicing documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/25.3.4/gpu-sharing.html
- NVIDIA GPU Operator v26.3.2 Helm chart values: https://github.com/NVIDIA/gpu-operator/blob/v26.3.2/deployments/gpu-operator/values.yaml
- NVIDIA GPU Operator Helm chart repository: https://helm.ngc.nvidia.com/nvidia
- NVIDIA DCGM Exporter documentation: https://docs.nvidia.com/datacenter/dcgm/latest/gpu-telemetry/dcgm-exporter.html
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Grafana Dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/http_api/dashboard/

## Issues Found
- The install command pinned GPU Operator `v23.9.1`, which is outdated for the validation date. Updated the example to `v26.3.2`, the current NVIDIA GPU Operator patch release shown in the official installation docs.
- Several component version examples matched the old chart. Updated the driver, toolkit, device plugin, GFD, DCGM Exporter, and MIG Manager versions to values from the official `v26.3.2` chart.
- The prerequisite GPU check used Kubernetes GPU capacity before the device plugin was installed. Replaced it with a host PCI check through `kubectl debug`, because `nvidia.com/gpu` capacity is normally advertised after the device plugin is running.
- The existing-driver note said nodes should be clean. NVIDIA supports preinstalled drivers when `driver.enabled=false`, so the note was corrected.
- The driver values placed `nodeSelector` and `tolerations` under `driver`, where they are not valid chart keys for the driver container path. Removed the invalid node selector example and moved GPU operand tolerations under the supported top-level `daemonsets.tolerations` key.
- The Node Feature Discovery example used a `gfd.config` block that is not part of the current chart values. Replaced it with supported `gfd`, `nfd`, and `node-feature-discovery.master.config.extraLabelNs` values.
- The PromQL memory usage example divided used memory by free memory. Changed it to calculate percentage used from used plus free framebuffer memory.
- The Grafana import curl posted an invalid dashboard payload with duplicate `dashboard` keys and only a dashboard ID. Replaced it with a command that downloads dashboard ID 12239 JSON from Grafana.com and wraps it in the import API payload.
- The MIG section said the sample applied to A100/H100 GPUs, but the profiles shown are A100-style `1g.5gb`, `2g.10gb`, and `3g.20gb` profiles. Narrowed the wording to A100 GPUs.
- The MIG values included an unsupported `migManager.strategy` key. Removed it and kept the supported `mig.strategy` key.
- The MIG node label command did not include `--overwrite`, which NVIDIA's examples use to update an existing `nvidia.com/mig.config` label.
- The driver upgrade section claimed workloads on each node are drained before upgrade. NVIDIA's default policy evicts GPU pods and upgrades one node at a time, while full node drain requires `driver.upgradePolicy.drain.enable=true`. Updated the wording.

## Review Notes
The post is now technically aligned with the current GPU Operator chart and documentation as of 2026-06-04. Local `helm` and `kubectl` binaries were not available in the workspace, so validation was performed against official NVIDIA documentation, the official Helm chart source, and Grafana documentation rather than by deploying to a live cluster.
