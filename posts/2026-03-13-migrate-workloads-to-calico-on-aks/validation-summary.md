# Validation Summary: How to Migrate Existing Workloads to Calico on AKS

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI
- Calico network policy on AKS
- Kubernetes NetworkPolicy
- Azure CLI
- kubectl
- Velero
- Azure Monitor

## Sources Consulted
- Microsoft Learn: Secure traffic between pods with network policies in AKS - https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Microsoft Learn: Azure CLI `az aks` reference - https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: AKS network policy best practices - https://learn.microsoft.com/en-us/azure/aks/network-policy-best-practices
- Tigera Calico documentation: Installing on AKS - https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/aks
- Tigera Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation: `kubectl apply` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes documentation: `kubectl run` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The introduction said AKS supports two network policy engines. Current AKS documentation lists three: Cilium, Azure Network Policy Manager, and Calico. Updated the introduction to reflect the current AKS options and the legacy status of Azure NPM.
- The post claimed Azure-managed Calico provides advanced Calico policy capabilities such as GlobalNetworkPolicy. AKS built-in Calico is documented for standard Kubernetes NetworkPolicy support; advanced Calico APIs require self-managed Calico and are not the supported path for the shown `--network-policy calico` setup. Updated the text and examples to use `networking.k8s.io/v1` NetworkPolicy.
- The post implied Calico could be enabled on a new node pool. AKS network policy is cluster-level, not node-pool scoped. Updated the migration language to describe creating a new Calico-enabled cluster.
- The examples required `calicoctl` and used `projectcalico.org/v3` policy resources. Replaced them with Kubernetes NetworkPolicy manifests and `kubectl apply`, which matches Azure-managed Calico on AKS.
- The verification command used `calicoctl get ippools`, which is not appropriate for the Azure-managed Calico path described in the post. Replaced it with `az aks show --query "networkProfile.networkPolicy"` to confirm the cluster network policy engine.
- The workload migration step exported raw `kubectl get all -o yaml` output and reapplied it. That output includes generated resources and cluster-managed metadata, so it is not a reliable declarative migration method. Updated the section to apply source-controlled manifests and recommend a migration tool for live-only state.
- The validation commands omitted the target kube context. Added `--context=myAKSCluster` to the final validation commands to keep the examples consistent.
- Best-practice bullets referenced Calico tier-based policy and Calico-specific flow logging in a way that implied support in Azure-managed Calico. Reworded those bullets around Kubernetes namespace/label policy and supported observability options.
- The conclusion promised zero downtime. Changed it to "minimize downtime" because actual downtime depends on application architecture, data migration, DNS/load balancer cutover, and readiness validation.

## Review Notes
Azure's current guidance strongly recommends Cilium for Linux network policy on AKS and notes retirement timelines for Azure Network Policy Manager. The post remains valid as a Calico-focused migration guide, but future updates should clarify whether the intended target is Azure-managed Calico for Kubernetes NetworkPolicy or self-managed Calico for advanced Calico APIs such as GlobalNetworkPolicy and tiered policy.
