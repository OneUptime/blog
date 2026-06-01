# Validation Summary: How to Run Azure Kubernetes Service on Azure Stack HCI for Edge Workloads

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service enabled by Azure Arc
- Azure Local, formerly Azure Stack HCI
- Azure Arc Resource Bridge
- Azure CLI and `az aksarc`
- Kubernetes manifests and `kubectl`
- Azure Arc GitOps with Flux v2
- Azure Monitor Container Insights

## Sources Consulted
- Microsoft Learn: What is AKS enabled by Azure Arc? https://learn.microsoft.com/en-us/azure/aks/aksarc/aks-overview
- Microsoft Learn: AKS on Azure Local architecture. https://learn.microsoft.com/en-us/azure/aks/aksarc/cluster-architecture
- Microsoft Learn: Azure CLI `az aksarc` reference. https://learn.microsoft.com/en-us/cli/azure/aksarc
- Microsoft Learn: Azure CLI `az aksarc nodepool` reference. https://learn.microsoft.com/en-us/cli/azure/aksarc/nodepool
- Microsoft Learn: Azure CLI `az k8s-configuration flux` reference. https://learn.microsoft.com/en-us/cli/azure/k8s-configuration/flux
- Microsoft Learn: Azure Arc-enabled Kubernetes extensions. https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/extensions
- Microsoft Learn: Enable monitoring for Arc-enabled Kubernetes clusters. https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-monitoring-enable-arc
- Microsoft Learn: Azure Local release information and end of support notes. https://learn.microsoft.com/en-us/azure/azure-local/release-information-23h2

## Issues Found
- The original post used the older `AksHci` PowerShell host-management flow and described an AKS host management cluster. Current AKS on Azure Local uses AKS enabled by Azure Arc with Arc Resource Bridge, custom locations, logical networks, and `az aksarc`; the architecture and deployment steps were updated accordingly.
- The prerequisites said Azure Stack HCI 22H2 or later. Azure Stack HCI 22H2 is out of support, and the `AksHci` module does not apply to Azure Local 23H2 and later. The prerequisites now target current Azure Local deployments.
- The workload cluster creation command used outdated `New-AksHciCluster` parameters and a hyphenated cluster name. It was replaced with `az aksarc create`, current flags, and a valid cluster name.
- The post included a fixed VM size table from the older AKS-HCI flow. It now instructs readers to list supported VM sizes with `az aksarc vmsize list` because available sizes depend on the Azure Local environment.
- The kubeconfig command used `Get-AksHciCredential`. It was replaced with `az aksarc get-credentials`.
- The GitOps section manually connected the cluster with `az connectedk8s connect`. AKS Arc clusters on Azure Local are Arc-connected when created, so that command was removed and the Flux v2 configuration was retained.
- The scale and upgrade examples used non-current or incorrect AKS-HCI commands. They were replaced with `az aksarc nodepool scale`, `az aksarc get-upgrades`, and `az aksarc upgrade`.
- Monitoring commands were updated to use the corrected cluster name and resource group variable.

## Review Notes
The Kubernetes Deployment and Service manifests are syntactically valid examples. Real deployments still need a valid image, the referenced `iot-credentials` Secret, and an Azure Local logical network with enough available IP addresses.
