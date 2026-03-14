# Troubleshoot Azure Delegated IPAM with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, azure, ipam, delegated-ipam, aks, troubleshooting, networking

Description: A troubleshooting guide for diagnosing IP address management issues when using Azure's delegated IPAM mode with Cilium on AKS clusters.

---

## Introduction

Azure Delegated IPAM is a mode where Cilium takes over IP address management from Azure CNI, using Azure-allocated subnets for pod IP addressing while Cilium handles the actual IPAM operations. This mode provides greater flexibility for IP address planning while maintaining Azure VNet integration.

Issues in delegated IPAM mode often manifest as pods stuck in ContainerCreating state, IP exhaustion warnings, or unexpected pod IP ranges that don't align with configured subnet delegations. These problems require understanding both Azure's subnet delegation model and Cilium's IPAM mechanisms.

This guide covers diagnostic procedures for the most common issues encountered with Azure delegated IPAM and Cilium.

## Prerequisites

- AKS cluster with Cilium and Azure delegated IPAM configured
- `kubectl` with cluster admin access
- Azure CLI configured with permissions to manage VNets
- `cilium` CLI installed

## Step 1: Verify Azure Subnet Delegation Configuration

Confirm the Azure subnet is correctly delegated for AKS pod subnets.

```bash
# Check subnet delegation in Azure
az network vnet subnet show \
  --resource-group <rg-name> \
  --vnet-name <vnet-name> \
  --name <pod-subnet-name> \
  --query delegations

# The delegation should include Microsoft.ContainerService/managedClusters
# or the appropriate AKS delegation

# Check the available IP count in the delegated subnet
az network vnet subnet show \
  --resource-group <rg-name> \
  --vnet-name <vnet-name> \
  --name <pod-subnet-name> \
  --query "ipConfigurations | length(@)"
```

## Step 2: Check Cilium IPAM Configuration

Verify Cilium's IPAM mode is set correctly for Azure delegated mode.

```bash
# Check Cilium's IPAM mode
kubectl get configmap cilium-config -n kube-system -o yaml | grep -E "ipam|azure"

# Verify Cilium operator is configured for Azure IPAM
kubectl logs -n kube-system -l name=cilium-operator | grep -E "ipam|azure|ERROR"

# Check CiliumNode resources for IPAM state
kubectl get ciliumnodes -o yaml | grep -A20 "ipam:"
```

## Step 3: Diagnose IP Allocation Failures

Investigate pods that are stuck in ContainerCreating due to IPAM failures.

```bash
# Check for IPAM errors in Cilium agent logs
kubectl logs -n kube-system <cilium-pod> | grep -E "IPAM|alloc|ERROR" | tail -30

# Check for IP allocation errors in Cilium operator logs
kubectl logs -n kube-system -l name=cilium-operator | grep -E "allocation|exhausted" | tail -30

# Inspect the CiliumNode resource for the affected node
kubectl get ciliumnode <node-name> -o yaml | grep -A30 "spec:"
```

## Step 4: Validate Subnet IP Availability

Check if the delegated subnet has enough available IP addresses.

```bash
# List available IPs in the delegated subnet
az network vnet subnet list-available-ips \
  --resource-group <rg-name> \
  --vnet-name <vnet-name> \
  --name <pod-subnet-name>

# Check current allocations in Cilium
kubectl exec -n kube-system <cilium-pod> -- cilium bpf ipcache list | wc -l

# Compare against node capacity
kubectl describe node <node-name> | grep -E "Capacity|Allocatable" -A5
```

## Step 5: Resolve IP Exhaustion Issues

Address IP exhaustion in the delegated subnet.

```bash
# Check for leaked IPAM allocations (IPs allocated but no corresponding pod)
kubectl get pods --all-namespaces -o wide | awk '{print $7}' | sort > live-pod-ips.txt
kubectl get ciliumnodes -o jsonpath='{range .items[*]}{.status.ipam.used}{"\n"}{end}' > cilium-allocations.txt

# Force IPAM reconciliation by restarting the Cilium operator
kubectl rollout restart deployment/cilium-operator -n kube-system

# Monitor reconciliation progress
kubectl logs -n kube-system -l name=cilium-operator -f | grep -E "release|reclaim"
```

## Best Practices

- Size delegated subnets generously—plan for 2x your expected pod count to allow for rolling updates
- Monitor Cilium IPAM utilization using Cilium's built-in metrics
- Enable Azure Monitor alerts for subnet IP exhaustion
- Regularly audit CiliumNode IPAM state against actual pod allocations
- Test IPAM behavior during node pool scale-out events before production load testing

## Conclusion

Troubleshooting Azure delegated IPAM with Cilium requires examining both the Azure subnet configuration and Cilium's IPAM state. By verifying delegation settings, checking IP availability, and monitoring Cilium operator logs, you can resolve IPAM failures and prevent IP exhaustion from impacting pod scheduling in your AKS cluster.
