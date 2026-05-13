# Validation Summary: Install Calico on AKS Step by Step

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI
- Calico network policy
- Kubernetes NetworkPolicy concepts
- Azure CLI
- kubectl
- calicoctl

## Sources Consulted
- Microsoft Learn: Secure traffic between pods with network policies in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Microsoft Learn: Azure CLI `az aks` reference - https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Configure kubenet networking in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/configure-kubenet
- Calico documentation: Install calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: calicoctl node commands - https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: NetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Calico automatic labels - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels

## Issues Found
- The introduction and description claimed the guide covered full Calico CNI installation. The post only showed Azure CNI with Calico as the network policy engine, so the wording was corrected. A note was added that kubenet with Calico uses Calico as both CNI and policy engine, but kubenet is a legacy AKS networking option scheduled for retirement on March 31, 2028.
- The `az aks create` command had a Bash comment after a line-continuation backslash, which would break the command. The comment was moved above the command.
- The existing-cluster update command did not mention that installing Calico on an existing AKS cluster reimages node pools. A warning sentence was added based on Microsoft Learn guidance.
- The verification step used `kubectl exec ... calicoctl node status`. Calico documentation states node-specific `calicoctl node` commands must run directly on the host and do not work correctly from a container. The check was replaced with daemonset rollout status, the AKS network policy setting, and the Calico node image version.
- The `calicoctl` prerequisite used the unqualified latest download URL and did not set execute permissions. It was changed to use an explicit versioned download example, add `chmod +x`, and note that `calicoctl` should match the cluster's Calico version.
- The guide listed IPPools in the Azure CNI policy-only flow. IPPools are not the right verification target for Azure CNI policy-only mode, so the command was changed to list Calico NetworkPolicies across namespaces.

## Review Notes
- The Calico NetworkPolicy examples use valid `projectcalico.org/v3` syntax.
- The DNS egress policy correctly uses a namespace selector to target kube-system DNS pods.
- AKS documentation currently recommends Cilium for new deployments in many scenarios, but Calico remains an available AKS network policy engine.
