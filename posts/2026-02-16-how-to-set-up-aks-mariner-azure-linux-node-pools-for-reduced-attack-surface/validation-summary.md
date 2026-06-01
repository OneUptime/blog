# Validation Summary: How to Set Up AKS Mariner (Azure Linux) Node Pools for Reduced Attack Surface

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Linux Container Host / CBL-Mariner
- AKS node pools and OS SKUs
- Kubernetes scheduling, node selectors, cordon, and drain
- Azure CLI
- Kubernetes CLI (`kubectl`)
- NVIDIA GPU node pools on AKS

## Sources Consulted
- Microsoft Learn: What is the Azure Linux Container Host for AKS? https://learn.microsoft.com/en-us/azure/azure-linux/intro-azure-linux
- Microsoft Learn: Quickstart - Deploy an Azure Linux Container Host for AKS cluster by using the Azure CLI https://learn.microsoft.com/en-us/azure/azure-linux/quickstart-azure-cli
- Microsoft Learn: Create node pools in Azure Kubernetes Service (AKS) https://learn.microsoft.com/en-us/azure/aks/create-node-pools
- Microsoft Learn: Use labels in an Azure Kubernetes Service (AKS) cluster https://learn.microsoft.com/en-us/azure/aks/use-labels
- Microsoft Learn: Autoupgrade node OS images https://learn.microsoft.com/en-us/azure/aks/auto-upgrade-node-os-image
- Microsoft Learn: Automatically upgrade an Azure Kubernetes Service (AKS) cluster https://learn.microsoft.com/en-us/azure/aks/auto-upgrade-cluster
- Microsoft Learn: Azure Linux Container Host support lifecycle https://learn.microsoft.com/en-us/azure/azure-linux/support-cycle
- Microsoft Learn: Azure Linux Container Host package upgrade troubleshooting https://learn.microsoft.com/en-us/azure/azure-linux/troubleshoot-packages
- Microsoft Learn: Use GPUs on Azure Kubernetes Service (AKS) https://learn.microsoft.com/en-us/azure/aks/use-nvidia-gpu
- Kubernetes Documentation: Debug running pods and nodes with `kubectl debug` https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes Documentation: `kubectl drain` reference https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- Updated the opening claim from "Most AKS clusters run Ubuntu" to "Many existing AKS clusters run Ubuntu" because Azure Linux is now the default Azure Linux generation for newer AKS versions and the original wording was too broad.
- Changed CBL-Mariner from an "internal" distribution to an open-source Microsoft distribution, matching Microsoft documentation.
- Replaced the unsupported "30-40% smaller" and "~250 packages" claims with Microsoft-documented guidance that Azure Linux has about 500 packages and can use up to 5 GB less disk space on AKS.
- Updated prerequisites from Azure CLI 2.50 to 2.61 because the corrected `SecurityPatch` node OS upgrade channel requires Azure CLI 2.61 or later.
- Added the Azure Linux 2.0 retirement and Azure Linux 3.0 default-generation caveat for AKS 1.32 and later.
- Replaced deprecated `agentpool` scheduling examples with the current AKS reserved label `kubernetes.azure.com/agentpool`.
- Corrected workload verification guidance so it no longer assumes the node pool name appears in `kubectl get pods -o wide` output.
- Replaced `tdnf` package-management examples with `dnf`, consistent with current Azure Linux 3.0 documentation.
- Replaced the legacy `--auto-upgrade-channel node-image` guidance with `--node-os-upgrade-channel SecurityPatch` and explained when `NodeImage` is appropriate.
- Removed precise running-service and kernel-hardening details that were not supported by current official documentation, replacing them with Microsoft-documented hardened-kernel and validation language.
- Corrected the GPU section to state that the NVIDIA device plugin is still required unless another supported option such as the NVIDIA GPU Operator is used, and added the documented Azure Linux GPU limitation that automatic security patches are not applied.

## Review Notes
Azure CLI and `kubectl` were not installed in the local environment, so command validation was performed against Microsoft Learn and Kubernetes reference documentation instead of local `--help` output.
