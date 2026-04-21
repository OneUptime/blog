# How to Create Azure VNet with IPv4 Subnets Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, VNet, Subnets, IPv4, Infrastructure as Code, Networking

Description: Create an Azure Virtual Network with IPv4 address space and multiple subnets using Terraform, covering address planning, service endpoints, and delegation.

## Introduction

Azure Virtual Networks (VNets) provide isolated IPv4 networking in Azure. Subnets partition the VNet address space and can host different workload tiers with associated NSGs and route tables.

## VNet and Subnets

```hcl
# vnet.tf

resource "azurerm_resource_group" "networking" {
  name     = "rg-networking-prod"
  location = "East US"
}

resource "azurerm_virtual_network" "main" {
  name                = "vnet-prod"
  address_space       = ["10.128.0.0/16"]
  location            = azurerm_resource_group.networking.location
  resource_group_name = azurerm_resource_group.networking.name

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "azurerm_subnet" "web" {
  name                 = "snet-web"
  resource_group_name  = azurerm_resource_group.networking.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.128.10.0/24"]
}

resource "azurerm_subnet" "app" {
  name                 = "snet-app"
  resource_group_name  = azurerm_resource_group.networking.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.128.20.0/24"]
}

resource "azurerm_subnet" "data" {
  name                 = "snet-data"
  resource_group_name  = azurerm_resource_group.networking.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.128.30.0/24"]

  # Service endpoints for Azure SQL and Storage
  service_endpoints = ["Microsoft.Sql", "Microsoft.Storage"]
}

resource "azurerm_subnet" "gateway" {
  name                 = "GatewaySubnet"  # Must be exactly "GatewaySubnet"
  resource_group_name  = azurerm_resource_group.networking.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.128.254.0/27"]
}
```

## Subnet with Delegation (for Azure services)

```hcl
resource "azurerm_subnet" "aks_nodes" {
  name                 = "snet-aks"
  resource_group_name  = azurerm_resource_group.networking.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.128.40.0/22"]

  delegation {
    name = "aks-delegation"
    service_delegation {
      name    = "Microsoft.ContainerService/managedClusters"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}
```

## VNet Peering

```hcl
resource "azurerm_virtual_network" "secondary" {
  name                = "vnet-secondary"
  address_space       = ["10.129.0.0/16"]
  location            = azurerm_resource_group.networking.location
  resource_group_name = azurerm_resource_group.networking.name
}

resource "azurerm_virtual_network_peering" "main_to_secondary" {
  name                      = "peer-main-to-secondary"
  resource_group_name       = azurerm_resource_group.networking.name
  virtual_network_name      = azurerm_virtual_network.main.name
  remote_virtual_network_id = azurerm_virtual_network.secondary.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
}

resource "azurerm_virtual_network_peering" "secondary_to_main" {
  name                      = "peer-secondary-to-main"
  resource_group_name       = azurerm_resource_group.networking.name
  virtual_network_name      = azurerm_virtual_network.secondary.name
  remote_virtual_network_id = azurerm_virtual_network.main.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
}
```

## Outputs

```hcl
output "vnet_id" {
  value = azurerm_virtual_network.main.id
}

output "subnet_ids" {
  value = {
    web  = azurerm_subnet.web.id
    app  = azurerm_subnet.app.id
    data = azurerm_subnet.data.id
  }
}
```

## Conclusion

Azure VNet Terraform configuration defines address space, then subnets as separate resources referencing the VNet. Use service endpoints with service-side network rules to restrict Azure PaaS service access to specific subnets, subnet delegation for managed Azure services (AKS, App Service), and the reserved `GatewaySubnet` name for VPN/ExpressRoute gateways. Subnets cannot overlap within a VNet.
