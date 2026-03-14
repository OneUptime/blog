# Checking Cilium Requirements for AKS (Azure Kubernetes Service)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, Requirements, eBPF

Description: A checklist of all requirements to install and run Cilium on Azure Kubernetes Service, including node pool configuration, network plugin settings, and kernel version requirements.

---

## Introduction

Installing Cilium on AKS requires navigating Azure-specific configurations that differ from generic Kubernetes installations. AKS uses Azure CNI or kubenet as the default network plugin, and replacing or chaining with Cilium requires specific cluster and node pool settings. Additionally, AKS enforces certain node image constraints that affect kernel version availability, which directly impacts which Cilium eBPF features are available.

Understanding these requirements before creating your AKS cluster is far easier than trying to retrofit Cilium onto a misconfigured cluster. This guide covers every requirement you need to verify — cluster configuration, node pool settings, networking mode, and node OS kernel versions — to ensure a successful Cilium installation on AKS.

## Prerequisites

- Azure CLI (`az`) installed and authenticated
- `kubectl` configured
- Familiarity with AKS cluster creation concepts

## Step 1: Check Kernel Version Requirements

```bash
# AKS Ubuntu node image kernel versions
# Ubuntu 22.04 (default for AKS 1.27+): kernel 5.15
# Ubuntu 18.04 (legacy): kernel 5.4

# Check current node kernel version
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'

# Minimum kernel for Cilium features:
# Core: 4.9.17+
# BPF host routing: 5.10+
# WireGuard: 5.6+
# Recommended: 5.15+
```

## Step 2: Verify Network Plugin Compatibility

```bash
# Check current network plugin
az aks show --name myAKSCluster --resource-group myRG \
  --query "networkProfile.networkPlugin" -o tsv

# Supported configurations with Cilium:
# - Azure CNI Powered by Cilium (recommended for new clusters)
# - Azure CNI + Cilium CNI chaining (for existing clusters)
# - kubenet + Cilium (overlay mode)
```

## Step 3: Create a Cilium-Compatible AKS Cluster

```bash
# Option 1: Azure CNI Powered by Cilium (native integration)
az aks create \
  --name cilium-aks \
  --resource-group myRG \
  --node-count 3 \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --network-dataplane cilium \
  --location eastus \
  --generate-ssh-keys

# Option 2: Standard Azure CNI with Cilium chaining
az aks create \
  --name cilium-aks \
  --resource-group myRG \
  --node-count 3 \
  --network-plugin azure \
  --generate-ssh-keys
```

## Step 4: Check Node Pool OS Requirements

```bash
# List node pools and their OS types
az aks nodepool list \
  --cluster-name myAKSCluster \
  --resource-group myRG \
  --query "[].{name:name, osType:osType, osDiskType:osDiskType, vmSize:vmSize}" \
  -o table

# Cilium requires Linux node pools
# Windows node pools are not supported

# Check OS disk type (Ephemeral recommended for performance)
az aks nodepool list \
  --cluster-name myAKSCluster \
  --resource-group myRG \
  --query "[].osDiskType" -o tsv
```

## Step 5: Required Azure RBAC Permissions

```bash
# Check your Azure RBAC role for the cluster resource group
az role assignment list \
  --assignee $(az account show --query user.name -o tsv) \
  --resource-group myRG \
  --query "[].roleDefinitionName" -o tsv

# Required: Contributor or Owner on the resource group
# Or: Custom role with Microsoft.ContainerService/* permissions
```

## Step 6: Verify Post-Creation Requirements

```bash
# Get AKS credentials
az aks get-credentials --name myAKSCluster --resource-group myRG

# Check Cilium status if already installed
cilium status

# Check Azure CNI Powered by Cilium is active
kubectl get pods -n kube-system | grep cilium
```

## AKS + Cilium Requirements Summary

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Kubernetes version | 1.24 | 1.27+ |
| Node OS | Ubuntu 18.04 | Ubuntu 22.04 |
| Kernel version | 5.4 | 5.15 |
| Network plugin | azure or kubenet | azure (overlay mode) |
| Node type | Linux only | Linux only |

## Conclusion

Cilium on AKS is well-supported, especially with the "Azure CNI Powered by Cilium" option that integrates Cilium natively. By verifying kernel versions, network plugin settings, and node pool OS types before cluster creation, you avoid the most common compatibility issues. For new clusters, always use Ubuntu 22.04 node images and Azure CNI overlay mode to get the best Cilium feature support.
