# Configure AKS with Azure CNI Dynamic IP Allocation for Large-Scale Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Azure CNI, Networking, IP Allocation, Kubernetes, Large Scale, Azure

Description: Learn how to configure Azure CNI with dynamic IP allocation on AKS to efficiently manage IP addresses in large-scale clusters.

---

Running large AKS clusters with Azure CNI has traditionally meant a painful IP planning exercise. The standard Azure CNI mode pre-allocates IPs for the maximum number of pods on every node at startup. With a default of 30 pods per node and 100 nodes, you need 3,000 IPs just for pods - and those IPs are reserved whether the pods exist or not. Azure CNI Pod Subnet dynamic IP allocation changes this by allocating pod IPs from a separate subnet in batches as nodes need them. In this post, I will explain how it works and walk through the setup for large-scale AKS clusters.

## The Problem with Static IP Allocation

In the standard Azure CNI mode, when a node joins the cluster, it pre-allocates a block of IPs equal to the maximum pods per node setting. If you set max-pods to 110, each node reserves 110 IPs from your subnet. Most of those IPs will sit unused because most nodes do not run 110 pods. For a 100-node cluster with max-pods at 110, you need a subnet that can hold 11,000 IPs - that is a /18 subnet just for pod IPs.

This wastes IP space and makes it difficult to fit AKS into existing VNets that have limited address ranges. It also means you can easily hit the subnet size limit and be unable to scale your cluster.

## How Dynamic IP Allocation Solves This

With dynamic IP allocation, pod IPs are allocated from the pod subnet in batches of 16 per node. A node requests 16 IPs on startup and requests another batch of 16 when fewer than 8 unallocated IPs remain in its allotment. This dramatically reduces IP consumption compared to reserving the maximum pod count for every node and lets you run larger clusters in smaller subnets.

Dynamic IP allocation uses a separate subnet for pod IPs, keeping them separate from node IPs. This gives you additional flexibility in IP planning since you can size the pod subnet and node subnet independently.

## Prerequisites

You need Azure CLI 2.37.0 or later, a VNet with two subnets (one for nodes, one for pods), and the ability to create or update an AKS cluster.

## Step 1: Create the VNet and Subnets

Create a VNet with separate subnets for nodes and pods.

```bash
# Create a resource group

az group create --name large-aks-rg --location eastus

# Create the VNet
az network vnet create \
  --resource-group large-aks-rg \
  --name aks-vnet \
  --address-prefixes 10.0.0.0/8

# Create the node subnet - sized for node IPs only
az network vnet subnet create \
  --resource-group large-aks-rg \
  --vnet-name aks-vnet \
  --name node-subnet \
  --address-prefixes 10.240.0.0/16

# Create the pod subnet - sized for pod IPs
# A /16 gives you 65,531 usable IPs for pods in Azure
az network vnet subnet create \
  --resource-group large-aks-rg \
  --vnet-name aks-vnet \
  --name pod-subnet \
  --address-prefixes 10.241.0.0/16
```

The node subnet needs one IP per node. A /16 supports up to 65,531 usable IPs in Azure, which is far more than you will need. The pod subnet needs enough IPs for the total number of pods across all nodes, plus the extra IPs held in each node's current allocation batch.

## Step 2: Create the AKS Cluster with Dynamic IP Allocation

Create the cluster using Azure CNI Pod Subnet with dynamic IP allocation.

```bash
# Get the subnet resource IDs
NODE_SUBNET_ID=$(az network vnet subnet show \
  --resource-group large-aks-rg \
  --vnet-name aks-vnet \
  --name node-subnet \
  --query id -o tsv)

POD_SUBNET_ID=$(az network vnet subnet show \
  --resource-group large-aks-rg \
  --vnet-name aks-vnet \
  --name pod-subnet \
  --query id -o tsv)

# Create the AKS cluster with dynamic IP allocation
az aks create \
  --resource-group large-aks-rg \
  --name large-aks-cluster \
  --network-plugin azure \
  --vnet-subnet-id $NODE_SUBNET_ID \
  --pod-subnet-id $POD_SUBNET_ID \
  --node-count 5 \
  --max-pods 250 \
  --generate-ssh-keys
```

The key parameter here is `--pod-subnet-id`. When you specify a separate pod subnet with Azure CNI, AKS uses pod subnet IP allocation. IPs will be assigned from the pod subnet in small batches as nodes need them, rather than pre-allocating the full maximum pod count for every node at startup.

The `--max-pods 250` setting is now practical because AKS does not pre-allocate 250 pod IPs for every node. Even with 250 max pods per node, a node with only 20 running pods consumes far fewer than 250 IPs from the pod subnet.

## Step 3: Add Node Pools with Dynamic IP Allocation

When adding additional node pools, specify the same pod subnet or a different one.

```bash
# Add a node pool that uses the same pod subnet
az aks nodepool add \
  --resource-group large-aks-rg \
  --cluster-name large-aks-cluster \
  --name gpupool \
  --node-count 3 \
  --node-vm-size Standard_NC6s_v3 \
  --vnet-subnet-id $NODE_SUBNET_ID \
  --pod-subnet-id $POD_SUBNET_ID \
  --max-pods 30

# Or create a separate pod subnet for isolation
az network vnet subnet create \
  --resource-group large-aks-rg \
  --vnet-name aks-vnet \
  --name gpu-pod-subnet \
  --address-prefixes 10.242.0.0/20

GPU_POD_SUBNET_ID=$(az network vnet subnet show \
  --resource-group large-aks-rg \
  --vnet-name aks-vnet \
  --name gpu-pod-subnet \
  --query id -o tsv)

# Add a node pool with its own pod subnet
az aks nodepool add \
  --resource-group large-aks-rg \
  --cluster-name large-aks-cluster \
  --name isolatedpool \
  --node-count 2 \
  --vnet-subnet-id $NODE_SUBNET_ID \
  --pod-subnet-id $GPU_POD_SUBNET_ID
```

