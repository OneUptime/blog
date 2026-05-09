# Troubleshoot Azure Delegated IPAM with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, eBPF

Description: A troubleshooting guide for diagnosing IP address management issues when using Azure's delegated IPAM mode with Cilium on AKS clusters.

---

## Introduction

Azure Delegated IPAM is a mode where Azure CNI powered by Cilium uses Azure-allocated subnets for pod IP addressing while the delegated Azure IPAM plugin handles pod IP allocation for the Cilium CNI. This mode provides greater flexibility for IP address planning while maintaining Azure VNet integration.

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

# Check the current subnet IP configuration count
az network vnet subnet show \
  --resource-group <rg-name> \
  --vnet-name <vnet-name> \
  --name <pod-subnet-name> \
  --query "ipConfigurations | length(@)"
```

## Step 2: Check Cilium IPAM Configuration

Verify Cilium's IPAM mode is set correctly for Azure delegated mode.

```bash
# Check Cilium's IPAM mode and local router IP
kubectl get configmap cilium-config -n kube-system -o yaml | grep -E "ipam|delegated-plugin|local-router-ipv4"

# Verify the Cilium CNI configuration uses Azure delegated IPAM
kubectl exec -n kube-system <cilium-pod> -- grep -E "azure-ipam|cilium-cni" /host/etc/cni/net.d/05-cilium.conflist

# Check NodeNetworkConfig resources for AKS delegated IPAM state
kubectl get nodenetworkconfigs -n kube-system -o yaml | grep -A30 "status:"
```

## Step 3: Diagnose IP Allocation Failures

Investigate pods that are stuck in ContainerCreating due to IPAM failures.

```bash
# Check for IPAM errors in Cilium agent logs
kubectl logs -n kube-system <cilium-pod> | grep -E "IPAM|alloc|ERROR" | tail -30

# Check for delegated IPAM errors in Cilium agent logs
kubectl logs -n kube-system <cilium-pod> | grep -E "azure-ipam|delegated|allocation|exhausted" | tail -30

# Inspect the NodeNetworkConfig resource for the affected node
kubectl get nodenetworkconfig <node-name> -n kube-system -o yaml | grep -A40 "status:"
```

## Step 4: Validate Subnet IP Availability

Check if the delegated subnet has enough available IP addresses.

```bash
# List available IPs in the delegated subnet
az network vnet subnet list-available-ips \
  --resource-group <rg-name> \
  --vnet-name <vnet-name> \
  --name <pod-subnet-name>

# Check current datapath IP cache entries in Cilium
kubectl exec -n kube-system <cilium-pod> -- cilium-dbg bpf ipcache list | wc -l

# Compare against node capacity
kubectl describe node <node-name> | grep -E "Capacity|Allocatable" -A5
```

## Step 5: Resolve IP Exhaustion Issues

Address IP exhaustion in the delegated subnet.

```bash
# Compare live pod IPs with local Cilium endpoint IPs
kubectl get pods --all-namespaces -o wide | awk '{print $7}' | sort > live-pod-ips.txt
kubectl get ciliumendpoints --all-namespaces -o jsonpath='{range .items[*]}{.status.networking.addressing[0].ipv4}{"\n"}{end}' | sort > cilium-endpoint-ips.txt

# Restart the affected Cilium agent to force delegated IPAM and CNI state reconciliation
kubectl delete pod -n kube-system <cilium-pod>

# Monitor reconciliation progress
kubectl logs -n kube-system <new-cilium-pod> -f | grep -E "azure-ipam|delegated|release|reclaim"
```

## Best Practices

- Size delegated subnets generously-plan for at least 16 IPs per node, plus headroom for scale-out and rolling updates
- Monitor Cilium IPAM utilization using Cilium's built-in metrics
- Enable Azure Monitor alerts for subnet IP exhaustion
- Regularly audit NodeNetworkConfig and CiliumEndpoint state against actual pod allocations
- Test IPAM behavior during node pool scale-out events before production load testing

## Conclusion

Troubleshooting Azure delegated IPAM with Cilium requires examining both the Azure subnet configuration and delegated IPAM state in Kubernetes. By verifying delegation settings, checking IP availability, and monitoring Cilium agent logs, you can resolve IPAM failures and prevent IP exhaustion from impacting pod scheduling in your AKS cluster.
