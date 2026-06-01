# Validation Summary: How to Implement AKS Multi-Tenancy with Namespace Isolation and Network Policies

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes namespaces
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes RBAC
- AKS node pools, taints, tolerations, and node selectors
- Azure CLI
- kubectl

## Sources Consulted
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes Network Policies concept documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Azure AKS network policies documentation: https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Azure AKS network policies portal documentation: https://learn.microsoft.com/en-us/azure/aks/use-network-policies-in-the-azure-portal
- Azure CNI Powered by Cilium documentation: https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Azure CLI `az aks nodepool` reference: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Azure AKS node pools documentation: https://learn.microsoft.com/en-us/azure/aks/create-node-pools
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/

## Issues Found
- The post did not state that AKS NetworkPolicy objects require a network policy engine to be enforced. Added a prerequisite note listing supported AKS options and clarifying that policies can exist without enforcement.
- The DNS egress policy allowed TCP/UDP 53 traffic to every namespace. Narrowed it to CoreDNS pods in `kube-system` using the namespace's immutable `kubernetes.io/metadata.name` label and the `k8s-app: kube-dns` pod label.
- The external egress policy excluded only the example pod CIDR, which could still allow service CIDR traffic and was too cluster-specific. Added an example service CIDR exclusion and clarified that both CIDRs must be replaced with the cluster's actual ranges.
- The shared ingress policy used separate `namespaceSelector` and `podSelector` peer entries, which means OR matching in NetworkPolicy and would allow more traffic than intended. Combined the selectors into one peer entry so only matching ingress controller pods in the shared namespace are allowed.
- The tenant `Role` attempted to grant access to cluster-scoped resources (`namespaces` and `nodes`) from a namespaced Role. Removed that rule and added a note that cluster-scoped access requires a separate ClusterRole and ClusterRoleBinding.

## Review Notes
The remaining examples use current Kubernetes API versions and standard AKS/Kubernetes patterns. The `az aks nodepool add` command options are current in the Azure CLI documentation, but the review environment did not have `az` or `kubectl` installed, so command verification was performed against official documentation rather than local CLI help.
