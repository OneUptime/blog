# Validation Summary: How to Create Azure AKS Virtual Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Container Instances (ACI)
- AKS virtual nodes
- Virtual Kubelet
- Azure CNI networking
- Azure CLI
- Kubernetes Pod, Deployment, Service, Ingress, nodeSelector, node affinity, tolerations, probes, and volumes
- Azure Monitor Container Insights

## Sources Consulted
- Microsoft Learn: Create virtual nodes in Azure Kubernetes Service (AKS) using Azure CLI - https://learn.microsoft.com/en-us/azure/aks/virtual-nodes-cli
- Microsoft Learn: Use virtual nodes with Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/virtual-nodes
- Microsoft Learn: Virtual nodes on Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-virtual-nodes
- Microsoft Learn: Deploy container instances into an Azure virtual network - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-vnet
- Microsoft Learn: Resource availability and quota limits for Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-resource-and-quota-limits
- Microsoft Learn: Deploy container instances that use GPU resources - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-gpu
- Microsoft Learn: Azure CLI reference for az aks - https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Azure CLI reference for az network vnet subnet - https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Microsoft Learn: Azure CLI reference for az quota - https://learn.microsoft.com/en-us/cli/azure/quota
- Kubernetes documentation: Well-known labels, annotations, and taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Azure Container Instances pricing - https://azure.microsoft.com/en-us/pricing/details/container-instances/

## Issues Found
- The ACI subnet creation command used `--address-prefix`; changed it to the current documented `--address-prefixes` form for `az network vnet subnet create`.
- The existing-cluster virtual node setup omitted the required Network Contributor role assignment for the `aciconnectorlinux-<cluster-name>` managed identity. Added the official identity lookup and `az role assignment create` commands.
- The scheduling overview incorrectly described tolerations as a scheduling method. Updated it to say the two placement methods shown are nodeSelector and node affinity, with tolerations required for the virtual-node taints.
- The pod nodeSelector used deprecated `beta.kubernetes.io/os`; changed it to `kubernetes.io/os`.
- The limitations table incorrectly said Persistent Volumes were supported as "Azure Files only." Updated it to clarify that Azure Files inline volumes are supported, but PV/PVC are not.
- The limitations table incorrectly said GPU workloads are supported. Updated it because ACI GPU resources are retired and were not supported for virtual network deployments.
- The limitations table incorrectly said init containers are supported. Updated it to "Not supported" based on AKS virtual node limitations.
- The Azure Files best practice implied general persistence support. Clarified that Azure Files must be used as inline volumes and not PersistentVolumeClaims.
- The graceful shutdown example used a Kubernetes `preStop` lifecycle hook, but AKS virtual nodes do not support container hooks. Replaced it with guidance to handle shutdown in application code.
- The ACI cost section embedded point-in-time per-second prices. Replaced those with a formula and a note to check the current regional Azure pricing page.
- The troubleshooting section used `az container list` as a quota check. Replaced it with `az quota usage list` scoped to Microsoft.ContainerInstance in the target region.
- The cleanup section attempted to delete the ACI subnet directly. Added removal of the ACI service association link and subnet delegation first, matching Microsoft cleanup guidance.

## Review Notes
The post covers the legacy AKS virtual-node add-on path. Microsoft also documents a newer "virtual nodes on Azure Container Instances" Helm-based offering with broader Kubernetes feature support, so future revisions may want to distinguish the two approaches explicitly.
