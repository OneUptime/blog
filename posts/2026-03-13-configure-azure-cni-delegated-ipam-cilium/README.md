# Configure Azure CNI Delegated IPAM with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, eBPF

Description: A guide to configuring Azure CNI Delegated IPAM with Cilium on AKS, giving Cilium control over pod IP address management while retaining Azure VNet integration.

---

## Introduction

Azure CNI Delegated IPAM is the IPAM model used by Azure CNI powered by Cilium. In this configuration, Azure handles the node-level networking and VNet connectivity, while the delegated IPAM component works with Cilium CNI to allocate pod addresses from Azure-managed pod address space.

This approach provides greater flexibility in IP address management, particularly for clusters with dense pod deployments or specific IP addressing requirements. On AKS, pod IPs can be assigned from an overlay network or from a pod subnet in the virtual network.

This guide walks through enabling Azure CNI Delegated IPAM with Cilium, inspecting delegated IPAM resources, and verifying that pods receive addresses from the delegated pod subnet.

## Prerequisites

- Azure CLI installed and authenticated
- An existing AKS cluster or plans to create one
- Familiarity with Azure VNet CIDR planning
- `kubectl` and `cilium` CLI installed

## Step 1: Create an AKS Cluster with Delegated IPAM

Create an AKS cluster configured to use Azure CNI with Cilium IPAM delegation.

```bash
# Set cluster configuration variables

RESOURCE_GROUP="my-rg"
CLUSTER_NAME="cilium-delegated-ipam"
LOCATION="eastus"
VNET_NAME="aks-vnet"
NODE_SUBNET_NAME="aks-node-subnet"
POD_SUBNET_NAME="aks-pod-subnet"

# Create a VNet with separate node and pod subnets
az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name $VNET_NAME \
  --address-prefix 10.0.0.0/8 \
  --subnet-name $NODE_SUBNET_NAME \
  --subnet-prefix 10.240.0.0/16

az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name $POD_SUBNET_NAME \
  --address-prefixes 10.241.0.0/16

# Get the subnet IDs for cluster creation
NODE_SUBNET_ID=$(az network vnet subnet show \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name $NODE_SUBNET_NAME \
  --query id -o tsv)

POD_SUBNET_ID=$(az network vnet subnet show \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name $POD_SUBNET_NAME \
  --query id -o tsv)

# Create the AKS cluster with Azure CNI and Cilium dataplane (delegated IPAM)
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --location $LOCATION \
  --network-plugin azure \
  --network-dataplane cilium \
  --vnet-subnet-id $NODE_SUBNET_ID \
  --pod-subnet-id $POD_SUBNET_ID \
  --max-pods 250 \
  --node-count 3 \
  --generate-ssh-keys
```

## Step 2: Verify Cilium IPAM Configuration

After cluster creation, verify that Azure delegated IPAM is active.

```bash
# Get credentials and check cluster health
az aks get-credentials \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME

# Verify Cilium status
cilium status

# Check Cilium IPAM configuration
cilium config view | grep -i ipam

# Inspect NodeNetworkConfig objects to see Azure delegated IPAM allocations
kubectl get nodenetworkconfigs -n kube-system -o wide
```

## Step 3: Inspect IP Address Allocation

Verify that pods are receiving IPs from the delegated pod subnet.

```bash
# List all pods with their IP addresses
kubectl get pods -A -o wide

# Check the IP allocations on a specific NodeNetworkConfig
NODE_NAME=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
kubectl get nodenetworkconfig $NODE_NAME -n kube-system -o yaml

# Verify pod IPs are in the delegated pod subnet range (10.241.0.0/16)
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.podIP}{"\n"}{end}'
```

## Step 4: Inspect Delegated IPAM Configuration

For AKS-managed Azure CNI powered by Cilium, AKS manages the Cilium installation and most Cilium configuration values. Customizing `ipam.mode` or applying Helm overrides to the managed `cilium-config` ConfigMap is not supported. Configure the pod address range at cluster creation time with either `--pod-cidr` for overlay clusters or `--pod-subnet-id` for pod-subnet clusters.

```bash
# Confirm Cilium is using the delegated IPAM plugin
cilium config view | grep -E "ipam|local-router-ipv4"

# Inspect delegated IPAM resources created for nodes
kubectl get nodenetworkconfigs -n kube-system -o yaml
```

## Step 5: Verify Pod Connectivity

Run connectivity tests to confirm pod networking is working with delegated IPAM.

```bash
# Run Cilium's built-in connectivity test
cilium connectivity test

# Manually test cross-node pod connectivity
kubectl run test-pod-1 --image=busybox --rm -it -- sh
# From inside the pod: ping <another-pod-ip>

# Verify endpoint state in Cilium
cilium endpoint list
```

## Best Practices

- Plan your pod CIDR or pod subnet to avoid overlap with service CIDRs and on-premises networks
- For pod-subnet dynamic IP allocation, plan for IPs to be allocated to nodes in batches of 16
- Monitor Azure pod subnet IP usage for address exhaustion alerts
- Enable Advanced Container Networking Services when you need managed network observability features
- Review Azure CNI pod limits when selecting `--max-pods` values

## Conclusion

Azure CNI Delegated IPAM with Cilium provides a powerful combination of Azure's VNet integration and Cilium's eBPF dataplane. By using Azure CNI powered by Cilium with a pod subnet or overlay pod CIDR, you can control pod addressing while maintaining compatibility with Azure networking features like Network Security Groups and VNet peering.
