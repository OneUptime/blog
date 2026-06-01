# Validation Summary: How to Configure AKS Node Auto-Provisioning with NAP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Node Auto-Provisioning (NAP)
- Karpenter
- Kubernetes NodePool and AKSNodeClass CRDs
- Azure CLI
- Azure CNI Overlay and Cilium
- Kubernetes Deployments, resource requests, taints, and tolerations
- Azure Spot VMs and GPU node provisioning

## Sources Consulted
- Microsoft Learn: Overview of node auto-provisioning in AKS: https://learn.microsoft.com/en-us/azure/aks/node-auto-provisioning
- Microsoft Learn: Enable or disable node auto-provisioning in AKS: https://learn.microsoft.com/en-us/azure/aks/use-node-auto-provisioning
- Microsoft Learn: Configure node pools for node auto-provisioning in AKS: https://learn.microsoft.com/en-us/azure/aks/node-auto-provisioning-node-pools
- Microsoft Learn: Configure AKSNodeClass resources for node auto-provisioning in AKS: https://learn.microsoft.com/en-us/azure/aks/node-auto-provisioning-aksnodeclass
- Microsoft Learn: Configure disruption policies for node auto-provisioning nodes in AKS: https://learn.microsoft.com/en-us/azure/aks/node-auto-provisioning-disruption
- Kubernetes documentation: Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes documentation: Resource management for Pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: Taints and tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/

## Issues Found
- The prerequisites and setup step described NAP as a preview feature requiring the `aks-preview` extension and `NodeAutoProvisioningPreview` feature registration. Current Microsoft documentation uses generally available Azure CLI support, requires Azure CLI 2.76.0 or later, and does not require those preview setup steps. I replaced that section with an Azure CLI version check.
- The AKS create and update commands used the outdated `--enable-node-auto-provisioning` flag. Current documentation uses `--node-provisioning-mode Auto`, and new-cluster examples include `--network-dataplane cilium` with Azure CNI overlay. I updated both commands.
- The NodePool examples used `apiVersion: karpenter.sh/v1alpha5`. Current AKS NAP documentation uses `karpenter.sh/v1`. I updated all NodePool manifests.
- The AKSNodeClass example used `apiVersion: karpenter.azure.com/v1alpha2`. Current AKS NAP documentation uses `karpenter.azure.com/v1beta1`. I updated the AKSNodeClass manifest and added explicit `apiVersion` and `kind` fields to `nodeClassRef` references.
- The NodePool examples used `node.kubernetes.io/instance-type` for explicit Azure VM SKU selection. Microsoft documentation recommends `karpenter.azure.com/sku-name` for explicit SKU names. I changed the selector key in the general, spot, and GPU examples.
- The consolidation policy examples used `WhenUnderutilized`, which is not the current documented AKS NAP policy value. I changed it to `WhenEmptyOrUnderutilized`.
- The spot priority section said lower NodePool weight means higher priority. Current documentation states higher weights indicate higher priority. I corrected the comment.
- The spot priority example claimed fallback to on-demand but only allowed `spot`. Microsoft documentation states NAP prioritizes Spot when both `spot` and `on-demand` are specified, so I added `on-demand` to the capacity type values.
- The text said NAP does not need pre-defined node pools, which was ambiguous because NAP itself uses Karpenter `NodePool` resources. I clarified that NAP does not require pre-defined AKS node pools for every VM shape.

## Review Notes
The remaining examples are illustrative and still require environment-specific values such as the subscription ID, virtual network, subnet, Azure regional VM availability, quota, and GPU driver/runtime setup for real GPU workloads.
