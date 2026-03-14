# Troubleshoot Azure CNI with Cilium on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, azure, aks, azure-cni, troubleshooting, kubernetes, networking

Description: A comprehensive troubleshooting guide for diagnosing and resolving issues when running Cilium as the network policy engine alongside Azure CNI on AKS clusters.

---

## Introduction

Azure Kubernetes Service (AKS) supports using Cilium as the network policy engine while retaining Azure CNI for IP address management and native VNet integration. This configuration gives you Cilium's advanced network policies, eBPF visibility, and Hubble observability while preserving the Azure-native networking features that AKS customers depend on.

When issues arise in this configuration, they often involve interactions between Azure CNI's IP assignment, Cilium's policy enforcement, and AKS's managed component updates. Diagnosing problems requires understanding both the Azure and Cilium control planes.

This guide covers the most common failure modes in Azure CNI + Cilium AKS deployments and provides step-by-step diagnostic procedures.

## Prerequisites

- AKS cluster with Azure CNI and Cilium network policy enabled
- `kubectl` with cluster admin access
- `cilium` CLI installed
- Azure CLI (`az`) configured with cluster access

## Step 1: Verify Cilium Installation on AKS

Confirm Cilium is running correctly on the AKS cluster.

```bash
# Check Cilium pod status across all nodes
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Run Cilium status check
cilium status --wait

# Verify Cilium version matches the expected AKS-managed version
cilium version
kubectl get configmap cilium-config -n kube-system -o yaml | grep cilium-image
```

## Step 2: Diagnose Pod Connectivity Issues

Investigate pods that cannot communicate with each other or with services.

```bash
# Check if the pod's Cilium endpoint is registered
CILIUM_POD=$(kubectl get pod -n kube-system -l k8s-app=cilium \
  --field-selector spec.nodeName=<node-name> -o jsonpath='{.items[0].metadata.name}')

# List endpoints and their policy enforcement status
kubectl exec -n kube-system ${CILIUM_POD} -- cilium endpoint list

# Monitor traffic for a specific pod
kubectl exec -n kube-system ${CILIUM_POD} -- \
  cilium monitor -t drop --from <pod-ip>
```

## Step 3: Check Azure CNI IP Address Allocation

Validate that Azure CNI is correctly assigning IPs to pods.

```bash
# Check Azure CNI logs for IP allocation errors
kubectl logs -n kube-system -l component=azure-cni-networkmonitor 2>/dev/null || \
kubectl logs -n kube-system -l app=azure-cni 2>/dev/null

# Verify node capacity for pod IPs
kubectl describe node <node-name> | grep -E "Allocatable|Capacity"

# Check Azure CNI configuration on the node
kubectl debug node/<node-name> -it --image=ubuntu -- \
  cat /etc/cni/net.d/10-azure.conflist
```

## Step 4: Debug Cilium Network Policy Issues

Diagnose cases where network policies are not being enforced correctly.

```bash
# List all CiliumNetworkPolicies and their status
kubectl get cnp,ccnp --all-namespaces

# Check policy enforcement on a specific endpoint
kubectl exec -n kube-system ${CILIUM_POD} -- \
  cilium policy get

# Trace a specific connection to see if it's allowed or dropped
kubectl exec -n kube-system ${CILIUM_POD} -- \
  cilium debuginfo | grep -i policy
```

## Step 5: Validate Hubble Observability

Use Hubble to trace and diagnose traffic issues.

```bash
# Enable Hubble if not already enabled
cilium hubble enable

# Port-forward Hubble relay for local access
cilium hubble port-forward &

# Observe traffic for a specific namespace
hubble observe --namespace default --follow

# Look for dropped flows
hubble observe --verdict DROPPED --namespace default
```

## Best Practices

- Always check AKS release notes before upgrading, as managed updates can change Cilium configurations
- Use Hubble for real-time traffic visibility when diagnosing intermittent connectivity issues
- Ensure your CiliumNetworkPolicies use correct label selectors matching your pod labels
- Monitor Azure CNI IP address pool utilization to prevent exhaustion on busy node pools
- Check for conflicts between Azure NSG rules and Cilium network policies

## Conclusion

Troubleshooting Cilium on AKS with Azure CNI requires familiarity with both Azure's managed networking and Cilium's eBPF dataplane. By systematically checking Cilium agent health, endpoint state, Azure CNI IP allocation, and using Hubble for traffic visibility, you can efficiently diagnose and resolve most issues in this environment.
