# Validation Summary: How to Configure NVIDIA GPU Support in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Rancher Kubernetes Engine 2 (RKE2)
- Kubernetes
- NVIDIA GPU Operator
- NVIDIA Container Toolkit
- Node Feature Discovery (NFD)
- Helm
- DCGM Exporter
- PyTorch

## Sources Consulted
- NVIDIA GPU Operator getting started: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html
- NVIDIA GPU Operator CDI and NRI support: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/cdi.html
- NVIDIA GPU Operator platform support and lifecycle: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/platform-support.html
- RKE2 GPU Operators documentation: https://documentation.suse.com/cloudnative/rke2/latest/en/add-ons/gpu_operators.html
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes RuntimeClass documentation: https://kubernetes.io/docs/concepts/containers/runtime-class/
- Node Feature Discovery operator deployment reference: https://kubernetes-sigs.github.io/node-feature-discovery/master/deployment/operator.html
- PyTorch Docker image tags: https://hub.docker.com/r/pytorch/pytorch/tags

## Issues Found
- The post pinned NVIDIA GPU Operator `v23.9.0`, which is end-of-support according to NVIDIA's current lifecycle table. I updated the install command to the supported `v26.3.1` release and added `--wait`.
- The install step treated older runtime wiring as current practice. I updated the command to enable `cdi.nriPluginEnabled=true`, which matches NVIDIA's current guidance for Rancher/RKE2-style environments and removes the need for `runtimeClassName: nvidia`.
- Because the updated install path uses the NRI plugin, I added the corresponding containerd prerequisite from NVIDIA's CDI/NRI documentation (`v1.7.30+`, `v2.1.x`, or `v2.2.x`).
- The node-labeling step manually set `nvidia.com/gpu.present=true`. That label is operator-managed GPU Feature Discovery output, not a label users should pre-seed. I replaced it with an optional custom scheduling label (`accelerator=nvidia-gpu`).
- The Node Feature Discovery section contained an outdated and invalid `NodeFeatureDiscovery` custom resource example and implied manual NFD setup was required. I replaced it with verification steps that match current GPU Operator behavior, where NFD is deployed automatically by default.
- The expected pod names in the verification section did not match current GPU Operator pod names. I corrected them to the current daemonset-style names and added `gpu-feature-discovery`.
- The GPU test pod used a generic CUDA image and `nvidia-smi` command. I replaced it with NVIDIA's documented `cuda-vectoradd` sample so the verification flow matches the official GPU Operator guide.
- The workload example would not run as written because `train.py` was not provided in the image or manifest. It also requested two GPUs without configuring a real multi-GPU training workflow, and it depended on the outdated runtime-class and node-label pattern. I replaced it with a runnable PyTorch job that performs a short CUDA-backed training loop on one GPU.

## Review Notes
- The post remains technically relevant and publishable after correction.
- The prerequisites remain broadly valid, but NVIDIA's supported OS, driver, Kubernetes, GPU, and container-runtime matrices change over time; future refreshes should re-check the GPU Operator platform support page before updating pinned versions.
- On clusters where Node Feature Discovery is already installed separately, NVIDIA recommends disabling the operator-managed NFD deployment during installation to avoid running multiple NFD instances.
