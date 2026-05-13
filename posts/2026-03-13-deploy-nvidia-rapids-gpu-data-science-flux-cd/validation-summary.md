# Validation Summary: How to Deploy NVIDIA RAPIDS for GPU Data Science with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NVIDIA RAPIDS
- RAPIDS cuDF, cuML, and cuGraph
- NVIDIA GPU Operator and Kubernetes device plugin
- Kubernetes Deployments, Jobs, Services, PersistentVolumeClaims, and GPU resources
- Flux CD v2 Kustomizations
- Kustomize
- JupyterLab

## Sources Consulted
- RAPIDS Kubernetes deployment documentation: https://docs.rapids.ai/deployment/stable/platforms/kubernetes/
- RAPIDS installation and platform support documentation: https://docs.rapids.ai/install/ and https://docs.rapids.ai/platform-support/
- RAPIDS Support Notice RSN 53, Docker image tag consolidation: https://docs.rapids.ai/notices/rsn0053/
- RAPIDS Support Notice RSN 45, cuSpatial package publishing stopped in v25.06: https://docs.rapids.ai/notices/rsn0045/
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- NVIDIA Kubernetes device plugin documentation: https://github.com/NVIDIA/k8s-device-plugin
- Flux Kustomization documentation and API reference: https://fluxcd.io/flux/components/kustomize/kustomizations/ and https://fluxcd.io/flux/components/kustomize/api/v1/
- NVIDIA GPU Operator MIG documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-mig.html

## Issues Found
- The prerequisites said Pascal architecture or newer GPUs were sufficient. RAPIDS 24.02 and later require Volta or newer GPUs with compute capability 7.0+, so the prerequisite was corrected.
- The examples used older RAPIDS 24.04 container tags with a CUDA minor version. Current RAPIDS Docker tags use a CUDA major-version format, so the notebook and base images were updated to `26.04-cuda12-py3.13`.
- The introduction listed cuSpatial as part of the current RAPIDS suite. cuSpatial package publishing stopped in RAPIDS v25.06 and it is no longer in current RAPIDS containers, so it was removed from the current-library list.
- The validation notebook example read `/data/large_dataset.csv`, but the notebook Deployment only mounts persistent storage under `/home/rapids/notebooks/work`. The example paths were updated to match the mounted notebook volume.
- The best-practices image tag example used the old CUDA-minor tag format. It was updated to the current RAPIDS, CUDA major, and Python tag format.

## Review Notes
The Kubernetes API versions, Flux Kustomization fields, GPU resource request pattern, service port-forwarding command, and MIG guidance are consistent with the consulted documentation. The batch Job remains a template and still depends on a `rapids-etl-scripts` ConfigMap and `rapids-data-pvc` PVC that users must provide before running that Job.
