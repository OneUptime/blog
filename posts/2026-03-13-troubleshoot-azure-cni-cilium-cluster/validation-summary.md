# Validation Summary: Troubleshoot Azure CNI Cilium Cluster Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Azure Kubernetes Service (AKS)
- Azure CNI powered by Cilium
- Azure CLI
- eBPF

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium debug CLI command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium BPF IPCache command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ipcache_list/
- Cilium operator internals and identity allocation: https://docs.cilium.io/en/stable/internals/cilium_operator/
- Azure CNI powered by Cilium for AKS: https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Azure CLI `az network nic show-effective-route-table`: https://learn.microsoft.com/en-us/cli/azure/network/nic?view=azure-cli-latest#az-network-nic-show-effective-route-table
- Azure Virtual Network MTU documentation: https://learn.microsoft.com/en-us/azure/virtual-network/how-to-virtual-machine-mtu
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The Cilium operator log command used `-l name=cilium-operator`, but Cilium tooling documents `io.cilium/app=operator` as the operator pod selector. Updated the selector to match the documented Cilium operator label.
- The post described KVStore as being used for identity distribution without qualification. Cilium documentation states CRD-backed identity allocation is the default and KVStore is optional. Updated the command comments to check identity allocation mode first and then inspect KVStore status only when relevant.
- The in-pod Cilium troubleshooting commands used `cilium monitor`, `cilium debuginfo`, and `cilium bpf ipcache list`. Current Cilium command references document these agent-local commands under `cilium-dbg`. Updated the examples to use `cilium-dbg monitor`, `cilium-dbg debuginfo`, `cilium-dbg config`, and `cilium-dbg bpf ipcache list`.
- The MTU guidance stated that Azure VNet has a maximum MTU of 1500. Microsoft documentation states 1500 is the default Azure MTU and that larger MTUs are supported only for specific NICs and constrained traffic paths. Updated the comment to describe 1500 as the default rather than a universal maximum.

## Review Notes
The post is technically relevant and the remaining commands and claims are consistent with official Cilium, Kubernetes, Azure CLI, and Microsoft AKS/Azure Virtual Network documentation. In managed AKS clusters using Azure CNI powered by Cilium, direct changes to most `cilium-config` values are not supported; future revisions could call out that MTU checks should generally be used for diagnosis rather than manual ConfigMap edits.
