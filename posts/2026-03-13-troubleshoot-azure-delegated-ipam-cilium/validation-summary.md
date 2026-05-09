# Validation Summary: Troubleshoot Azure Delegated IPAM with Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Azure Kubernetes Service (AKS)
- Azure CNI powered by Cilium
- Azure Delegated IPAM
- Azure CLI
- eBPF

## Sources Consulted
- Cilium documentation: Azure Delegated IPAM - https://docs.cilium.io/en/latest/network/concepts/ipam/azure-delegated-ipam/
- Cilium documentation: Installation using Azure CNI Powered by Cilium in AKS - https://docs.cilium.io/en/latest/installation/k8s-install-aks/
- Cilium documentation: Azure IPAM - https://docs.cilium.io/en/latest/network/concepts/ipam/azure.html
- Cilium documentation: CNI configuration - https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium command reference: cilium-dbg bpf ipcache list - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ipcache_list/
- Cilium command reference: cilium-dbg endpoint list - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium documentation: CiliumEndpoint CRD - https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Microsoft Learn: Configure Azure CNI Pod Subnet - Dynamic IP Allocation and enhanced subnet support in AKS - https://learn.microsoft.com/en-us/azure/aks/configure-azure-cni-dynamic-ip-allocation
- Microsoft Learn: Azure CLI az network vnet reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet
- Microsoft Learn: Troubleshoot the SubnetIsDelegated error code - https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/error-codes/subnetisdelegated-error

## Issues Found
- The introduction described Cilium as taking over IPAM from Azure CNI. Updated it to reflect Azure CNI powered by Cilium using Azure-allocated pod subnets while the delegated Azure IPAM plugin allocates pod IPs for the Cilium CNI.
- The post used legacy Azure IPAM checks such as `ipam: azure`, Cilium operator logs, and `CiliumNode.status.ipam`. Replaced these with delegated IPAM checks for `ipam: delegated-plugin`, CNI `azure-ipam`, and AKS `NodeNetworkConfig` resources.
- The Azure subnet command comment said it checked available IP count, but `ipConfigurations | length(@)` counts existing IP configurations. Updated the comment to describe the command accurately.
- The post used `cilium bpf ipcache list`, while current Cilium command references document `cilium-dbg bpf ipcache list`. Updated the command.
- The leak-check example compared pods with `CiliumNode.status.ipam.used`, which applies to legacy Azure IPAM behavior rather than delegated IPAM. Replaced it with a comparison between live pod IPs and CiliumEndpoint IPs.
- The remediation step restarted the Cilium operator for reconciliation. Updated it to restart the affected Cilium agent pod, because delegated IPAM allocation is handled by the node-local delegated IPAM/CNI path.
- The sizing guidance said to plan for 2x expected pod count. Updated it to include AKS dynamic IP allocation guidance of at least 16 IPs per node plus headroom.
- The best-practice and conclusion references to CiliumNode IPAM state and Cilium operator logs were updated to NodeNetworkConfig/CiliumEndpoint state and Cilium agent logs.

## Review Notes
The Azure CLI and kubectl commands are syntactically plausible, but exact resource names and file paths can vary by AKS/Cilium packaging. The post now uses the official delegated IPAM concepts and avoids legacy Azure IPAM operator/CiliumNode state as the primary troubleshooting surface.
