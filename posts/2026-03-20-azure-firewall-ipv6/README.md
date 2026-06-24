# How to Configure Azure Firewall with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, Azure Firewall, Network Security, Dual-Stack, Hub-Spoke

Description: Configure Azure Firewall with IPv6 support for hub-spoke network architectures, creating network rules that allow and deny IPv6 traffic through the centralized firewall.

## Introduction

Azure Firewall Standard and Premium don't currently support IPv6 addresses in firewall rules. You can deploy Azure Firewall in a dual-stack VNet, but the AzureFirewallSubnet must remain IPv4-only and the firewall filters only IPv4 traffic. This is important for organizations deploying dual-stack Azure networks with centralized security inspection because IPv6 traffic requires other supported controls until Azure Firewall adds IPv6 support.

## Deploy Azure Firewall in a Dual-Stack VNet

```bash
RG="rg-firewall"
LOCATION="eastus"

az group create \
    --name "$RG" \
    --location "$LOCATION"

# Hub VNet with dual-stack address space
az network vnet create \
    --resource-group "$RG" \
    --location "$LOCATION" \
    --name vnet-hub \
    --address-prefixes "10.0.0.0/16" "fd00:100::/48"

# AzureFirewallSubnet must be IPv4-only and /26 minimum
az network vnet subnet create \
    --resource-group "$RG" \
    --vnet-name vnet-hub \
    --name AzureFirewallSubnet \
    --address-prefixes "10.0.0.0/26"

# Workload subnet can be dual-stack
az network vnet subnet create \
    --resource-group "$RG" \
    --vnet-name vnet-hub \
    --name WorkloadSubnet \
    --address-prefixes "10.0.1.0/24" "fd00:100:0:1::/64"

# Create IPv4 public IP for firewall
az network public-ip create \
    --resource-group "$RG" \
    --name pip-fw-ipv4 \
    --location "$LOCATION" \
    --allocation-method Static \
    --version IPv4 \
    --sku Standard

# Create Azure Firewall and attach it to the hub VNet
az network firewall create \
    --resource-group "$RG" \
    --name fw-hub \
    --location "$LOCATION" \
    --sku AZFW_VNet \
    --tier Premium

az network firewall ip-config create \
    --resource-group "$RG" \
    --firewall-name fw-hub \
    --name fw-ipconfig \
    --vnet-name vnet-hub \
    --public-ip-address pip-fw-ipv4

az network firewall update \
    --resource-group "$RG" \
    --name fw-hub

# Azure Firewall rules currently support IPv4 only
az network firewall network-rule create \
    --resource-group "$RG" \
    --firewall-name fw-hub \
    --collection-name "allow-ipv4-outbound" \
    --name "allow-http-ipv4" \
    --priority 100 \
    --action Allow \
    --protocols TCP \
    --source-addresses "10.0.1.0/24" \
    --destination-addresses "*" \
    --destination-ports 80 443
```

## Terraform Azure Firewall in a Dual-Stack VNet

```hcl
# azure_firewall_dual_stack.tf

resource "azurerm_virtual_network" "main" {
  name                = "vnet-hub"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["10.0.0.0/16", "fd00:100::/48"]
}

resource "azurerm_subnet" "firewall" {
  name                 = "AzureFirewallSubnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.0.0/26"]
}

resource "azurerm_subnet" "workload" {
  name                 = "workload-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24", "fd00:100:0:1::/64"]
}

resource "azurerm_public_ip" "firewall_ipv4" {
  name                = "pip-fw-ipv4"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
  ip_version          = "IPv4"
}

resource "azurerm_firewall" "hub" {
  name                = "fw-hub"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = "AZFW_VNet"
  sku_tier            = "Premium"
  firewall_policy_id  = azurerm_firewall_policy.main.id

  ip_configuration {
    name                 = "fw-ipconfig"
    subnet_id            = azurerm_subnet.firewall.id
    public_ip_address_id = azurerm_public_ip.firewall_ipv4.id
  }

  tags = { Name = "hub-firewall" }
}

# Firewall Policy with IPv4 rules
resource "azurerm_firewall_policy" "main" {
  name                = "fw-policy"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Premium"
}

resource "azurerm_firewall_policy_rule_collection_group" "main" {
  name               = "main-rules"
  firewall_policy_id = azurerm_firewall_policy.main.id
  priority           = 100

  network_rule_collection {
    name     = "allow-ipv4-outbound"
    priority = 100
    action   = "Allow"

    rule {
      name                  = "allow-http-ipv4"
      protocols             = ["TCP"]
      source_addresses      = ["10.0.1.0/24"]
      destination_addresses = ["*"]
      destination_ports     = ["80", "443"]
    }

    rule {
      name                  = "allow-dns-ipv4"
      protocols             = ["TCP", "UDP"]
      source_addresses      = ["10.0.1.0/24"]
      destination_addresses = ["*"]
      destination_ports     = ["53"]
    }
  }
}
```

## Route Traffic Through Firewall

```bash
# Route table to send IPv4 workload traffic through the firewall
FW_IPV4=$(az network firewall ip-config list \
    --resource-group "$RG" \
    --firewall-name fw-hub \
    --query "[?name=='fw-ipconfig'].privateIpAddress" \
    --output tsv)

az network route-table create \
    --resource-group "$RG" \
    --name rt-workload \
    --location "$LOCATION"

az network route-table route create \
    --resource-group "$RG" \
    --route-table-name rt-workload \
    --name route-ipv4-default-to-fw \
    --address-prefix "0.0.0.0/0" \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address "$FW_IPV4"

az network vnet subnet update \
    --resource-group "$RG" \
    --vnet-name vnet-hub \
    --name WorkloadSubnet \
    --address-prefixes "10.0.1.0/24" "fd00:100:0:1::/64" \
    --route-table rt-workload

# Azure Firewall doesn't currently support IPv6 rules or IPv6 inspection.
# Don't route IPv6 traffic to Azure Firewall expecting IPv6 filtering.
```

## Conclusion

Azure Firewall can be deployed in a dual-stack hub VNet, but it currently supports only IPv4 firewall rules and an IPv4-only AzureFirewallSubnet. Use user-defined routes to send IPv4 spoke traffic through the firewall, and plan separate IPv6 controls until Azure Firewall adds IPv6 support. Azure Firewall Premium features such as IDPS apply to the IPv4 traffic that the firewall can inspect today.
