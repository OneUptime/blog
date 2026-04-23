# Validation Summary: How to Configure MIG (Multi-Instance GPU) in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher-managed Kubernetes clusters
- NVIDIA Multi-Instance GPU (MIG)
- NVIDIA A100 and H100 GPUs
- NVIDIA GPU Operator
- `nvidia-smi`
- Kubernetes Pods and resource requests
- NVIDIA k8s-device-plugin

## Sources Consulted
- NVIDIA GPU Operator MIG documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-mig.html
- NVIDIA GPU Operator installation/reference values: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html
- NVIDIA Multi-Instance GPU User Guide, Getting Started: https://docs.nvidia.com/datacenter/tesla/mig-user-guide/590/getting-started-with-mig.html
- NVIDIA Multi-Instance GPU User Guide, Supported GPUs: https://docs.nvidia.com/datacenter/tesla/mig-user-guide/supported-gpus.html
- NVIDIA Multi-Instance GPU User Guide, Supported MIG Profiles: https://docs.nvidia.com/datacenter/tesla/mig-user-guide/supported-mig-profiles.html
- NVIDIA `nvidia-smi` command reference: https://docs.nvidia.com/deploy/nvidia-smi/
- NVIDIA k8s-device-plugin repository: https://github.com/NVIDIA/k8s-device-plugin

## Issues Found
- The post used `nvidia-smi --mig-enable`, but NVIDIA documents MIG enablement as `nvidia-smi -i <gpu> -mig 1`. I updated the command and made the reboot conditional because a reboot is only needed in some pending-enable scenarios.
- The heading for the A100 80GB profile table implied a complete list, but NVIDIA documents additional supported profiles on A100 80GB. I changed the heading to "Common MIG Profiles Available on A100 80GB" so the table is no longer misleading.
- The GPU Operator values example used an incorrect top-level `migStrategy` field and an unrelated `devicePlugin.config` block. I corrected the example to use the documented `mig.strategy` field and kept the `migManager.config.name` reference for the custom ConfigMap.
- The guide defined `mig-config.yaml` but did not include a command to create the ConfigMap in the cluster. I added `kubectl apply -f mig-config.yaml`.
- The node-labeling step omitted `--overwrite`, which would fail on GPU Operator deployments where nodes already carry the default `nvidia.com/mig.config=all-disabled` label. I added `--overwrite`.
- The workload example requested `nvidia.com/mig-*` resources without clarifying that these resource names are exposed with the `mixed` MIG strategy. I added that clarification.
- The final log command was replaced with the selector-based command shown in NVIDIA's GPU Operator MIG documentation for the MIG Manager pod.

## Review Notes
- GPU Operator v26.3.0 and later can auto-generate per-node MIG ConfigMaps for standard profiles. The custom ConfigMap approach shown in the post remains valid when you need custom geometry.
- Manually created MIG geometry from `nvidia-smi mig -cgi ...` is not persistent across GPU or system resets; in Kubernetes deployments, MIG Manager is the better long-term way to keep geometry consistent.
