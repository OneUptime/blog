# Validation Summary: Validate Azure CNI with Cilium on AKS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI Powered by Cilium
- Cilium
- Kubernetes
- Azure CLI
- CiliumNetworkPolicy
- eBPF networking

## Sources Consulted
- Microsoft Learn: Configure Azure CNI Powered by Cilium in AKS, https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Cilium documentation: Installation using Azure CNI Powered by Cilium in AKS, https://docs.cilium.io/en/stable/installation/k8s-install-aks/
- Cilium documentation: Azure Delegated IPAM, https://docs.cilium.io/en/latest/network/concepts/ipam/azure-delegated-ipam/
- Cilium command reference: `cilium status`, https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference: `cilium connectivity test`, https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium documentation: Layer 3 Policies, https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium documentation: Kubernetes constructs in policy, https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium documentation: Monitoring and metrics, https://docs.cilium.io/en/stable/observability/metrics/

## Issues Found
- The prerequisite implied that `--network-plugin-mode overlay` alone was enough for this setup. Azure CNI Powered by Cilium requires `--network-plugin azure` with `--network-dataplane cilium`, using either overlay mode or a pod subnet. Updated the prerequisite accordingly.
- Step 2 described Azure CNI as the active IPAM mode and checked `CiliumNode` pod CIDRs. Current AKS/Cilium documentation describes Azure CNI Powered by Cilium as using delegated Azure IPAM, with AKS-created `NodeNetworkConfig` resources. Updated the validation commands to check the AKS network profile, Cilium delegated IPAM settings, and `NodeNetworkConfig` objects.
- The pod IP range check referred only to an Azure subnet range. Azure CNI Powered by Cilium can assign pod IPs from an overlay pod CIDR or from a virtual network pod subnet. Updated the wording to cover both modes.
- The post used `cilium policy get`, which is not part of the current documented Cilium CLI command reference. Replaced it with `kubectl get ciliumnetworkpolicy` to verify that the policy was accepted by the Kubernetes API.
- The best-practices list used `cilium endpoint list`, which is also not part of the current documented Cilium CLI command reference. Replaced it with `kubectl get ciliumendpoints -A`.
- The best-practices subnet sizing note did not apply cleanly to overlay clusters. Updated it to mention pod CIDRs or Azure pod subnets.

## Review Notes
The CiliumNetworkPolicy YAML is syntactically valid for Cilium L3 ingress policy and matches the documented `endpointSelector` plus `fromEndpoints` structure. The `cilium status --wait` and `cilium connectivity test --test-namespace` commands are documented. The `--test` examples are valid regular expression filters, but scenario names can vary across Cilium CLI releases, so operators should verify the available tests for their installed CLI version.
