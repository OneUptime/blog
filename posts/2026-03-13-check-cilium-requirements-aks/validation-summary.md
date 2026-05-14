# Validation Summary: Checking Cilium Requirements for AKS (Azure Kubernetes Service)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Azure Kubernetes Service (AKS)
- Azure CNI
- Azure CLI
- eBPF

## Sources Consulted
- Microsoft Learn: Configure Azure CNI Powered by Cilium in AKS - https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Microsoft Learn: Azure CLI `az aks` reference - https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Azure CLI `az aks nodepool` reference - https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Microsoft Learn: Node images in AKS - https://learn.microsoft.com/en-us/azure/aks/node-images
- Microsoft Learn: Configure kubenet networking in AKS - https://learn.microsoft.com/en-us/azure/aks/configure-kubenet
- Microsoft Learn: Azure CLI `az role assignment` reference - https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Cilium documentation: System Requirements - https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium documentation: Kubernetes Requirements - https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium documentation: Installation using Azure CNI Powered by Cilium in AKS - https://docs.cilium.io/en/stable/installation/k8s-install-aks/
- Cilium documentation: Azure CNI chaining legacy guide - https://docs.cilium.io/en/stable/installation/cni-chaining-azure-cni/

## Issues Found
- The kernel requirements were outdated. The post listed Cilium core support as `4.9.17+`, BPF host routing as `5.10+`, and WireGuard as `5.6+`; current Cilium documentation lists Linux kernel `5.10` or equivalent as the baseline and notes that newer features may require newer kernels. Updated the requirements accordingly.
- The AKS node image guidance referenced Ubuntu 18.04 as a legacy option and implied Ubuntu 22.04 was always the AKS 1.27+ default. Ubuntu 18.04 is retired in AKS, and AKS node image selection now varies by OS SKU, Kubernetes version, VM capabilities, and image release. Updated the post to recommend checking actual node kernel versions and using current AKS Linux node images.
- The supported networking list included `kubenet + Cilium (overlay mode)`, which is not the current documented AKS/Cilium path. Replaced it with AKS BYO CNI with manually installed Cilium, and marked Azure CNI chaining as legacy.
- The standard Azure CNI creation example implied chaining was complete after cluster creation. Added a note that legacy Azure CNI chaining requires additional Cilium chaining configuration after cluster creation.
- The Windows node pool statement was too broad. Updated it to specifically reflect that Azure CNI Powered by Cilium is Linux-only.
- The Azure RBAC requirement was oversimplified as Contributor/Owner or `Microsoft.ContainerService/*`. Clarified that custom roles also need any required network and role-assignment permissions.
- The post-creation validation used `cilium status` without waiting and only checked for Cilium pods. Updated it to use `cilium status --wait` and added an `az aks show` check for `networkProfile.networkDataplane`.
- The summary table used outdated Kubernetes, node OS, kernel, and network plugin requirements. Updated it to align with current AKS managed Cilium and Cilium system requirements.

## Review Notes
Azure CLI is not installed in the local workspace, so CLI flags were validated against official Microsoft Learn CLI documentation rather than local `az --help` output.
