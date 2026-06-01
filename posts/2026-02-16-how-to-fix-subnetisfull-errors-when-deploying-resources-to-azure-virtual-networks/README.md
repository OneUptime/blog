# Fix 'SubnetIsFull' Errors When Deploying Resources to Azure Virtual Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, VNet, Subnets, Networking, IP Address, Troubleshooting, CIDR

Description: Fix SubnetIsFull errors in Azure by understanding IP address exhaustion, subnet sizing, and strategies for expanding address space in virtual networks.

---

You try to deploy a new VM, App Service integration, or AKS node pool, and Azure gives you this:

```text
SubnetIsFull - Subnet 'my-subnet' does not have enough IP addresses available to deploy the requested resources.
```

Your subnet has run out of IP addresses. This is a planning problem that becomes an operational emergency, because fixing it usually means disrupting existing workloads. Let us walk through why this happens, how to diagnose it, and what your options are.

## Understanding Subnet IP Address Consumption

Every subnet in an Azure VNet has a CIDR range that determines how many IP addresses are available. But you do not get to use all of them. Azure reserves 5 IP addresses in every subnet:

- The first four addresses in the subnet range, such as x.x.x.0 through x.x.x.3
- The last address in the subnet range, such as x.x.x.255 for a /24

So a /24 subnet (256 addresses) gives you 251 usable addresses. A /27 subnet (32 addresses) gives you only 27 usable addresses. And some Azure services consume more IPs than you might expect.

### IP Consumption by Service

Different Azure services consume IP addresses differently:

- **Virtual Machine**: 1 IP per NIC (usually 1, but can be more)
- **App Service VNet Integration**: 1 IP per App Service plan instance, with extra headroom needed during scale operations and platform upgrades
- **Azure Kubernetes Service**: Traditional Azure CNI uses subnet IP capacity for nodes and pods based on the configured maximum pods per node
- **Application Gateway**: 1 private IP per instance, plus another private IP if a private frontend IP is configured
- **Azure Firewall**: Requires its own /26 subnet (64 addresses, 59 usable)
- **VPN Gateway**: Requires a dedicated GatewaySubnet
- **Private Endpoints**: 1 IP per endpoint

AKS with traditional Azure CNI networking is the most common culprit. If you have 3 nodes configured for 30 pods each, that is 93 IP addresses to plan for just one cluster.

## Diagnosing the Issue

First, figure out how many IPs are used and how many are available.

```bash
# Check the subnet configuration and address prefix

az network vnet subnet show \
  --resource-group my-rg \
  --vnet-name my-vnet \
  --name my-subnet \
  --query "{AddressPrefix:addressPrefix, Delegations:delegations, ServiceEndpoints:serviceEndpoints}" \
  --output json

# List all resources using IP addresses in the subnet
az network vnet subnet show \
  --resource-group my-rg \
  --vnet-name my-vnet \
  --name my-subnet \
  --query "ipConfigurations[].id" \
  --output tsv
```

The `ipConfigurations` field shows every NIC attached to the subnet. Count them and compare against the subnet's total capacity.

```bash
# Count the number of used IPs
az network vnet subnet show \
  --resource-group my-rg \
  --vnet-name my-vnet \
  --name my-subnet \
  --query "length(ipConfigurations)" \
  --output tsv

# Calculate available capacity
# For a /24 subnet: 251 usable IPs
# For a /25 subnet: 123 usable IPs
# For a /26 subnet: 59 usable IPs
# For a /27 subnet: 27 usable IPs
# For a /28 subnet: 11 usable IPs
```

## Solution 1: Clean Up Unused Resources

Before expanding the subnet, check for resources consuming IPs that are no longer needed.

```bash
# Find NICs that are not attached to any VM
az network nic list \
  --resource-group my-rg \
  --query "[?virtualMachine == null].{Name:name, Subnet:ipConfigurations[0].subnet.id}" \
  --output table
```

Orphaned NICs from deleted VMs are a common source of IP waste. Delete them to free up addresses.

```bash
# Delete an orphaned NIC
az network nic delete \
  --resource-group my-rg \
  --name orphaned-nic-01
```

Also check for stopped (deallocated) VMs that are not being used. Deallocated VMs still hold their IP assignments.

## Solution 2: Resize the Subnet

If the subnet truly needs more addresses, you can expand its CIDR range - but only if there is room in the VNet's address space.

```bash
# Check the VNet address space
az network vnet show \
  --resource-group my-rg \
  --name my-vnet \
  --query "addressSpace.addressPrefixes" \
  --output tsv

# Check if there is room to expand the subnet
# The new range must not overlap with other subnets
az network vnet subnet list \
  --resource-group my-rg \
  --vnet-name my-vnet \
  --query "[].{Name:name, Prefix:addressPrefix}" \
  --output table
```

If there is room, you can update the subnet prefix. Azure allows resizing a subnet that has active resources if the new range still includes all existing IP addresses. In practice, expansion is usually the safe fix; shrinking only works when it does not exclude any assigned IPs. Some delegated service subnets can also have service-specific constraints.

```bash
# Expand a /25 subnet to a /24
# Make sure no other subnet overlaps with the new range
az network vnet subnet update \
  --resource-group my-rg \
  --vnet-name my-vnet \
  --name my-subnet \
  --address-prefixes 10.0.1.0/24
```

