# Validation Summary: Monitor Azure Delegated IPAM with Cilium

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Cilium
- Azure CNI Powered by Cilium
- Azure Kubernetes Service (AKS)
- Azure Delegated IPAM / Azure CNI Pod Subnet
- Kubernetes
- Prometheus Operator
- Azure CLI
- Container Insights

## Sources Consulted
- Cilium Azure Delegated IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/azure-delegated-ipam/
- Cilium IPAM concepts documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium CLI config command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config.html
- Cilium CRD-backed IPAM validation examples: https://docs.cilium.io/en/latest/network/kubernetes/ipam-crd.html
- Azure CNI Powered by Cilium for AKS documentation: https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Azure CNI Pod Subnet dynamic IP allocation documentation: https://learn.microsoft.com/en-us/azure/aks/configure-azure-cni-dynamic-ip-allocation
- Azure CLI `az network vnet subnet` documentation: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Azure Virtual Network subnet troubleshooting documentation: https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-network/virtual-network-troubleshoot-cannot-delete-modify-subnet

## Issues Found
- The introduction described Cilium as directly managing pod IP allocation from delegated subnets. Updated it to describe the delegated IPAM plugin path, consistent with Cilium's Azure Delegated IPAM documentation.
- The verification command searched for `azure-subnet-id`, which applies to legacy Azure IPAM configuration rather than delegated IPAM. Updated the check to look for `ipam` and `local-router-ipv4`, matching delegated IPAM configuration.
- The post used `cilium ipam list`, which is not the documented validation command. Replaced it with `cilium-dbg status --all-addresses`.
- The post inspected `CiliumNode` fields for delegated subnet allocation. Updated the examples to use AKS `NodeNetworkConfig` resources, which Microsoft documents as responsible for Azure CNI dynamic pod subnet IP allocations.
- The Azure CLI subnet query labeled `ipConfigurations | length(@)` as available IPs. Corrected it to `usedIpConfigurations` and included subnet prefixes and delegations.
- The Prometheus examples used non-existent metric names such as `cilium_ipam_ips_total` and `cilium_ipam_allocation_failures_total`. Replaced them with documented Cilium operator IPAM metric names under the `cilium_operator_` namespace and added a caveat that managed AKS environments may need Azure Monitor Subnet IP Usage alerts instead.
- The Azure subnet health section used `az network nic list`, which is less accurate for a specific delegated pod subnet. Replaced it with `az network vnet subnet show --query "ipConfigurations[].id"` for subnet-attached IP configurations.
- The delegation check referred to delegation "to Cilium." Updated the wording to AKS pod subnet delegation.
- The best-practices and conclusion text implied that Cilium metrics alone were authoritative for subnet utilization. Updated those sections to include Azure CNI subnet usage monitoring through Container Insights.

## Review Notes
Prometheus availability depends on how AKS exposes or scrapes the managed Cilium components. For AKS-managed delegated IPAM, Azure Container Insights Subnet IP Usage is the authoritative subnet-utilization view documented by Microsoft.
