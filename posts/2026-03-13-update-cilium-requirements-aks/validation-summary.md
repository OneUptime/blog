# Validation Summary: Update Cilium Requirements on AKS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI and Azure CNI Overlay
- Azure CNI Powered by Cilium
- Cilium
- Kubernetes
- Azure CLI
- kubectl
- eBPF

## Sources Consulted
- Microsoft Learn: Bring Your Own Container Network Interface (CNI) Plugin with Azure Kubernetes Service (AKS), https://learn.microsoft.com/en-us/azure/aks/use-byo-cni
- Microsoft Learn: Configure Azure CNI Powered by Cilium in Azure Kubernetes Service (AKS), https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Microsoft Learn: Configure kubenet networking in Azure Kubernetes Service (AKS), https://learn.microsoft.com/en-us/azure/aks/configure-kubenet
- Microsoft Learn: az aks nodepool CLI reference, https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Microsoft Learn: Upgrade Operating System (OS) Version in Azure Kubernetes Service (AKS) Clusters, https://learn.microsoft.com/en-us/azure/aks/upgrade-os-version
- Cilium documentation: System Requirements, https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium documentation: Azure CNI (Legacy), https://docs.cilium.io/en/stable/installation/cni-chaining-azure-cni.html
- Cilium documentation: Cilium Quick Installation, https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium documentation: Helm values, https://docs.cilium.io/en/stable/helm-values/

## Issues Found
- The post stated that L7 policy and kube-proxy replacement need kernel 5.3+. Current Cilium stable documentation lists Linux kernel 5.10 or an equivalent vendor kernel as the baseline for Cilium 1.19, so the kernel guidance was updated.
- The compatibility matrix described "Azure CNI + Cilium" as standalone CNI. Official Cilium and AKS docs distinguish standalone Cilium on AKS via BYO CNI (`--network-plugin none`) from Azure CNI chaining, so the matrix was corrected.
- The matrix listed Azure CNI Overlay + Cilium as a separate supported mode without clarifying managed AKS Cilium. It now refers to Azure CNI Overlay Powered by Cilium as the managed AKS option.
- The AKS network checks verified `networkPluginMode` but did not verify `networkDataplane`. Microsoft documentation uses `networkProfile.networkDataplane=cilium` and the `--network-dataplane cilium` flag for Azure CNI Powered by Cilium, so the queries were updated.
- The matrix said kubenet + Cilium is not recommended but did not mention kubenet's retirement. Microsoft documentation says kubenet for AKS retires on March 31, 2028, so that caveat was added.
- The node pool example pinned Kubernetes `1.29.0`, which may be unsupported depending on current AKS region and support policy. It was replaced with `<supported-aks-version>`.
- The post listed fixed Cilium minimum CPU and memory requests/limits. The official Cilium Helm chart currently defaults `resources` for the cilium-agent to `{}`, so the resource guidance was corrected to advise explicit sizing.

## Review Notes
The Azure CLI and kubectl command shapes are valid, but the Azure CLI was not installed in this workspace, so local `az --help` verification was unavailable. Commands were checked against Microsoft Learn CLI documentation instead.
