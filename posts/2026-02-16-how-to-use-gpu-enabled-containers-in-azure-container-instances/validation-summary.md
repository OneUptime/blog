# Validation Summary: How to Use GPU-Enabled Containers in Azure Container Instances

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Container Instances
- Azure CLI
- Azure Resource Manager / ACI YAML
- NVIDIA CUDA
- PyTorch
- TensorFlow
- Docker

## Sources Consulted
- Microsoft Learn: Deploy container instances that use GPU resources - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-gpu
- Microsoft Learn: YAML reference for Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-reference-yaml
- Microsoft Learn: Resource availability and quota limits for Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits
- Microsoft Learn: Azure CLI `az container` reference - https://learn.microsoft.com/en-us/cli/azure/container?view=azure-cli-latest

## Issues Found
- Azure Container Instances GPU resources are retired. Microsoft Learn states that this product is retired as of July 14, 2025, so a February 16, 2026 tutorial that presents GPU-enabled ACI as a deployable option is materially outdated.
- The listed GPU SKUs are outdated. Current Microsoft documentation for ACI GPU resources only documents V100; K80 and P100 were retired earlier, and the ACI GPU resource itself is now retired.
- The Azure CLI example uses `--gpu-count` and `--gpu-sku`, but the current official `az container create` reference does not list these options. Microsoft documentation shows GPU resources being specified through YAML or ARM template examples instead.
- The batch cleanup example uses `az container wait --created`, but the current official `az container` command reference does not list an `az container wait` command.
- The Docker guidance says NVIDIA CUDA base images include the necessary drivers. Microsoft documentation says ACI GPU container instances were pre-provisioned with NVIDIA CUDA drivers and container runtimes; CUDA images provide CUDA user-space libraries, not the host GPU driver.
- The Docker examples use CUDA 12.1 and TensorFlow 2.15 GPU images, while Microsoft documentation for ACI GPU resources says support is up through CUDA 11 at this stage.

## Review Notes
The post is technical, but its central premise is no longer valid for current Azure Container Instances usage. Because the product feature is retired and the tutorial is dated after the retirement date, the post should be removed or replaced with guidance for a supported GPU container platform such as Azure Kubernetes Service.
