# Validation Summary: How to Manage GPU Workloads with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- NVIDIA GPU Operator
- NVIDIA Kubernetes Device Plugin
- NVIDIA DCGM Exporter
- Kubernetes ResourceQuota, LimitRange, Jobs, Deployments, node selectors, node affinity, tolerations, and emptyDir volumes

## Sources Consulted
- Kubernetes documentation: Schedule GPUs, https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes documentation: Resource Quotas, https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Argo CD documentation: Sync Options, https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- NVIDIA GPU Operator documentation: Installing the NVIDIA GPU Operator, https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html
- NVIDIA GPU Operator documentation: Time-Slicing GPUs in Kubernetes, https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html
- NVIDIA GPU Operator 23.9.1 platform support documentation, https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/23.9.1/platform-support.html
- NVIDIA GPU Operator Helm chart index and v23.9.1 chart values, https://helm.ngc.nvidia.com/nvidia/
- NVIDIA DCGM Exporter Helm chart index and v3.3.0 chart values, https://nvidia.github.io/dcgm-exporter/helm-charts/

## Issues Found
- The ResourceQuota example included both `requests.nvidia.com/gpu` and `limits.nvidia.com/gpu`. Kubernetes documents that extended resource quotas should use only the `requests.` prefix because overcommit is not allowed for extended resources. Removed `limits.nvidia.com/gpu` from the quota example.

## Review Notes
- The GPU Operator example pins `gpu-operator` to `v23.9.1`, which exists and matches the shown default NVIDIA driver version `535.129.03`, but it is not the latest chart version as of this review. Pinning is technically valid and consistent with the post's recommendation to test upgrades deliberately.
- The time-slicing ConfigMap matches NVIDIA's documented format. In production, the ConfigMap also needs to be referenced by the device plugin or GPU Operator configuration, such as with `devicePlugin.config.name`, before it takes effect.
- The node affinity manifest is a partial Deployment suitable as a Kustomize-style patch, not a complete standalone Deployment manifest.
