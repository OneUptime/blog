# Validation Summary: Validate Azure Delegated IPAM with Cilium

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI Powered by Cilium
- Azure Delegated IPAM
- Kubernetes
- Cilium CLI
- Azure CLI

## Sources Consulted
- Cilium Azure Delegated IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/azure-delegated-ipam/
- Cilium Azure IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/azure/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Microsoft AKS Azure CNI Powered by Cilium documentation: https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Microsoft AKS Azure CNI Pod Subnet documentation: https://learn.microsoft.com/en-us/azure/aks/configure-azure-cni-dynamic-ip-allocation
- Azure CLI `az network vnet subnet list` documentation: https://learn.microsoft.com/en-us/cli/azure/network/vnet

## Issues Found
- The introduction and prerequisites implied Azure Delegated IPAM always means Azure CNI Overlay plus a delegated subnet. Updated this to describe Azure CNI Powered by Cilium generally, and to make the Azure VNet pod subnet prerequisite specific to validating virtual network pod IPs.
- Several validation steps referred to a delegated subnet when the current AKS documentation distinguishes overlay pod CIDRs from virtual network pod subnets. Updated those references to pod subnet or pod CIDR as appropriate.
- The Cilium ConfigMap check used `.data.azure-use-primary-address`, which is not the documented delegated IPAM setting. Updated the check to verify `ipam` and `local-router-ipv4`, matching Cilium's documented `ipam: delegated-plugin` configuration.
- The Cilium IP pool check stated that the absence of `CiliumIPPool` objects proves delegated IPAM is active. Softened the wording because delegated IPAM is confirmed by the Cilium and Azure/AKS allocation state, not solely by the absence of IP pools.
- Step 4 incorrectly used `CiliumNode` as the Azure delegated IPAM source of truth. Replaced it with `NodeNetworkConfig` inspection, which Cilium and AKS documentation identify as the per-node resource created by the AKS control plane for delegated allocation.
- The best-practice note recommended monitoring `CiliumNode` `.status.ipam.used` versus `.spec.ipam.available`, which applies to Cilium Azure IPAM rather than AKS delegated IPAM. Updated it to monitor `NodeNetworkConfig` resources and Azure subnet usage.

## Review Notes
- The `az network vnet subnet list`, `kubectl get pods`, `kubectl run`, and `cilium connectivity test --test` command forms are syntactically valid. The Cilium `--test` values are regular expressions, so the examples should be treated as filters over the current Cilium CLI test scenario names.
- For Azure CNI Overlay clusters, pod IPs are allocated from the configured pod CIDR rather than a VNet pod subnet. The post now frames subnet validation steps as applying to virtual network pod IP mode.
