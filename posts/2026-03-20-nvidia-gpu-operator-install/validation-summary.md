# Validation Summary: How to Install NVIDIA GPU Operator in Rancher

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- NVIDIA GPU Operator (Helm chart v23.9.0)
- NVIDIA driver, Container Toolkit, Device Plugin, DCGM Exporter, GPU Feature Discovery (GFD), Node Feature Discovery (NFD), MIG Manager
- Kubernetes (kubectl taint/label, namespaces, DaemonSets, ConfigMaps)
- Rancher (as the Kubernetes management context)
- Helm 3 (helm repo add / install / search)
- Prometheus / kube-prometheus-stack (ServiceMonitor CRD)
- containerd / CRI runtimes
- NVIDIA NGC private registry (nvcr.io, $oauthtoken auth)
- Time-slicing for GPU sharing

## Sources Consulted
- NVIDIA GPU Operator official docs: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/
- GPU Operator GitHub releases (v23.9.0, Sept 2023): https://github.com/NVIDIA/gpu-operator/releases
- GPU Operator Helm values reference (chart values for v23.9.x)
- NVIDIA NGC Helm registry: https://helm.ngc.nvidia.com/nvidia
- nvidia-container-toolkit image tags on nvcr.io (ubuntu/ubi/centos variants)
- NVIDIA DCGM Exporter image tag schema (`<dcgm>-<exporter>-<os>`)
- Kubernetes Pod Security Policy deprecation/removal (deprecated 1.21, removed 1.25)
- Kubernetes node taint/label syntax: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Prometheus Operator ServiceMonitor CRD: https://prometheus-operator.dev/docs/operator/api/
- NGC API key auth pattern (`--docker-username='$oauthtoken'`): NVIDIA NGC documentation
- k8s-device-plugin time-slicing config schema: https://github.com/NVIDIA/k8s-device-plugin

## Issues Found
No technical issues found. The Helm repo URL, chart version, configuration keys (`operator.defaultRuntime`, `driver.rdma.useHostMofed`, `toolkit.version`, `devicePlugin.config`, `dcgmExporter.serviceMonitor`, `gfd`, `migManager`, `psp`), node label `nvidia.com/gpu.present=true`, NGC `$oauthtoken` auth pattern, and time-slicing ConfigMap schema (`renameByDefault`, `failRequestsGreaterThanOne`, `resources[].replicas`) all match official documentation and the v23.9.0 chart values.

## Review Notes
- The example driver version `535.104.12` is presented as a user-pinnable placeholder; specific NVIDIA driver patch versions vary (e.g., 535.104.05, 535.129.03 were widely shipped). Readers should pin to a version that matches their kernel/CUDA needs.
- `kubectl wait pod/cuda-vector-add --for=condition=Succeeded --timeout=60s` works in practice in many tutorials but is technically imprecise: "Succeeded" is a Pod *phase*, not a standard Pod *condition*. The fully correct form on kubectl 1.31+ is `--for=jsonpath='{.status.phase}'=Succeeded`. Left as-is because it is a widely used idiom and the post's intent is clear.
- The label value `accelerator=nvidia-tesla-a100` uses the legacy "Tesla" branding (retired by NVIDIA around 2020). The A100 is officially just "NVIDIA A100", but the `accelerator` label value is informational and many fleets still use the `nvidia-tesla-*` convention.
- The validation manifest URL `https://raw.githubusercontent.com/NVIDIA/gpu-operator/main/tests/gpu-test.yaml` is illustrative; readers may need to substitute the current sample workload (e.g., a `cuda-vector-add` pod from the k8s-device-plugin repo) if that path moves.
- GPU Operator v23.9.0 is now several minor versions behind the latest release line; the chart and component versions cited (toolkit v1.14.3, devicePlugin v0.14.1, dcgm-exporter 3.2.5-3.1.8, gfd v0.8.1) are version-consistent with v23.9.0 but readers running on newer Kubernetes (1.29+) may want to bump to a more recent GPU Operator release.
- The `psp:` field in the chart was relevant up to chart releases targeting Kubernetes < 1.25. In newer GPU Operator chart versions this field has been removed since PSPs no longer exist.
- The kernel "4.15+" prerequisite is a reasonable floor; the actual kernel requirement is dictated by the NVIDIA driver branch chosen (some recent driver branches require more recent kernels for kernel-module compatibility).
