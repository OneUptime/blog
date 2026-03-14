# Validate Azure Delegated IPAM with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, EBPF

Description: Learn how to validate Azure Delegated IPAM with Cilium on AKS, ensuring that pod IP addresses are correctly allocated from Azure subnets and that Cilium's dataplane is functioning with delegated...

---

## Introduction

Azure Delegated IPAM is a mode in which Azure manages IP address allocation for pods via the Azure CNI Overlay or subnet delegation model, while Cilium handles dataplane operations and policy enforcement. This delegation model allows you to scale pod networking beyond traditional per-node CIDR limitations by leveraging Azure's IP management capabilities directly.

Validating Azure Delegated IPAM with Cilium involves confirming that IP addresses assigned to pods are sourced from the correct Azure delegated subnet, that Cilium recognizes these IPs, and that network policies are enforced correctly despite the external IPAM source.

This guide provides step-by-step validation procedures for this configuration, helping platform engineers confirm correct behavior after provisioning or during troubleshooting.

## Prerequisites

- AKS cluster configured with Azure CNI Overlay and Cilium dataplane
- Delegated subnet configured in your Azure VNet
- `kubectl` cluster-admin access
- `az` CLI authenticated
- `cilium` CLI installed

## Step 1: Verify Delegated Subnet Configuration in Azure

Confirm the subnet delegation is correctly set up in Azure before checking the Kubernetes side.

```bash
# List subnets in the VNet and confirm the delegation to Microsoft.ContainerService/managedClusters
az network vnet subnet list \
  --resource-group <resource-group> \
  --vnet-name <vnet-name> \
  --query "[].{name:name, delegation:delegations[0].serviceName, addressPrefix:addressPrefix}" \
  -o table
```

## Step 2: Check Cilium IPAM Configuration

Verify that Cilium is configured to use the delegated IPAM mode.

```bash
# Inspect the Cilium ConfigMap for IPAM and delegated plugin settings
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.ipam}{"\n"}{.data.azure-use-primary-address}'

# Confirm Cilium is not managing its own IP pools
kubectl get ciliumippool 2>/dev/null || echo "No Cilium IP pools - delegated IPAM is active"
```

## Step 3: Validate Pod IP Allocation from Delegated Subnet

```bash
# Retrieve the pod CIDR range used by the delegated subnet
DELEGATED_CIDR="10.224.0.0/16"  # Replace with your actual delegated prefix

# List pod IPs and verify they fall within the delegated subnet
kubectl get pods -A -o wide --no-headers | awk '{print $7}' | sort -u | \
  while read ip; do
    # Check if IP is in range (requires ipcalc or manual comparison)
    echo "$ip"
  done
```

## Step 4: Inspect CiliumNode Objects for Azure IP Details

```bash
# CiliumNode objects reflect the IP allocation state from Azure delegated IPAM
kubectl get ciliumnodes -o yaml | \
  grep -A 10 "ipam:"

# Check that each node has allocated IPs from the delegated subnet
kubectl get ciliumnodes -o jsonpath=\
'{range .items[*]}{.metadata.name}: {.status.ipam.used}{"\n"}{end}'
```

## Step 5: Run Connectivity Tests

```bash
# Run the Cilium connectivity test to validate end-to-end networking
# with delegated IPs
cilium connectivity test --test '/pod-to-pod' --test '/pod-to-service'

# Verify DNS resolution is functional (critical with overlay networking)
kubectl run dns-test --image=busybox --restart=Never -- \
  nslookup kubernetes.default.svc.cluster.local
kubectl logs dns-test
kubectl delete pod dns-test
```

## Best Practices

- Size the delegated subnet generously - each pod consumes one IP from the Azure subnet
- Monitor `CiliumNode` `.status.ipam.used` vs. `.spec.ipam.available` to catch IP exhaustion
- Enable Azure Monitor and Cilium Hubble for correlated networking insights
- Use Azure Policy to prevent unauthorized changes to the delegated subnet
- Test failover behavior by cordoning nodes and confirming IPs are reallocated correctly

## Conclusion

Validating Azure Delegated IPAM with Cilium requires checking both the Azure control plane (subnet delegation and IP allocation) and the Kubernetes data plane (CiliumNode status, endpoint registration, and connectivity). A successful validation confirms that the two systems are working in concert to provide scalable, policy-enforced pod networking.
