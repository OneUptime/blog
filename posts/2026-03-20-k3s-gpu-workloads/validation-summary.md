# Validation Summary: How to Use K3s with GPU Workloads

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- K3s
- Kubernetes
- NVIDIA Container Toolkit
- NVIDIA k8s-device-plugin
- NVIDIA dcgm-exporter
- k3d
- TensorFlow
- PyTorch
- CUDA

## Sources Consulted
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s server CLI reference: https://docs.k3s.io/cli/server
- Kubernetes GPU scheduling: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.17.3/install-guide.html
- NVIDIA Container Toolkit architecture overview: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/arch-overview.html
- NVIDIA k8s-device-plugin repository: https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA k8s-device-plugin releases: https://github.com/NVIDIA/k8s-device-plugin/releases
- k3d CUDA workloads guide: https://k3d.io/v5.4.2/usage/advanced/cuda/
- NVIDIA dcgm-exporter manifest: https://github.com/NVIDIA/dcgm-exporter/blob/main/dcgm-exporter.yaml
- TensorFlow Docker installation guide: https://www.tensorflow.org/install/docker
- PyTorch Docker image tag reference: https://hub.docker.com/layers/pytorch/pytorch/2.1.0-cuda11.8-cudnn8-runtime/images/sha256-a355f16160f64219173261456bd5a62a8b99c3fb76ee405c7929a2c8df7dfeb3

## Issues Found
- The K3s runtime setup was not aligned with current K3s guidance. The post used `nvidia-ctk runtime configure --runtime=containerd` against the host containerd config and then replaced K3s' generated `config.toml.tmpl` with a handwritten template. K3s now documents automatic NVIDIA runtime detection plus `--default-runtime nvidia`, and warns against copying prerendered containerd configs into the template. The post was updated to use the K3s-supported default-runtime flow.
- The NVIDIA Container Toolkit repository commands were outdated. The post used the older distro-specific `libnvidia-container.list` path; this was updated to the current `stable/deb/nvidia-container-toolkit.list` instructions from NVIDIA.
- The Ubuntu driver example included a hard-coded `nvidia-driver-535` package version. That pin is stale for a 2026 post and can be unavailable depending on distro release, so it was removed in favor of `ubuntu-drivers autoinstall`.
- The NVIDIA device plugin manifest URL was outdated. The post referenced `v0.14.3` and the old root-level manifest path; it was updated to the current static manifest path under `v0.19.0`.
- The k3d section implied that `k3d cluster create --gpus all` is sufficient for CUDA workloads. The official k3d CUDA guide requires a custom K3s image with the NVIDIA runtime installed, so the guidance was corrected.
- The PyTorch Deployment would not run as written because it referenced `/app/inference_server.py`, but the post never created or mounted that file. The Deployment also lacked `template.metadata.labels`, so its selector did not match the pod template. The example was replaced with a self-contained inline Python server and matching labels were added.
- The time-slicing section was incorrect. Applying a standalone `ConfigMap` and restarting the static DaemonSet does not make the static NVIDIA device plugin consume that config. The section was rewritten to use the plugin's Helm chart with `--set-file config.map.config=...`, which is the documented configuration path.
- The dcgm-exporter URL pointed to `deployment/single-pod.yaml`, which no longer exists. It was updated to the current official `dcgm-exporter.yaml` manifest.
- The workload log example was tightened from a label-selector form to `kubectl logs job/cuda-vector-add`, which is the direct current Job form.

## Review Notes
- The TensorFlow and PyTorch image tags used in the examples are valid tag patterns and the examples are syntactically correct after the fixes, but they are older library versions relative to April 29, 2026. They may be worth refreshing in a future content update if the goal is to track current framework releases.
- The existing-cluster K3s example assumes readers merge `default-runtime: nvidia` into their current `/etc/rancher/k3s/config.yaml` instead of overwriting any existing settings.
