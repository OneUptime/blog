# Validation Summary: How to Set Up GPU Workloads in Kubernetes for ML/AI

## Status
validated

## Post Type
Tutorial / Guide (hands-on setup walkthrough)

## Technologies Covered
- Kubernetes (Pods, Jobs, Deployments, DaemonSets, node affinity, taints/tolerations)
- NVIDIA drivers and NVIDIA Container Toolkit
- NVIDIA Kubernetes Device Plugin (incl. GPU Feature Discovery)
- NVIDIA Multi-Instance GPU (MIG) and time-slicing
- NCCL / shared memory for multi-GPU training
- PyTorch / torchrun and Kubeflow PyTorchJob
- NVIDIA DCGM Exporter + Prometheus (PromQL, PrometheusRule)
- Managed Kubernetes GPU node pools: AWS EKS (eksctl), GKE (gcloud), Azure AKS (az)
- JupyterHub (Zero-to-JupyterHub Helm chart, KubeSpawner)

## Sources Consulted
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA k8s-device-plugin README & values.yaml: https://github.com/NVIDIA/k8s-device-plugin
- MIG Support in Kubernetes: https://docs.nvidia.com/datacenter/cloud-native/kubernetes/mig-k8s.html
- Time-Slicing GPUs (GPU Operator docs): https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html
- NVIDIA DCGM Exporter Helm charts: https://github.com/NVIDIA/dcgm-exporter
- Bash manual (line continuation / comment behavior) for the CLI snippet corrections

## Issues Found
1. **Outdated/deprecated NVIDIA Container Toolkit repository setup.** The post used the legacy `nvidia.github.io/nvidia-docker` repo together with `apt-key add` (deprecated since Ubuntu 21.04+). Replaced with the current official method that fetches the key from `nvidia.github.io/libnvidia-container/gpgkey`, dearmors it into `/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg`, and adds the `libnvidia-container/stable/deb` repo list with the `signed-by=` flag.

2. **Invalid device-plugin MIG config field.** The MIG ConfigMap declared a `sharing.mig.strategy: single` block that does not exist in the device plugin config schema. MIG strategy is configured only via `flags.migStrategy`. Removed the bogus `sharing.mig` block and kept `flags.migStrategy: single`.

3. **Inconsistent / invalid MIG profile creation command.** The commented `nvidia-smi mig -cgi 9,9,9 -C` used profile 9 (3g.20gb on A100), which both exceeds an A100's 7 GPU slices (3×3=9) and does not match the `nvidia.com/mig-1g.5gb` resource requested in the very next snippet. Changed to `-cgi 1g.5gb,1g.5gb,1g.5gb -C` so the created instances match the requested resource.

4. **Broken bash line continuations in cloud CLI examples.** The `eksctl`, `gcloud`, and `az aks` snippets placed `# inline comments` after line-continuation backslashes (`\   # ...`). In bash the backslash escapes the following space rather than the newline, so the comment terminates the line and truncates the command. Moved the descriptive notes off the continuation lines (into a leading comment, or onto the final non-continued line) so the commands run as intended.

## Review Notes
- The core Kubernetes manifests (GPU Pod/Job/Deployment requesting `nvidia.com/gpu`, `restartPolicy`, node affinity with `nvidia.com/gpu.product`/`nvidia.com/gpu.memory` using `In`/`Gt`, time-slicing ConfigMap, DCGM Exporter Helm install, PromQL/PrometheusRule alerts, JupyterHub `extra_resource_limits`) are all accurate and use current, non-deprecated APIs.
- The Kubeflow `PyTorchJob` example mixes manual `torchrun --nnodes/--node_rank` flags with the PyTorchJob operator (which normally injects `RANK`/`WORLD_SIZE`/`MASTER_ADDR` itself), and the Worker omits `--node_rank` that the Master sets. It is illustrative and not strictly wrong, but a real-world job would typically rely on the operator-injected env vars rather than hard-coded `--nnodes=3`. Left as-is since it conveys the intent; worth simplifying in a future revision.
- The standalone GPU Feature Discovery YAMLs (`NVIDIA/gpu-feature-discovery` v0.8.1) still resolve, but GFD has since been merged into the k8s-device-plugin repo; a future update could point readers at the consolidated device-plugin/GFD deployment.
- Image tags referenced (`k8s-device-plugin:v0.17.1`, `cuda:12.2.0-base-ubuntu22.04`, `pytorch:2.1.0-cuda12.1-cudnn8-runtime`) and the driver-535 → CUDA 12.2 compatibility claim are all valid; these are version-pinned and may simply age over time.
