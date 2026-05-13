# Validation Summary: Configure Calico on AKS for a New Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI
- Calico
- Kubernetes NetworkPolicy
- Azure CLI
- kubectl

## Sources Consulted
- Microsoft Learn: Secure traffic between pods with network policies in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Microsoft Learn: Azure CLI `az aks` command reference: https://learn.microsoft.com/en-us/cli/azure/aks
- Tigera Calico documentation: Microsoft Azure Kubernetes Service (AKS): https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/aks
- Kubernetes documentation: Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico documentation: GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy

## Issues Found
- The post claimed that AKS-managed Calico with Azure CNI gives access to Calico GlobalNetworkPolicy, host endpoint policies, and the full Calico feature set. Microsoft and Tigera documentation describe AKS-managed Calico as supporting standard Kubernetes NetworkPolicy only; advanced Calico APIs require self-managed Calico. Updated the introduction, best practices, and conclusion to reflect the supported feature set.
- The post required and used `calicoctl` against an AKS-managed Calico cluster. This is not needed for standard Kubernetes NetworkPolicy management on AKS, and using the latest `calicoctl` can also fail if its version does not match the managed Calico version. Replaced that step with an `az aks show` network profile verification command.
- The GlobalNetworkPolicy example was presented as usable in the AKS-managed Calico setup. Replaced it with a standard Kubernetes NetworkPolicy example and added a note that Calico-specific APIs require self-managed Calico.
- The verification commands assumed both `calico-node` and `calico-typha` label selectors would be present. Replaced them with a broader `kubectl get pods -n kube-system | grep calico` check.
- The sample allow policy selected the `frontend` namespace but the commands only created the `production` namespace. Added `kubectl create namespace frontend` so the example setup includes the referenced namespace.

## Review Notes
AKS documentation currently recommends Cilium for new Linux network policy deployments, while Calico remains a documented AKS network policy option. The corrected post stays focused on Calico because that is the article topic.
