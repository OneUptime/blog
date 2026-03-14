# Update Cilium Requirements on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, EBPF

Description: Learn how to review and update Cilium's system requirements on Azure Kubernetes Service (AKS), ensuring your cluster meets all prerequisites before installing or upgrading Cilium.

---

## Introduction

Azure Kubernetes Service (AKS) has specific networking configurations that affect Cilium's requirements. AKS clusters can run with Azure CNI, kubenet, or Azure CNI Overlay - each with different compatibility profiles for Cilium. Before installing or upgrading Cilium on AKS, you must verify that your cluster configuration, node OS, and Kubernetes version meet Cilium's requirements.

AKS also introduces Azure-specific constraints: the network policy engine used, the node image (Ubuntu or Azure Linux), and the Kubernetes version all affect which Cilium features are available. AKS clusters running Azure CNI Powered by Cilium have a different requirements profile than clusters where Cilium is installed as an overlay.

This guide walks through checking and updating all relevant requirements for running Cilium on AKS, including node OS compatibility, kernel version verification, and network configuration prerequisites.

## Prerequisites

- AKS cluster running or planned
- `az` CLI installed and authenticated
- `kubectl` configured for the AKS cluster
- `cilium` CLI installed
- Contributor access to the AKS resource group

## Step 1: Check AKS Cluster Configuration

Verify the cluster's current network profile and Kubernetes version.

```bash
# Get AKS cluster details including network plugin and policy
az aks show \
  --resource-group <resource-group> \
  --name <cluster-name> \
  --query "{networkPlugin:networkProfile.networkPlugin, networkPolicy:networkProfile.networkPolicy, k8sVersion:kubernetesVersion, nodeOsType:agentPoolProfiles[0].osSKU}"
```

## Step 2: Verify Node OS and Kernel Version

Cilium requires specific kernel versions. Check what's running on AKS nodes.

```bash
# Check the kernel version on AKS nodes
kubectl get nodes -o custom-columns="NODE:.metadata.name,OS:.status.nodeInfo.osImage,KERNEL:.status.nodeInfo.kernelVersion"

# For L7 policy and kube-proxy replacement, need kernel 5.3+
# AKS Ubuntu 22.04 nodes typically run kernel 5.15+
# AKS Azure Linux nodes run kernel 5.15+
```

## Step 3: Check Cilium Compatibility with AKS Network Plugin

Different AKS network plugins have different Cilium compatibility.

```bash
# Check current network plugin
az aks show \
  --resource-group <resource-group> \
  --name <cluster-name> \
  --query "networkProfile.networkPlugin" -o tsv

# For Azure CNI Overlay + Cilium, verify the overlay is configured
az aks show \
  --resource-group <resource-group> \
  --name <cluster-name> \
  --query "networkProfile.networkPluginMode" -o tsv
```

Compatibility matrix:
- Azure CNI + Cilium: Supported, Cilium as standalone CNI
- Azure CNI Overlay + Cilium: Supported, best practice for scale
- kubenet + Cilium: Not recommended
- Azure CNI Powered by Cilium: Managed Cilium by AKS

## Step 4: Update Node Pool to Meet Requirements

If nodes don't meet requirements, update the node pool OS SKU.

```bash
# Create a new node pool with Azure Linux (meets Cilium kernel requirements)
az aks nodepool add \
  --resource-group <resource-group> \
  --cluster-name <cluster-name> \
  --name ciliumpool \
  --node-count 3 \
  --os-sku AzureLinux \
  --kubernetes-version 1.29.0 \
  --node-vm-size Standard_D4s_v3

# Verify the new node pool meets kernel requirements
kubectl get nodes -l agentpool=ciliumpool \
  -o custom-columns="NODE:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion"
```

## Step 5: Verify Resource Quotas and Limits

Ensure the AKS cluster has sufficient resources for Cilium pods.

```bash
# Check available resources on nodes
kubectl describe nodes | grep -A 10 "Allocatable"

# Cilium minimum requirements per node:
# - CPU: 100m request, 1 core limit
# - Memory: 64Mi request, 500Mi limit
# - These are for calico-node equivalent (cilium-agent pod)

# Check current resource usage
kubectl top nodes
kubectl top pods -n kube-system | grep cilium
```

## Best Practices

- Use AKS Azure Linux node images for best Cilium kernel compatibility
- Always check the AKS-Cilium compatibility matrix before upgrading either component
- Enable AKS node auto-upgrade to keep kernels current within a supported channel
- Test Cilium upgrades on a staging node pool before rolling to production
- Monitor `kubectl get ciliumnode` to verify all nodes are registered with Cilium

## Conclusion

Meeting Cilium's requirements on AKS involves verifying kernel versions, network plugin compatibility, and node OS selection. By using Azure Linux node images, configuring Azure CNI Overlay, and checking resource allocations, you ensure Cilium can be installed and operated reliably on AKS. Keeping these requirements current is an ongoing operational responsibility as both AKS and Cilium evolve.
