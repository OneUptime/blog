# Troubleshooting Cilium Requirement Issues on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, eBPF

Description: A guide to diagnosing and resolving common Cilium requirement issues on Azure Kubernetes Service, from kernel version problems to network plugin conflicts.

---

## Introduction

AKS introduces several Azure-specific configuration requirements for Cilium that are not present in generic Kubernetes deployments. When these requirements are not met, Cilium may fail to install, fail to start, or function with reduced capabilities. This guide covers the most common requirement-related failures on AKS and provides specific diagnostic and remediation steps for each.

The most frequent issues involve network plugin conflicts (attempting to install standalone Cilium over Azure CNI without proper chaining configuration), kernel version limitations (node images using kernels older than 5.10), and Azure networking restrictions (node security groups blocking required Cilium ports). Each failure has clear symptoms and a documented fix.

## Prerequisites

- AKS cluster with Cilium installation attempted
- Azure CLI installed and authenticated
- `kubectl` access to the cluster

## Issue 1: Cilium Conflicts with Azure CNI

**Symptom**: Cilium pods crash with errors about CNI configuration conflicts.

```bash
# Diagnose: check existing CNI configuration
kubectl exec -n kube-system cilium-xxxxx -- ls /etc/cni/net.d/
kubectl exec -n kube-system cilium-xxxxx -- cat /etc/cni/net.d/10-azure.conflist

# Check Cilium logs for CNI errors
kubectl logs -n kube-system cilium-xxxxx | grep -i "cni\|azure"

# Fix: Use Azure CNI chaining mode instead of standalone
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set cni.chainingMode=azure-cni-powered-by-cilium \
  --set azure.enabled=true
```

## Issue 2: Kernel Version Too Old

**Symptom**: Some Cilium features not available, performance degraded.

```bash
# Check kernel version
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'

# AKS Ubuntu 18.04: kernel 5.4 (limited eBPF support)
# AKS Ubuntu 22.04: kernel 5.15 (full eBPF support)

# Fix: Upgrade node pool to Ubuntu 22.04
az aks nodepool update \
  --cluster-name myAKSCluster \
  --resource-group myRG \
  --name nodepool1 \
  --os-sku Ubuntu \
  --node-os-upgrade-channel NodeImage

# Or create a new node pool with Ubuntu 22.04
az aks nodepool add \
  --cluster-name myAKSCluster \
  --resource-group myRG \
  --name newpool \
  --node-count 3 \
  --os-sku Ubuntu
```

## Issue 3: Network Security Group Blocking Cilium Ports

**Symptom**: Pod-to-pod communication fails across nodes.

```bash
# Diagnose: identify required Cilium ports
# VXLAN overlay: UDP 8472
# Geneve overlay: UDP 6081
# Health checks: TCP 4240
# Hubble: TCP 4244 (optional)

# Check NSG rules
az network nsg list --resource-group $NODE_RESOURCE_GROUP --query "[].name" -o tsv

# Add required rules
NSG_NAME=$(az network nsg list --resource-group $NODE_RESOURCE_GROUP --query "[0].name" -o tsv)

az network nsg rule create \
  --nsg-name $NSG_NAME \
  --resource-group $NODE_RESOURCE_GROUP \
  --name AllowCiliumVXLAN \
  --protocol Udp \
  --destination-port-range 8472 \
  --priority 200 \
  --access Allow

# Test connectivity after adding rules
cilium connectivity test --test pod-to-pod
```

## Issue 4: BPF Host Routing Not Available

**Symptom**: `cilium status` shows BPF host routing not enabled despite Linux 5.10+.

```bash
# Check if BPF host routing is enabled
kubectl exec -n kube-system ds/cilium -- cilium status | grep "BPF Host Routing"

# Check kernel version (requires 5.10+)
uname -r

# Enable BPF host routing explicitly
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set bpf.hostRouting=true

# Verify after upgrade
kubectl exec -n kube-system ds/cilium -- cilium status | grep "BPF Host Routing"
```

## Issue 5: IP Exhaustion with Azure CNI

**Symptom**: Pods stuck in Pending state with "insufficient IPs" message.

```bash
# Check IP allocation on nodes
kubectl get CiliumNode -o yaml | grep -A 10 "ipam:"

# Check available IPs per node
az aks show --name myAKSCluster --resource-group myRG \
  --query "networkProfile" -o json | jq '.podCidr'

# Fix: Increase pre-allocated IP slots
az aks update \
  --name myAKSCluster \
  --resource-group myRG \
  --max-pods 250
```

## Conclusion

Troubleshooting Cilium requirement issues on AKS requires understanding both Cilium's requirements and Azure's specific networking model. The most common issues - CNI conflicts, old kernel versions, NSG restrictions, and IP exhaustion - all have documented solutions. By systematically diagnosing the symptoms with the commands above, you can resolve requirement mismatches without rebuilding the entire cluster.
