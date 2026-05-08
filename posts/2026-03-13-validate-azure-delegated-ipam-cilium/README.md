# Validate Azure Delegated IPAM with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, eBPF

Description: Learn how to validate Azure Delegated IPAM with Cilium on AKS, ensuring that pod IP addresses are correctly allocated from Azure subnets and that Cilium's dataplane is functioning with delegated...

---

## Introduction

Azure Delegated IPAM is a mode in which Azure manages IP address allocation for pods in Azure CNI Powered by Cilium clusters, while Cilium handles dataplane operations and policy enforcement. With pod subnet mode, this delegation model allows you to scale pod networking beyond traditional per-node CIDR limitations by leveraging Azure's IP management capabilities directly.

Validating Azure Delegated IPAM with Cilium involves confirming that IP addresses assigned to pods are sourced from the correct Azure pod subnet or pod CIDR, that Cilium recognizes these IPs, and that network policies are enforced correctly despite the external IPAM source.

This guide provides step-by-step validation procedures for this configuration, helping platform engineers confirm correct behavior after provisioning or during troubleshooting.

## Prerequisites

- AKS cluster configured with Azure CNI Powered by Cilium
- Pod subnet configured in your Azure VNet when validating virtual network pod IPs
- `kubectl` cluster-admin access
- `az` CLI authenticated
- `cilium` CLI installed

## Step 1: Verify Pod Subnet Configuration in Azure

Confirm the pod subnet is correctly set up in Azure before checking the Kubernetes side.

```bash
# List subnets in the VNet and confirm the pod subnet and any AKS delegation

az network vnet subnet list \
  --resource-group <resource-group> \
  --vnet-name <vnet-name> \
  --query "[].{name:name, delegation:delegations[0].serviceName, addressPrefix:addressPrefix}" \
  -o table
```

## Step 2: Check Cilium IPAM Configuration

Verify that Cilium is configured to use the delegated IPAM mode.

```bash
# Inspect the Cilium ConfigMap for delegated IPAM settings
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.ipam}{"\n"}{.data.local-router-ipv4}{"\n"}'

# Confirm the cluster is not using Cilium IP pools for pod allocation
kubectl get ciliumippool 2>/dev/null || echo "No Cilium IP pools found"
```

## Step 3: Validate Pod IP Allocation from the Pod Subnet

```bash
# Retrieve the pod subnet CIDR or overlay pod CIDR used by the cluster
POD_CIDR="10.224.0.0/16"  # Replace with your actual pod prefix

# List pod IPs and verify they fall within the expected pod range
kubectl get pods -A -o wide --no-headers | awk '{print $7}' | sort -u | \
  while read ip; do
    # Check if IP is in range (requires ipcalc or manual comparison)
    echo "$ip"
  done
```

## Step 4: Inspect NodeNetworkConfig Objects for Azure IP Details

```bash
# NodeNetworkConfig objects reflect the allocation state used by Azure delegated IPAM
kubectl get nodenetworkconfigs -n kube-system -o wide

# Inspect the per-node allocation details
kubectl get nodenetworkconfigs -n kube-system -o yaml | \
  grep -E "name:|primaryIP:|secondaryIPConfigs:" -A 5
```

## Step 5: Run Connectivity Tests

```bash
# Run the Cilium connectivity test to validate end-to-end networking
# with delegated pod IPs
cilium connectivity test --test '/pod-to-pod' --test '/pod-to-service'

# Verify DNS resolution is functional (critical with overlay networking)
kubectl run dns-test --image=busybox --restart=Never -- \
  nslookup kubernetes.default.svc.cluster.local
kubectl logs dns-test
kubectl delete pod dns-test
```

## Best Practices

- Size the pod subnet generously - each pod consumes one IP from the Azure subnet in virtual network pod IP mode
- Monitor `NodeNetworkConfig` resources and Azure subnet IP usage to catch IP exhaustion
- Enable Azure Monitor and Cilium Hubble for correlated networking insights
- Use Azure Policy to prevent unauthorized changes to the pod subnet
- Test failover behavior by cordoning nodes and confirming IPs are reallocated correctly

## Conclusion

Validating Azure Delegated IPAM with Cilium requires checking both the Azure control plane (pod subnet or pod CIDR allocation) and the Kubernetes data plane (NodeNetworkConfig resources, endpoint registration, and connectivity). A successful validation confirms that the two systems are working in concert to provide scalable, policy-enforced pod networking.
