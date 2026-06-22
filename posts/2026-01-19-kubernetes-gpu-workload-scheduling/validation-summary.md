# Validation Summary: How to Schedule GPU Workloads in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes GPU scheduling
- NVIDIA Device Plugin for Kubernetes
- NVIDIA Container Toolkit
- NVIDIA GPU Feature Discovery
- NVIDIA Multi-Instance GPU (MIG)
- NVIDIA GPU time-slicing
- NVIDIA DCGM Exporter
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Helm
- PyTorch CUDA workloads

## Sources Consulted
- Kubernetes official documentation: Schedule GPUs - https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- NVIDIA Container Toolkit official installation guide - https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA k8s-device-plugin official repository and documentation - https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA GPU Feature Discovery documentation - https://github.com/NVIDIA/k8s-device-plugin/blob/main/docs/gpu-feature-discovery/README.md
- NVIDIA MIG Support in Kubernetes documentation - https://docs.nvidia.com/datacenter/cloud-native/kubernetes/latest/index.html
- NVIDIA GPU Operator time-slicing documentation - https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html
- NVIDIA GPU Telemetry documentation for Kubernetes - https://docs.nvidia.com/datacenter/cloud-native/gpu-telemetry/latest/integrating-telemetry-kubernetes.html
- NVIDIA DCGM Exporter documentation - https://docs.nvidia.com/datacenter/cloud-native/gpu-telemetry/latest/dcgm-exporter.html

## Issues Found
- The NVIDIA Container Toolkit installation used the deprecated `apt-key` repository setup and the older distribution-specific list URL. Updated it to NVIDIA's current signed keyring and stable Debian repository setup.
- The static NVIDIA device plugin DaemonSet used `nvcr.io/nvidia/k8s-device-plugin:v0.14.3`, which is older than the current documented release. Updated it to `v0.17.1`.
- The device plugin verification command only checked the `kube-system` DaemonSet label, which does not match the Helm namespace install shown immediately above it. Changed it to list matching device plugin pods across namespaces.
- The time-slicing pod comment described the request as "1/4 of a GPU." NVIDIA documents time-slicing replicas as shared access slots, not guaranteed fractional compute or memory isolation. Updated the comment to avoid implying a fixed fraction.
- The MIG device plugin ConfigMap used unsupported `sharing.mig.resources` and `rename` fields. Replaced it with the supported `flags.migStrategy: mixed` configuration for exposing profile-specific MIG resources such as `nvidia.com/mig-1g.5gb`.
- The GPU Feature Discovery label list included deprecated CUDA driver/runtime label names. Replaced them with the current `cuda.driver-version.*` and `cuda.runtime-version.*` labels.
- The DCGM Exporter DaemonSet used `nodeSelector: nvidia.com/gpu: "true"`, which is not a standard label from the NVIDIA device plugin or GFD. Replaced it with node affinity requiring the GFD `nvidia.com/gpu.product` label.

## Review Notes
- YAML code blocks were parsed successfully after the corrections.
- GPU examples were reviewed for API shape and documented behavior, but not run against a live GPU Kubernetes cluster.
- The post uses example CUDA and PyTorch image versions; these are syntactically valid examples, but production users should select images that match their driver and CUDA compatibility requirements.
