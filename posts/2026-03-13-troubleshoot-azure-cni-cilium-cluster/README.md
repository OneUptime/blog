# Troubleshoot Azure CNI Cilium Cluster Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, azure, azure-cni, kubernetes, troubleshooting, networking, cluster

Description: A troubleshooting reference for diagnosing cluster-wide networking issues when Cilium is deployed alongside Azure CNI in Azure Kubernetes environments.

---

## Introduction

When Cilium runs alongside Azure CNI in an Azure Kubernetes cluster, cluster-wide issues can arise from misconfigurations that affect all pods across all nodes simultaneously. These issues are often distinct from per-pod or per-node problems and require a different diagnostic approach.

Common cluster-wide issues include Cilium identity allocation failures, global network policy misconfigurations that block cluster-wide traffic, MTU mismatches causing intermittent packet loss, and configuration drift between nodes due to incomplete upgrades.

This guide focuses on diagnosing and resolving cluster-wide Azure CNI + Cilium issues, providing a systematic approach to identify whether a problem originates from the Azure data plane, the Cilium control plane, or the interaction between them.

## Prerequisites

- Azure Kubernetes cluster with Azure CNI and Cilium
- `kubectl` with cluster admin access
- `cilium` CLI installed
- Azure CLI configured

## Step 1: Assess Cluster-Wide Cilium Health

Get a broad view of Cilium's health across all nodes.

```bash
# Check Cilium status across the entire cluster
cilium status --wait

# List all Cilium pods and their health
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Run the built-in connectivity test for end-to-end validation
cilium connectivity test

# Check for Cilium pods that have been restarting
kubectl get pods -n kube-system -l k8s-app=cilium \
  -o custom-columns='NODE:.spec.nodeName,RESTARTS:.status.containerStatuses[0].restartCount'
```

## Step 2: Diagnose Cilium Identity Allocation Issues

Identity allocation failures can cause cluster-wide policy enforcement problems.

```bash
# Check CiliumIdentity resources for errors
kubectl get ciliumidentities

# Look for identity allocation errors in Cilium operator logs
kubectl logs -n kube-system -l name=cilium-operator | grep -E "ERROR|identity"

# Verify KVStore connectivity (used for identity distribution)
kubectl exec -n kube-system <cilium-pod> -- cilium debuginfo | grep kvstore
```

## Step 3: Check MTU Configuration Across Nodes

MTU mismatches cause silent packet loss that is difficult to diagnose.

```bash
# Check the MTU configured in Cilium
kubectl get configmap cilium-config -n kube-system -o yaml | grep mtu

# Verify the MTU on node network interfaces
kubectl debug node/<node-name> -it --image=ubuntu -- ip link show eth0

# Confirm Azure CNI MTU settings match Cilium configuration
# Azure VNet has a maximum MTU of 1500; Azure CNI typically uses 1500
# Cilium should be set to match or lower to avoid fragmentation
```

## Step 4: Diagnose Cluster-Wide Network Policy Issues

Identify global policies that may be affecting all cluster traffic.

```bash
# List all CiliumClusterwideNetworkPolicies
kubectl get ccnp

# Check for default-deny policies that might be too broad
kubectl get ccnp -o yaml | grep -A5 "action: Deny"

# Verify no policy is accidentally blocking DNS (port 53)
kubectl exec -n kube-system <cilium-pod> -- \
  cilium monitor --type drop | grep -i dns
```

## Step 5: Validate Azure VNet and Cilium Route Consistency

Ensure Azure VNet routes and Cilium routes are consistent.

```bash
# Check Cilium's view of node routes
kubectl exec -n kube-system <cilium-pod> -- cilium bpf ipcache list

# Compare with Azure VNet effective routes on the node
# (Requires Azure CLI access to the node's network interface)
az network nic show-effective-route-table \
  --resource-group <rg-name> \
  --name <nic-name>
```

## Best Practices

- Deploy Cilium with cluster-wide Hubble observability enabled for real-time traffic monitoring
- Set appropriate cluster-wide default network policies before adding workloads
- Document your MTU configuration and validate it after cluster upgrades
- Use Cilium's `cilium connectivity test` as part of your post-upgrade validation procedure
- Monitor Cilium operator logs for identity allocation issues in large clusters

## Conclusion

Cluster-wide issues in Azure CNI + Cilium environments require a holistic approach—checking Cilium health across all nodes, validating identity allocation, MTU configuration, and global network policies. By following a systematic diagnostic process, you can identify whether issues originate from the Azure data plane, Cilium configuration, or their interaction, and resolve them efficiently.
