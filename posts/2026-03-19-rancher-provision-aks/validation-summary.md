# Validation Summary: How to Provision an AKS Cluster from Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Azure Kubernetes Service (AKS)
- Microsoft Azure
- Azure CLI
- Kubernetes

## Sources Consulted
- Rancher: Creating an AKS Cluster: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-clusters-from-hosted-kubernetes-providers/aks
- Rancher: AKS Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/cluster-configuration/rancher-server-configuration/aks-cluster-configuration
- Azure CLI: `az ad sp create-for-rbac`: https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Microsoft Learn: Automatically upgrade an AKS cluster: https://learn.microsoft.com/en-us/azure/aks/auto-upgrade-cluster
- Microsoft Learn: Best practices for network connectivity and security in AKS: https://learn.microsoft.com/en-us/azure/aks/operator-best-practices-network
- Microsoft Learn: Storage options for applications in AKS: https://learn.microsoft.com/en-us/azure/aks/concepts-storage
- Kubernetes: `kubectl taint` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Rancher AKS operator schema: https://github.com/rancher/aks-operator/blob/main/pkg/apis/aks.cattle.io/v1/types.go

## Issues Found
- The least-privilege Azure role guidance was incomplete. The post suggested only `Azure Kubernetes Service Contributor` and `Network Contributor`, but Rancher currently documents either subscription-wide `Contributor` or a custom `Rancher AKSv2` role for scoped access. I replaced that section with accurate guidance.
- The networking section included `Docker Bridge CIDR`, but Rancher’s current AKS operator marks `dockerBridgeCidr` as no longer supported. I removed that line from the configuration example.
- The private cluster section said the private DNS zone could be `System or custom`. Rancher’s current AKS operator exposes `System` and `None` for this field. I corrected the supported values.
- The post included an Azure AD integration subsection that does not match the current documented Rancher AKS configuration surface. I replaced it with the documented Rancher requirement that Kubernetes RBAC stays enabled and local accounts remain enabled so Rancher can register or import the cluster.
- The Azure network policy option was missing its dependency on Azure CNI. I added that requirement.
- The kubenet description was technically incomplete for current AKS guidance. I added the March 31, 2028 retirement date from current Microsoft guidance.
- The taint example used invalid syntax. I corrected it from `dedicated: high-memory:NoSchedule` to `dedicated=high-memory:NoSchedule` to match Kubernetes taint syntax.
- The auto-upgrade subsection described AKS capability, but it does not appear in the current Rancher AKS documentation or operator schema used for Rancher provisioning. I removed that unsupported guidance.
- The storage section suggested patching `managed-csi` as the default storage class. Current AKS documentation states `managed-csi` is already the default and that AKS reconciles built-in storage classes, so such changes can be overwritten. I corrected that guidance.
- The verification step used `kubectl` commands without stating that kubeconfig must already be configured. I clarified that prerequisite so the commands are actionable.

## Review Notes
- The prerequisite line still says `Rancher installation (v2.7 or later)`. Rancher 2.7 is archived, so future revisions should prefer wording that points readers to a current supported Rancher release.
- Available Kubernetes versions, regions, VM SKUs, and zone support are fetched dynamically from Azure and can change independently of the blog post.