If you cannot expand because adjacent subnets occupy the address space, you need a different approach.

## Solution 3: Add Address Space to the VNet

If the VNet's address space is fully allocated to subnets, add a new address prefix to the VNet and create a new subnet.

```bash
# Add a new address space to the VNet
az network vnet update \
  --resource-group my-rg \
  --name my-vnet \
  --address-prefixes 10.0.0.0/16 10.1.0.0/16

# Create a new subnet in the new address space
az network vnet subnet create \
  --resource-group my-rg \
  --vnet-name my-vnet \
  --name new-workload-subnet \
  --address-prefixes 10.1.0.0/24
```

Then migrate or deploy new resources to the new subnet. Existing resources stay on the old subnet.

## Solution 4: Use a Different Networking Plugin (AKS)

For AKS, the networking plugin makes a huge difference in IP consumption.

**Traditional Azure CNI**: Pod IPs are planned from the cluster subnet based on the configured maximum pods per node. A 3-node cluster with 30 maximum pods per node needs 93 IPs. This scales poorly for large clusters.

**Azure CNI Pod Subnet**: Nodes and pods use separate subnets, and pod IPs are allocated from the pod subnet. This improves IP utilization, but you still need to size the pod subnet for pod scale.

**Azure CNI Overlay**: Pods get IPs from a private CIDR range, not from the subnet. Only node IPs come from the subnet. A 3-node cluster uses just 3 subnet IPs regardless of pod count.

**Kubenet**: Similar to CNI Overlay - pods use a private range and nodes use NAT for pod traffic. Uses fewer subnet IPs but has some limitations.

```bash
# Create an AKS cluster with CNI Overlay to reduce IP consumption
az aks create \
  --resource-group my-rg \
  --name my-aks \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --pod-cidr 192.168.0.0/16 \
  --vnet-subnet-id "/subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.Network/virtualNetworks/my-vnet/subnets/aks-subnet"
```

If you are running traditional Azure CNI and hitting IP limits, migrating to CNI Overlay can be the long-term fix. Azure supports updating eligible existing clusters to Overlay with `az aks update`, but the process is irreversible and reimages node pools, so plan for the same kind of disruption you would expect from a node image or Kubernetes version upgrade.

## Solution 5: Plan Subnet Sizes Correctly

Prevention is better than remediation. Here are recommended subnet sizes for common Azure services:

| Service | Minimum Subnet Size | Recommended Size |
|---------|---------------------|------------------|
| General VMs | /28 (11 usable) | /24 (251 usable) |
| AKS with traditional Azure CNI | Size by nodes, surge, and max pods per node | /21 or larger for larger clusters |
| AKS with CNI Overlay | /27 | /24 |
| App Service VNet Integration | /28 | /26 |
| Application Gateway v2 | /24 recommended | /24 |
| Azure Firewall | /26 (required) | /26 |
| Azure Bastion | /26 (required) | /26 |
| VPN Gateway | /27 minimum | /27 |
| Private Endpoints | /27 | /24 |

A common VNet layout that provides room to grow:

```bash
# Create a VNet with a large address space
az network vnet create \
  --resource-group my-rg \
  --name production-vnet \
  --address-prefix 10.0.0.0/16

# Allocate subnets with growth in mind
az network vnet subnet create --resource-group my-rg --vnet-name production-vnet \
  --name web-subnet --address-prefixes 10.0.1.0/24

az network vnet subnet create --resource-group my-rg --vnet-name production-vnet \
  --name app-subnet --address-prefixes 10.0.2.0/24

az network vnet subnet create --resource-group my-rg --vnet-name production-vnet \
  --name data-subnet --address-prefixes 10.0.3.0/24

az network vnet subnet create --resource-group my-rg --vnet-name production-vnet \
  --name aks-subnet --address-prefixes 10.0.16.0/20

az network vnet subnet create --resource-group my-rg --vnet-name production-vnet \
  --name AzureFirewallSubnet --address-prefixes 10.0.4.0/26

az network vnet subnet create --resource-group my-rg --vnet-name production-vnet \
  --name AzureBastionSubnet --address-prefixes 10.0.4.64/26
```

Notice the AKS subnet gets a /20 (4091 usable IPs) to accommodate node and pod growth.

## Monitoring Subnet Utilization

Set up monitoring so you get warned before a subnet fills up, not after.

```bash
# Use Azure Resource Graph to check subnet utilization across your environment
az graph query -q "
Resources
| where type == 'microsoft.network/virtualnetworks'
| mv-expand subnet = properties.subnets
| extend subnetName = subnet.name
| extend addressPrefix = subnet.properties.addressPrefix
| extend usedIPs = array_length(subnet.properties.ipConfigurations)
| project name, subnetName, tostring(addressPrefix), usedIPs
| order by usedIPs desc
"
```

Consider setting up an Azure Monitor alert that triggers when a subnet reaches 80% utilization. This gives you time to expand before it becomes an emergency.

SubnetIsFull errors are almost always a planning problem. Allocate generously at the start, monitor utilization over time, and use networking options that conserve IP addresses. A few extra minutes of planning up front saves hours of emergency remediation later.