Using separate pod subnets per node pool gives you network isolation and the ability to apply different NSG rules to different workload classes.

## Step 4: Verify IP Allocation

Check how IPs are being allocated across your nodes.

```bash
# Check pod IP ranges on each node
kubectl get pods -A -o wide --no-headers | awk '{print $7}' | sort -t. -k3,3n -k4,4n

# Check the NodeNetworkConfiguration objects that track node IP allocation
kubectl get nodenetworkconfigs -n kube-system -o wide

# Check the subnet IP usage in Azure
az network vnet subnet show \
  --resource-group large-aks-rg \
  --vnet-name aks-vnet \
  --name pod-subnet \
  --query "ipConfigurations | length(@)" -o tsv
```

You should see that pod IPs come from the pod subnet. The Azure subnet count reflects allocated pod IP configurations, which are held in batches and won't match the exact number of currently running pods.

## IP Planning for Large Clusters

Here is how to plan your subnet sizes based on cluster size.

```mermaid
graph LR
    A[Cluster Planning] --> B[Node Count]
    A --> C[Avg Pods per Node]
    B --> D[Node Subnet Size]
    C --> E[Pod Subnet Size]
    D --> F[/24 = 251 usable Azure IPs]
    D --> G[/20 = 4091 usable Azure IPs]
    E --> H[/20 = 4091 usable Azure IPs]
    E --> I[/16 = 65531 usable Azure IPs]
    E --> J[/14 = 262139 usable Azure IPs]
```

A practical planning table:

| Cluster Size | Nodes | Avg Pods/Node | Total Pod IPs | Pod Subnet |
|-------------|-------|---------------|---------------|------------|
| Small | 10 | 30 | 300 | /23 |
| Medium | 50 | 50 | 2,500 | /20 |
| Large | 200 | 80 | 16,000 | /18 |
| Very Large | 500 | 100 | 50,000 | /16 |

Always add 20-30% headroom for scaling, rolling updates that temporarily run extra pods, and the 16-IP allocation batches held by each node.

## Step 5: Configure Network Policies

With separate pod subnets, you can apply Azure NSG rules at the subnet level in addition to Kubernetes network policies.

```bash
# Create an NSG for the pod subnet
az network nsg create \
  --resource-group large-aks-rg \
  --name pod-subnet-nsg

# Allow traffic between pods in the pod subnet
az network nsg rule create \
  --resource-group large-aks-rg \
  --nsg-name pod-subnet-nsg \
  --name allow-pod-to-pod \
  --priority 100 \
  --direction Inbound \
  --source-address-prefixes 10.241.0.0/16 \
  --destination-address-prefixes 10.241.0.0/16 \
  --access Allow \
  --protocol "*"

# Block direct internet access from pods
az network nsg rule create \
  --resource-group large-aks-rg \
  --nsg-name pod-subnet-nsg \
  --name deny-internet \
  --priority 200 \
  --direction Outbound \
  --destination-address-prefixes Internet \
  --access Deny \
  --protocol "*"

# Associate the NSG with the pod subnet
az network vnet subnet update \
  --resource-group large-aks-rg \
  --vnet-name aks-vnet \
  --name pod-subnet \
  --network-security-group pod-subnet-nsg
```

## Step 6: Monitor IP Utilization

For large clusters, monitoring IP usage is critical. You do not want to discover you are running out of IPs during a peak scaling event.

```bash
# Check current IP allocation on the pod subnet
az network vnet subnet show \
  --resource-group large-aks-rg \
  --vnet-name aks-vnet \
  --name pod-subnet \
  --query "{addressPrefix: addressPrefix, ipConfCount: length(ipConfigurations || [])}" -o json

# Enable Container Insights if it is not already enabled
az aks enable-addons \
  --resource-group large-aks-rg \
  --name large-aks-cluster \
  --addons monitoring
```

To monitor subnet usage over time, enable the `azure_subnet_ip_usage` setting in the Container Insights agent configuration and use the Subnet IP Usage workbook in Azure Monitor.

## Comparison: Static vs Dynamic IP Allocation

| Feature | Static (Default CNI) | Dynamic (Pod Subnet) |
|---------|---------------------|---------------------|
| IP allocation | Full max-pods reservation at node startup | Dynamic batches from the pod subnet |
| Unused IP waste | High | Minimal |
| Max pods per node | Up to 250, but consumes more subnet IPs | Up to 250 |
| Subnet planning | Must account for max pods x nodes | Must account for active pods and allocation batch headroom |
| Pod subnet scaling | Nodes and pods share subnet capacity | Node and pod subnets scale independently |
| Pod subnet required | No | Yes |

## Troubleshooting

**Pods stuck in Pending with "failed to allocate IP" error.** The pod subnet is running out of IPs. Either scale up the subnet or reduce the number of pods.

**Connectivity issues between pods on different nodes.** Verify that NSG rules on the pod subnet allow intra-subnet traffic and that no route tables are interfering with pod-to-pod routing.

**Slow pod creation under high churn.** The IP allocation and deallocation process adds a small amount of latency. For very high pod churn (hundreds of pods per minute), monitor the Azure CNI IP allocation metrics.

Dynamic IP allocation is the right choice for any AKS cluster where IP conservation matters or where you need to scale beyond what static allocation can support. The setup is straightforward, the IP savings are significant, and it removes one of the biggest constraints on AKS cluster sizing.
