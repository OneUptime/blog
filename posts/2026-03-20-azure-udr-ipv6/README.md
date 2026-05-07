# How to Configure Azure User-Defined Routes for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, UDR, User-Defined Routes, Routing, Network Virtual Appliance

Description: Create Azure User-Defined Routes (UDR) for IPv6 traffic, redirect IPv6 flows through network virtual appliances, and configure custom routing tables for dual-stack subnets.

## Introduction

Azure User-Defined Routes (UDRs) override the default system routes to control IPv6 traffic flow. You create route tables with IPv6 destination prefixes and assign them to subnets. Common UDR use cases for IPv6 include routing traffic through a Network Virtual Appliance (NVA) for inspection, creating forced tunneling to on-premises, or routing between VNets via an NVA.

## Create Route Table with IPv6 Routes

```bash
RG="rg-udr-ipv6"
LOCATION="eastus"

# Create route table

az network route-table create \
    --resource-group "$RG" \
    --name rt-spoke-ipv6 \
    --location "$LOCATION" \
    --disable-bgp-route-propagation true

# Add IPv6 default route through NVA
NVA_NEXT_HOP_IP="10.0.0.100"  # Example NVA private IP used as the next hop

az network route-table route create \
    --resource-group "$RG" \
    --route-table-name rt-spoke-ipv6 \
    --name route-ipv6-default \
    --address-prefix "::/0" \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address "$NVA_NEXT_HOP_IP"

# Add IPv4 default route through NVA
az network route-table route create \
    --resource-group "$RG" \
    --route-table-name rt-spoke-ipv6 \
    --name route-ipv4-default \
    --address-prefix "0.0.0.0/0" \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address "$NVA_NEXT_HOP_IP"

# Associate route table with subnet
az network vnet subnet update \
    --resource-group "$RG" \
    --vnet-name vnet-spoke \
    --name subnet-workload \
    --route-table rt-spoke-ipv6
```

## Terraform UDR with IPv6

```hcl
# udr_ipv6.tf

resource "azurerm_route_table" "spoke" {
  name                          = "rt-spoke"
  location                      = azurerm_resource_group.main.location
  resource_group_name           = azurerm_resource_group.main.name
  disable_bgp_route_propagation = true

  # IPv4 default route through the NVA
  route {
    name                   = "route-default-ipv4"
    address_prefix         = "0.0.0.0/0"
    next_hop_type          = "VirtualAppliance"
    next_hop_in_ip_address = "10.0.0.100"
  }

  # IPv6 default route through the NVA
  route {
    name                   = "route-default-ipv6"
    address_prefix         = "::/0"
    next_hop_type          = "VirtualAppliance"
    next_hop_in_ip_address = "10.0.0.100"
  }

  tags = { Name = "spoke-route-table" }
}

# Associate with spoke subnets
resource "azurerm_subnet_route_table_association" "spoke_web" {
  subnet_id      = azurerm_subnet.spoke_web.id
  route_table_id = azurerm_route_table.spoke.id
}

resource "azurerm_subnet_route_table_association" "spoke_app" {
  subnet_id      = azurerm_subnet.spoke_app.id
  route_table_id = azurerm_route_table.spoke.id
}
```

## Verify Effective Routes

```bash
# Check effective routes for a NIC (shows UDR overrides)
NIC_ID=$(az vm show \
    --resource-group "$RG" \
    --name vm-workload \
    --query "networkProfile.networkInterfaces[0].id" \
    --output tsv)

# Show effective routes including IPv6
az network nic show-effective-route-table \
    --ids "$NIC_ID" \
    --query "value[?contains(addressPrefix[0], ':')].{prefix:addressPrefix[0], source:source, nextHopType:nextHopType, nextHopIp:nextHopIpAddress[0]}"
```

## Hub-Spoke UDR Design for IPv6

```text
Hub VNet (fd00:100::/48)
  ├── NVA subnet: fd00:100:1::/64
  └── GatewaySubnet: fd00:100:2::/64

Spoke A VNet (fd00:101::/48)
  ├── Route table: ::/0 → NVA private IP
  └── workloads

Spoke B VNet (fd00:102::/48)
  ├── Route table: ::/0 → NVA private IP
  └── workloads

Note: Use a directly reachable private IP address for the VirtualAppliance next hop
The NVA itself must support IPv6 forwarding for dual-stack traffic
```

## Conclusion

Azure UDRs for IPv6 use the same mechanism as IPv4 routes - create route entries with `::/0` or specific IPv6 prefixes and assign them to subnets. For `VirtualAppliance` routes, specify a directly reachable private IP address for the NVA and make sure the appliance is configured to forward IPv6 traffic. Use a general NVA for IPv6 inspection rather than Azure Firewall, because Azure Firewall doesn't currently support IPv6 traffic inspection. Check effective routes on NICs with `az network nic show-effective-route-table` to verify IPv6 UDR overrides are applied correctly.
