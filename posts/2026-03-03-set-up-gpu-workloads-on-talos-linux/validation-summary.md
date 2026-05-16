# Validation Summary: How to Set Up GPU Workloads on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Talos system extensions
- NVIDIA GPU drivers and NVIDIA Container Toolkit
- Kubernetes RuntimeClass
- NVIDIA Kubernetes Device Plugin
- Kubernetes ResourceQuota for extended resources
- NVIDIA DCGM Exporter
- Helm

## Sources Consulted
- Talos Linux NVIDIA GPU documentation: https://www.talos.dev/v1.11/talos-guides/configuration/nvidia-gpu-proprietary/
- Talos Linux NVIDIA GPU OSS driver documentation: https://www.talos.dev/v1.9/talos-guides/configuration/nvidia-gpu/
- Talos Linux system extensions documentation: https://www.talos.dev/v1.9/talos-guides/configuration/system-extensions/
- Sidero Labs system extensions catalog: https://github.com/siderolabs/extensions
- NVIDIA Kubernetes Device Plugin documentation: https://github.com/NVIDIA/k8s-device-plugin
- Kubernetes RuntimeClass documentation: https://kubernetes.io/docs/concepts/containers/runtime-class/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- NVIDIA DCGM Exporter documentation: https://docs.nvidia.com/datacenter/dcgm/latest/gpu-telemetry/dcgm-exporter.html

## Issues Found
- The extension discovery command used `crane ls` against a single old NVIDIA extension image. Updated it to the Sidero-recommended extensions catalog lookup using `crane export ghcr.io/siderolabs/extensions:v<talos-version> | tar x -O image-digests | grep nvidia`.
- The custom installer example used old pre-Talos-1.8 NVIDIA extension names and an incorrect container-toolkit tag pattern. Updated the example to use the current LTS extension naming scheme and separate Talos driver/toolkit version placeholders.
- The upgrade example kept a hard-coded old Talos installer tag. Updated it to use a Talos-version placeholder consistent with the surrounding example.
- The GPU machine settings text called the sysctl a kernel parameter. Updated the wording to describe it as a sysctl.
- The ResourceQuota example specified both `requests.nvidia.com/gpu` and `limits.nvidia.com/gpu`. Kubernetes only supports `requests.` quota entries for extended resources, so the invalid `limits.` entry was removed and the explanatory text was corrected.
- The DCGM Exporter Helm command used a custom namespace without creating it. Added `--create-namespace` so the command works when the `monitoring` namespace does not already exist.

## Review Notes
The core Talos RuntimeClass, NVIDIA module list, NVIDIA device plugin Helm values, Kubernetes GPU limit syntax in pod specs, and DCGM Exporter Helm repository were consistent with the referenced documentation. The post still uses generic placeholders for image versions, so readers must choose extension images that match their Talos release and NVIDIA driver branch.
