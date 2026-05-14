# Checking Cilium Requirements for AKS (Azure Kubernetes Service)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, eBPF

Description: A checklist of all requirements to install and run Cilium on Azure Kubernetes Service, including node pool configuration, network plugin settings, and kernel version requirements.

---

## Introduction

Installing Cilium on AKS requires navigating Azure-specific configurations that differ from generic Kubernetes installations. AKS uses Azure CNI or kubenet as the default network plugin, and replacing or chaining with Cilium requires specific cluster and node pool settings. Additionally, AKS enforces certain node image constraints that affect kernel version availability, which directly impacts which Cilium eBPF features are available.

Understanding these requirements before creating your AKS cluster is far easier than trying to retrofit Cilium onto a misconfigured cluster. This guide covers every requirement you need to verify - cluster configuration, node pool settings, networking mode, and node OS kernel versions - to ensure a successful Cilium installation on AKS.

## Prerequisites

- Azure CLI (`az`) installed and authenticated
- `kubectl` configured
- Familiarity with AKS cluster creation concepts

## Step 1: Check Kernel Version Requirements

```bash
# AKS node image kernel versions vary by OS SKU and image release

# Ubuntu 22.04 commonly uses kernel 5.15
# Ubuntu 24.04 commonly uses newer kernels such as 6.8
# Ubuntu 18.04 is retired in AKS and should not be used

# Check current node kernel version
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'

# Minimum kernel for Cilium features:
# Core: 5.10+ or equivalent
# Advanced features may require newer kernels
# Recommended: use a current AKS Linux node image
```

## Step 2: Verify Network Plugin Compatibility

```bash
# Check current network plugin
az aks show --name myAKSCluster --resource-group myRG \
  --query "networkProfile.networkPlugin" -o tsv

# Supported configurations with Cilium:
# - Azure CNI Powered by Cilium (recommended for new clusters)
# - AKS BYO CNI with Cilium installed manually
# - Azure CNI + Cilium CNI chaining (legacy)
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

# Option 2: Standard Azure CNI for legacy Cilium chaining
# Requires additional Cilium chaining configuration after cluster creation
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

# Azure CNI Powered by Cilium is available for Linux node pools
# Windows node pools are not supported with Azure CNI Powered by Cilium

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

# Typical requirement: Contributor or Owner on the resource group
# Custom roles must also include any required network and role-assignment permissions
```

## Step 6: Verify Post-Creation Requirements

```bash
# Get AKS credentials
az aks get-credentials --name myAKSCluster --resource-group myRG

# Check Cilium status if already installed
cilium status --wait

# Check AKS network dataplane
az aks show --name myAKSCluster --resource-group myRG \
  --query "networkProfile.networkDataplane" -o tsv

# Check Cilium pods
kubectl get pods -n kube-system | grep cilium
```

## AKS + Cilium Requirements Summary

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Kubernetes version | 1.29 for Azure CNI Powered by Cilium | Current supported AKS version |
| Node OS | Linux, Ubuntu 20.04+ | Current AKS Linux node image |
| Kernel version | 5.10 or equivalent | Current AKS Linux node image |
| Network plugin | azure or BYO CNI | azure (overlay mode) |
| Node type | Linux only | Linux only |

## Conclusion

Cilium on AKS is well-supported, especially with the "Azure CNI Powered by Cilium" option that integrates Cilium natively. By verifying kernel versions, network plugin settings, and node pool OS types before cluster creation, you avoid the most common compatibility issues. For new clusters, use a current AKS Linux node image and Azure CNI overlay mode to get the best Cilium feature support.
