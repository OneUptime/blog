# Validation Summary: Validate Azure CNI Legacy Chaining with Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Azure Kubernetes Service (AKS)
- Azure CNI
- CNI chaining
- eBPF network policy

## Sources Consulted
- Cilium documentation: CNI Chaining, https://docs.cilium.io/en/stable/installation/cni-chaining/
- Cilium documentation: Azure CNI (Legacy), https://docs.cilium.io/en/stable/installation/cni-chaining-azure-cni/
- Cilium documentation: Kubernetes Network Policy, https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium documentation: Layer 3 Policies, https://docs.cilium.io/en/stable/security/policy/layer3.html
- Cilium command reference, https://docs.cilium.io/en/stable/cmdref/
- Microsoft Learn: AKS CNI networking overview, https://learn.microsoft.com/en-us/azure/aks/concepts-network-cni-overview

## Issues Found
- The post expected `cni-chaining-mode` to be `azure-vnet`. Current Cilium Azure CNI legacy chaining documentation uses `generic-veth`, with Azure CNI configured as the first plugin in the chained CNI configuration. Updated the expected value.
- The post suggested checking `.data.ipam` for delegated IPAM. That is not the documented validation for Azure CNI legacy chaining; the CNI conflist delegates IPAM to Azure CNI via `azure-vnet-ipam`. Updated the command to inspect the `cni-configuration` ConfigMap.
- The CNI config check referenced a fixed `05-cilium.conf` file, but the documented setup installs a chained conflist. Updated the commands to list and inspect the active `.conflist` files on the host.
- The post used `cilium policy get`, which is not part of the current documented Cilium CLI command reference. Updated the validation command to inspect the `CiliumNetworkPolicy` Kubernetes resource.
- The post used `kubectl get ippools`, which is not the precise Cilium Pod IP pool resource name. Updated it to `kubectl get ciliumpodippools.cilium.io`.
- The best-practice note implied full L7 support in chaining mode. Cilium documents that advanced features such as Layer 7 Policy may be limited when chaining with other CNI plugins. Updated the note to recommend verifying support for the deployed Cilium version.

## Review Notes
The post is technically relevant and accurate after the corrections. The policy YAML matches Cilium's documented L3 ingress policy structure. The guide remains version-sensitive because Cilium's Azure CNI legacy chaining path is explicitly documented as an alternative legacy deployment model, while AKS generally recommends newer CNI options for most clusters.
