# Validation Summary: How to Set Up GPU Time-Slicing and MIG Partitioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- NVIDIA GPU Operator
- NVIDIA Kubernetes Device Plugin
- NVIDIA MIG
- NVIDIA DCGM Exporter
- Helm
- Prometheus

## Sources Consulted
- NVIDIA GPU Operator documentation: Time-Slicing GPUs in Kubernetes: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/25.3.4/gpu-sharing.html
- NVIDIA GPU Operator documentation: GPU Operator with MIG: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-mig.html
- NVIDIA Kubernetes Device Plugin documentation: https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA Multi-Instance GPU User Guide: Getting Started with MIG: https://docs.nvidia.com/datacenter/tesla/mig-user-guide/getting-started-with-mig.html
- NVIDIA Multi-Instance GPU User Guide: Supported MIG Profiles: https://docs.nvidia.com/datacenter/tesla/mig-user-guide/supported-mig-profiles.html
- NVIDIA DCGM Exporter documentation: https://docs.nvidia.com/datacenter/dcgm/latest/gpu-telemetry/dcgm-exporter.html
- Kubernetes Resource Management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/

## Issues Found
- The post stated that MIG is only available on A100, A30, and H100 GPUs. Updated this to describe MIG as available on select MIG-capable NVIDIA GPUs, including those models and newer supported GPUs.
- The MIG verification command used `nvidia-smi -L` with an output comment that does not match how MIG mode is normally verified. Updated it to query `mig.mode.current`.
- The manual `nvidia-smi mig -cgi` examples used profile ID `9` for A100 `1g.5gb`; NVIDIA documents A100 `1g.5gb` as profile ID `19`. Updated the examples.
- The loop for creating seven `1g.5gb` MIG instances attempted to create seven instances seven times per GPU. Simplified it to one create command per GPU.
- The GPU Operator MIG ConfigMaps used the wrong data key. NVIDIA requires custom MIG ConfigMaps to contain `config.yaml`; updated both MIG ConfigMaps and included an `all-disabled` profile.
- The GPU Operator MIG command configured `devicePlugin.config.name` instead of `migManager.config.name`. Updated the command and added the node label required for MIG Manager to apply the profile.
- The time-slicing ConfigMap did not set a default config key for cluster-wide application. Updated the ConfigMap to use `any`, added `flags.migStrategy: none`, and set `devicePlugin.config.default=any`.
- The inference Deployment claimed 14 replicas could run on seven `1g.5gb` MIG instances. Corrected it to seven replicas.
- The DCGM Exporter install command used the wrong Helm repository/chart for the standalone exporter. Updated it to use the official `gpu-helm-charts/dcgm-exporter` repository.
- The PromQL examples used non-standard MIG labels such as `gpu_instance_id`. Updated them to use DCGM Exporter's `GPU_I_ID` label and changed the MIG utilization metric to `DCGM_FI_PROF_GR_ENGINE_ACTIVE`.
- The high-memory alert compared used memory to free memory, which does not represent percentage used. Updated the expression to divide used memory by total memory.
- The switch-back procedure disabled MIG directly with `nvidia-smi` while the post otherwise used GPU Operator MIG Manager. Updated it to apply the `all-disabled` MIG Manager profile and restore the time-slicing default.

## Review Notes
The examples remain hardware- and driver-dependent. MIG profile names and counts vary by GPU model, and production clusters should drain GPU workloads before changing MIG mode or MIG geometry.
