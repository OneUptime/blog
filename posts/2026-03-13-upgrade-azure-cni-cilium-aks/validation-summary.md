# Validation Summary: Upgrade Azure CNI to Cilium on AKS

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI
- Azure CNI Overlay
- Azure CNI Powered by Cilium
- Cilium
- Kubernetes NetworkPolicy
- CiliumNetworkPolicy
- Azure CLI
- kubectl

## Sources Consulted
- Microsoft Learn: Update Azure CNI IPAM mode and data plane technology for AKS - https://learn.microsoft.com/en-us/azure/aks/update-azure-cni
- Microsoft Learn: Configure Azure CNI Powered by Cilium in AKS - https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Microsoft Learn: Migrate from Network Policy Manager to Cilium Network Policy - https://learn.microsoft.com/en-us/azure/aks/migrate-from-npm-to-cilium-network-policy
- Microsoft Learn: Best practices for network policies in AKS - https://learn.microsoft.com/en-us/azure/aks/network-policy-best-practices
- Microsoft Learn: Supported Kubernetes versions in AKS - https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Cilium CLI command reference: cilium connectivity test - https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium policy documentation: Layer 4 policies - https://docs.cilium.io/en/latest/security/policy/layer4/
- Cilium CLI command reference: cilium-dbg policy get - https://docs.cilium.io/en/latest/cmdref/cilium-dbg_policy_get/

## Issues Found
- The post incorrectly described AKS Cilium migration as a node-pool-level operation where a new Cilium node pool can be added and workloads drained into it. Microsoft documentation states that Azure CNI Powered by Cilium is enabled with `az aks update --network-dataplane cilium`, and that node pools are reimaged simultaneously; updating each node pool separately is not supported. I changed the migration flow to use the supported cluster data plane update.
- The post stated that changing the CNI requires recreating node pools and recommended a rolling node pool replacement approach. I corrected this to describe AKS-managed node pool reimaging during the data plane update.
- The existing-cluster command used `az aks nodepool add` without any Cilium-specific flags and implied the new node pool would be Cilium-enabled. I replaced it with the documented `az aks update --network-dataplane cilium` command.
- The workload migration commands cordoned and drained old Azure CNI nodes into a Cilium pool that AKS does not support for this migration path. I replaced them with node and pod readiness checks after AKS reimages the node pools.
- The Cilium connectivity command used `--test pod-to-pod`. The Cilium CLI documents `--test` as matching test regular expressions and gives examples such as `/pod-to-cidr`; I changed the command to `--test /pod-to-pod`.
- The `az aks show` JMESPath query used `networkProfile.dnsServiceIP`, but Azure CLI output uses `dnsServiceIp`. I corrected the field casing.
- The new-cluster sample pinned Kubernetes `1.29.0`, which is no longer a current AKS version as of May 2026. I removed the explicit version so AKS can select a supported default or the reader can provide a current supported version.
- The post used `cilium policy get`, while current Cilium documentation exposes `cilium-dbg policy get` as deprecated and the regular Cilium CLI does not document `cilium policy get`. I replaced the check with `kubectl describe ciliumnetworkpolicy`.
- Best-practice guidance recommended maintaining Azure CNI and Cilium node pools for rollback and removing old Azure CNI node pools. I changed those bullets to recommend non-production testing, policy validation, and monitoring the supported reimage process.
- The introduction implied Hubble observability as a general benefit. I adjusted the wording to "cluster traffic observability" and made Hubble usage conditional on Hubble being enabled.

## Review Notes
The corrected guide is technically accurate for upgrading an existing Azure CNI AKS cluster to the Cilium data plane. If the cluster also needs to change IPAM mode to Azure CNI Overlay, Microsoft documents that IPAM mode and data plane changes must be performed as separate operations, with IPAM updated first.
