# Configure Azure CNI Delegated IPAM with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, azure, aks, ipam, cni, networking, ip-management

Description: A guide to configuring Azure CNI Delegated IPAM with Cilium on AKS, giving Cilium control over pod IP address management while retaining Azure VNet integration.

---

## Introduction

Azure CNI Delegated IPAM is a mode where Cilium takes responsibility for assigning pod IP addresses rather than Azure's default IPAM mechanism. In this configuration, Azure handles the node-level networking and VNet connectivity, while Cilium manages the pod IP address pool using its own IPAM engine.

This approach provides greater flexibility in IP address management, particularly for clusters with dense pod deployments or specific IP addressing requirements. Cilium can use either cluster-scope or multi-pool IPAM modes, allowing fine-grained control over which IP ranges are used for different workloads.

This guide walks through enabling Azure CNI Delegated IPAM with Cilium, configuring IP pools, and verifying that pods receive addresses from the Cilium-managed range.

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
SUBNET_NAME="aks-subnet"

# Create a VNet and subnet with sufficient address space
az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name $VNET_NAME \
  --address-prefix 10.0.0.0/8 \
  --subnet-name $SUBNET_NAME \
  --subnet-prefix 10.240.0.0/16

# Get the subnet ID for cluster creation
SUBNET_ID=$(az network vnet subnet show \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --query id -o tsv)

# Create the AKS cluster with Azure CNI and Cilium dataplane (delegated IPAM)
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --network-plugin azure \
  --network-dataplane cilium \
  --vnet-subnet-id $SUBNET_ID \
  --pod-cidr 192.168.0.0/16 \
  --node-count 3 \
  --generate-ssh-keys
```

## Step 2: Verify Cilium IPAM Configuration

After cluster creation, verify that Cilium is managing IP addresses.

```bash
# Get credentials and check cluster health
az aks get-credentials \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME

# Verify Cilium status
cilium status

# Check Cilium IPAM configuration
cilium config view | grep -i ipam

# Inspect CiliumNode objects to see IP allocations per node
kubectl get ciliumnodes -o yaml | grep -A5 "ipam:"
```

## Step 3: Inspect IP Address Allocation

Verify that pods are receiving IPs from the Cilium-managed CIDR.

```bash
# List all pods with their IP addresses
kubectl get pods -A -o wide

# Check the IP allocations on a specific CiliumNode
NODE_NAME=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
kubectl get ciliumnode $NODE_NAME -o jsonpath='{.spec.ipam}' | python3 -m json.tool

# Verify pod IPs are in the delegated IPAM range (192.168.0.0/16)
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.podIP}{"\n"}{end}'
```

## Step 4: Configure IP Pool Customization

For advanced deployments, customize the IP pools Cilium uses for pod addresses.

```yaml
# cilium-ipam-config.yaml
# Configure Cilium IPAM with custom pool settings
# This is applied as a Helm values override
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-config
  namespace: kube-system
data:
  # Use cluster-scope IPAM mode for Azure CNI delegated
  ipam: "cluster-pool"
  # Define the cluster-wide pod CIDR
  cluster-pool-ipv4-cidr: "192.168.0.0/16"
  # Each node gets a /24 block from the cluster pool
  cluster-pool-ipv4-mask-size: "24"
```

```bash
# Apply the ConfigMap changes via Helm upgrade
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set ipam.mode=cluster-pool \
  --set ipam.operator.clusterPoolIPv4PodCIDRList="192.168.0.0/16" \
  --set ipam.operator.clusterPoolIPv4MaskSize=24
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

- Plan your pod CIDR to avoid overlap with VNet address space and on-premises networks
- Use `/24` per-node blocks to balance address utilization and route table size
- Monitor Cilium IPAM metrics (`cilium_ipam_*`) for address exhaustion alerts
- Enable Hubble to trace IPAM-related connectivity issues
- Review Azure IP limits per VM SKU — larger nodes can hold more Cilium IP pools

## Conclusion

Azure CNI Delegated IPAM with Cilium provides a powerful combination of Azure's VNet integration and Cilium's flexible IP address management. By delegating IPAM to Cilium, you gain fine-grained control over pod addressing while maintaining full compatibility with Azure networking features like Network Security Groups and VNet peering.
