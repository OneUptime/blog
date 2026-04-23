# Validation Summary: How to Configure GPU Time-Slicing in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher / RKE2
- Kubernetes
- NVIDIA GPU Operator
- NVIDIA GPU time-slicing
- NVIDIA MIG
- Helm
- kubectl
- nvidia-smi

## Sources Consulted
- NVIDIA GPU Operator, "Time-Slicing GPUs in Kubernetes" - https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/25.3.4/gpu-sharing.html
- NVIDIA GPU Operator, "Installing the NVIDIA GPU Operator" - https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html
- NVIDIA Multi-Instance GPU User Guide, "Supported GPUs" - https://docs.nvidia.com/datacenter/tesla/mig-user-guide/supported-gpus.html
- Kubernetes, "Schedule GPUs" - https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- SUSE RKE2, "GPU Operators" - https://documentation.suse.com/cloudnative/rke2/latest/en/add-ons/gpu_operators.html
- NVIDIA Triton Inference Server, "Model Repository" - https://docs.nvidia.com/deeplearning/triton-inference-server/archives/triton-inference-server-2380/user-guide/docs/user_guide/model_repository.html
- NVIDIA System Management Interface (`nvidia-smi`) - https://docs.nvidia.com/deploy/nvidia-smi

## Issues Found
- The comparison table said MIG was limited to A100 and H100 only. Updated it to reflect current NVIDIA guidance: MIG applies to Ampere+ MIG-capable GPUs rather than only those two models.
- The Step 3 verification command used a brittle `custom-columns` lookup for `nvidia.com/gpu`. Replaced it with a `jsonpath` command that reliably reads `status.allocatable`.
- The Step 4 workload examples used `nvcr.io/nvidia/tritonserver:23.09-py3` without a model repository or `--model-repository` argument, which would not run as shown. Replaced those examples with NVIDIA's documented CUDA sample pattern that continuously exercises the GPU and works as a validation workload.
- The workload examples assumed namespaces that were never created. Added the namespace creation commands so the manifests can be applied as written.
- The validation text overstated placement guarantees by implying the workloads would always share the same physical GPU. Narrowed the wording to the supported case: both deployments are pinned to `gpu-node-01`, and they share the GPU when that node has a single physical GPU with time-slicing replicas configured.
- The monitoring section attempted to run `nvidia-smi dmon` inside the DCGM exporter pod. Replaced it with node-level `nvidia-smi dmon` and `nvidia-smi pmon` commands, and clarified that DCGM exporter metrics remain aggregate under time-slicing.

## Review Notes
- Current NVIDIA GPU Operator docs still support configuring time-slicing through `devicePlugin.config`. If users modify the ConfigMap later, NVIDIA notes that the operator does not automatically reload it; the device plugin DaemonSet must be restarted.
- On newer RKE2 / GPU Operator releases that use CDI, workloads generally do not need `runtimeClassName: nvidia`; older RKE2 / GPU Operator combinations may still require it.
