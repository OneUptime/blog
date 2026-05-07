# How to Create a Virtual Network with OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Virtual Network, Networking, Infrastructure as Code

Description: Learn how to create an Azure Virtual Network with OpenTofu including address spaces and DNS configuration.

## Introduction

An Azure Virtual Network (VNet) is the networking foundation for Azure resources. It provides isolation, segmentation, and connectivity for VMs, App Services, and other Azure services.

## Core Configuration

```hcl
resource "azurerm_virtual_network" "main" {
  name                = "vnet-${var.name}-${var.environment}"
  address_space       = [var.vnet_cidr]
  location            = var.location
  resource_group_name = var.resource_group_name

  dns_servers = var.custom_dns_servers

  tags = { Name = var.name, Environment = var.environment }
}

output "vnet_id"   { value = azurerm_virtual_network.main.id }
output "vnet_name" { value = azurerm_virtual_network.main.name }
```

## Variables

```hcl
variable "resource_group_name" { type = string }
variable "location" {
  type    = string
  default = "East US"
}
variable "environment"         { type = string }
variable "name"                { type = string }
variable "vnet_cidr"           { type = string }
variable "custom_dns_servers" {
  type    = list(string)
  default = []
}
```

## Outputs

```hcl
output "id"   { value = azurerm_virtual_network.main.id }
output "name" { value = azurerm_virtual_network.main.name }
```

## Conclusion

Managing Azure resources with OpenTofu provides reproducible, version-controlled infrastructure. Always tag resources consistently and use separate resource groups per tier for cost allocation and access control.
