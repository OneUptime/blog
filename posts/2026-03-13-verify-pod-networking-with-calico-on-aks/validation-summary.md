# Validation Summary: How to Verify Pod Networking with Calico on AKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI
- Calico
- Kubernetes NetworkPolicy
- kubectl
- BusyBox

## Sources Consulted
- Microsoft Learn: Secure Pod Traffic with Network Policies in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Microsoft Learn: Azure Kubernetes Service (AKS) CNI networking overview - https://learn.microsoft.com/en-us/azure/aks/concepts-network-cni-overview
- Calico Documentation: Installing on AKS - https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/aks
- Kubernetes Documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Documentation: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Documentation: kubectl expose - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- BusyBox command reference: wget options - https://busybox.net/BusyBox.html

## Issues Found
- The introduction implied that Calico always runs in policy-only mode on AKS. Updated the wording to scope that claim to AKS clusters using Azure CNI with Calico as the network policy engine, because AKS and Calico documentation also describe other Calico configurations.
- The post stated that all pods receive IPs from the Azure virtual network address space. Updated this to distinguish flat Azure CNI modes from Azure CNI Overlay, where pods use a separate pod CIDR.
- The prerequisites listed `calicoctl`, but the procedure does not use `calicoctl`. Removed that prerequisite to avoid requiring an unnecessary tool.
- The BusyBox test command used `wget --timeout=5`, which may not be supported by BusyBox builds. Changed it to `wget -T 5`, which BusyBox documents as the network read timeout option.

## Review Notes
- The Kubernetes NetworkPolicy manifest is valid and correctly creates ingress isolation for pods matching `run: test-b` by selecting the pods with `policyTypes: Ingress` and no allowed ingress rules.
- Existing network policies in the `default` namespace could affect the connectivity checks. The guide is technically correct for a simple test namespace or a namespace without pre-existing restrictive policies.
