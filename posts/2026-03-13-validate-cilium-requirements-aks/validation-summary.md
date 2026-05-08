# Validation Summary: Validate Cilium Requirements on AKS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Azure Kubernetes Service (AKS)
- Azure CNI Powered by Cilium
- Azure CLI
- kubectl
- eBPF
- Azure managed identities and role assignments

## Sources Consulted
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Microsoft Learn, Configure Azure CNI Powered by Cilium in AKS: https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Microsoft Learn, Upgrade operating system versions in AKS: https://learn.microsoft.com/en-us/azure/aks/upgrade-os-version
- Microsoft Learn, Azure CLI az aks reference: https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn, Azure CLI az aks nodepool reference: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Microsoft Learn, Azure CLI az role assignment reference: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Azure IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/azure/

## Issues Found
- Replaced `kubectl version --short` with `kubectl version` because the current Kubernetes command reference lists `kubectl version` and `-o yaml|json`, but not `--short`.
- Removed outdated Cilium Kubernetes version comments. AKS managed Cilium has its own supported Kubernetes-to-Cilium version table, so the post now directs readers to validate against the Azure CNI Powered by Cilium version table and regional AKS versions.
- Updated the AKS version command to avoid depending on a brittle output schema query for `az aks get-versions`.
- Corrected kernel and node OS requirements. Current Cilium documentation recommends Linux kernel 5.10+ or an equivalent vendor kernel, and AKS node OS defaults now include Ubuntu 24.04 for Kubernetes 1.35+ and Azure Linux 3.0 for Kubernetes 1.32+.
- Corrected network configuration guidance. Azure CNI Powered by Cilium supports overlay, pod subnet, and node subnet IP assignment; `networkPluginMode: overlay` applies only to Azure CNI Overlay.
- Softened unsupported VM SKU claims. The original B-series/eBPF map timeout language and D/F/N recommendation were not backed by official AKS or Cilium docs, so the guidance now focuses on sustained production capacity and monitoring.
- Corrected Azure permissions guidance. The original section used the kubelet identity as the primary identity and mentioned ENI mode, which is AWS terminology. It now distinguishes AKS-managed Cilium from standalone Cilium Azure IPAM and checks the cluster managed identity first.
- Updated the Mermaid checklist to remove the outdated Kubernetes `>= 1.21` and kernel `>= 4.19` checks.

## Review Notes
AKS-managed Azure CNI Powered by Cilium does not expose all upstream Cilium configuration options, and Microsoft documents feature limits separately. Future revisions should continue validating version and feature statements against the AKS managed Cilium page because the AKS-supported Cilium version matrix changes over time.
