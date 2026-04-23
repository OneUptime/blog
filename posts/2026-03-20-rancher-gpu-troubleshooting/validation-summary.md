# Validation Summary: How to Troubleshoot GPU Issues in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher / RKE2
- Kubernetes
- NVIDIA GPU Operator
- NVIDIA drivers
- NVIDIA Container Toolkit
- CUDA
- DCGM Exporter
- Helm
- `kubectl`
- `jq`

## Sources Consulted
- RKE2 GPU Operators: https://docs.rke2.io/add-ons/gpu_operators
- NVIDIA GPU Operator Getting Started: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html
- NVIDIA GPU Operator Troubleshooting: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/troubleshooting.html
- Kubernetes Schedule GPUs: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- NVIDIA container image flavors: https://nvidia.github.io/container-wiki/toolkit/container-images.html
- NVIDIA CUDA Toolkit release notes and compatibility matrix: https://docs.nvidia.com/cuda/cuda-toolkit-release-notes/
- Helm `upgrade` reference: https://helm.sh/docs/v3/helm/helm_upgrade

## Issues Found
- The CUDA debug commands used `kubectl run --limits=...`, but current `kubectl run` does not document or support a `--limits` flag. I replaced those examples with documented `--overrides` usage so the pod spec actually requests `nvidia.com/gpu: 1`.
- The driver log example targeted the driver pod without naming a container. NVIDIA’s current troubleshooting docs show the driver daemonset uses named containers such as `nvidia-driver-ctr` and `k8s-driver-manager`, so I updated the commands to fetch the correct logs.
- The device-plugin and DCGM examples relied on hard-coded `app=...` label selectors that are not documented in the current GPU Operator references. I replaced them with name-based selection and service-based port forwarding so the commands match the operand names documented by NVIDIA and RKE2.
- The node allocatable examples used a `custom-columns` expression for the `nvidia.com/gpu` map key. I replaced that with documented JSONPath syntax, which is the supported way to address keys containing `.` and `/`.
- The `jq` example for listing GPU consumers could emit duplicate rows or behave poorly for pods with multiple containers. I rewrote it to emit one row per pod with a filtered list of GPU-consuming containers.
- The post said to check the CUDA version required by an image using `nvcc --version`. NVIDIA documents that `base` images contain only the minimum runtime pieces and not the full compiler toolchain, so `nvcc` is not a reliable check for arbitrary workload images. I changed this to inspect the workload image tag and compare it with NVIDIA’s compatibility matrix.
- The Helm example pinned a specific release name and driver version that may not match the installed chart release or the operator’s supported driver matrix. I replaced those literals with placeholders so the command remains correct across real installations.

## Review Notes
- The post is technically relevant and suitable for publication after the command corrections above.
- The examples assume the common/default GPU Operator target namespace of `gpu-operator`. NVIDIA documents that the namespace is configurable.
- For Rancher/RKE2 specifically, the current RKE2 docs note that older GPU Operator setups may still require `runtimeClassName: nvidia`, while newer CDI-based releases do not. The post now aligns with current operator behavior, but that version caveat is still worth keeping in mind.
