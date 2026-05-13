# Validation Summary: How to Deploy NVIDIA GPU Operator with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Flux HelmRelease
- Flux HelmRepository
- Flux Kustomization
- Kubernetes
- Kustomize
- Helm
- NVIDIA GPU Operator
- NVIDIA CUDA container images
- NVIDIA Multi-Instance GPU (MIG)
- Node Feature Discovery

## Sources Consulted
- NVIDIA GPU Operator installation documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html
- NVIDIA GPU Operator MIG documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-mig.html
- NVIDIA GPU Operator Helm repository index: https://helm.ngc.nvidia.com/nvidia/index.yaml
- NVIDIA GPU Operator Helm values: https://github.com/NVIDIA/gpu-operator/blob/main/deployments/gpu-operator/values.yaml
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRepository source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Docker Registry API check for the `nvidia/cuda` image tag.

## Issues Found
- The introduction said the guide configures namespace and RBAC prerequisites, but the post does not define RBAC resources and the NVIDIA chart manages its own RBAC. Changed this to namespace and Pod Security Admission prerequisites.
- The namespace example did not include the privileged Pod Security Admission label that NVIDIA documents for clusters using PSA restrictions. Added `pod-security.kubernetes.io/enforce: privileged`.
- The GPU Operator chart version range used `v23.9.*`, which is outdated for a 2026 guide. Updated examples to the current documented `v26.3.*` patch line.
- The sample pod used `nvidia/cuda:12.3-base-ubuntu22.04`, which is not a valid Docker Hub tag. Updated it to `nvidia/cuda:12.3.2-base-ubuntu22.04`, which exists.

## Review Notes
- The Flux `HelmRepository`, `HelmRelease`, and `Kustomization` API versions and fields match current Flux v2 documentation.
- The NVIDIA GPU Operator values shown in the post are valid chart values. Most are defaults, but keeping them explicit is technically correct for a tutorial.
- The local environment did not have `flux` or `kubectl` installed, so CLI command validation was performed against official documentation rather than local `--help` output.
