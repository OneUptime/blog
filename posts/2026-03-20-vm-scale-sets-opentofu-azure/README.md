# How to Deploy Azure VM Scale Sets with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, VM Scale Sets, Auto Scaling, Infrastructure as Code, Cloud

Description: Learn how to deploy and configure Azure Virtual Machine Scale Sets using OpenTofu to enable automatic scaling of Linux or Windows VMs based on demand.

## Introduction

Azure Virtual Machine Scale Sets (VMSS) allow you to deploy and manage a group of identical VMs with automatic scaling. Using OpenTofu to define your scale sets ensures consistent, reproducible infrastructure that can be version-controlled and deployed across environments.

## Provider Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Resource Group and Networking

```hcl
resource "azurerm_resource_group" "main" {
  name     = "vmss-rg"
  location = "East US"
}

resource "azurerm_virtual_network" "main" {
  name                = "vmss-vnet"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "internal" {
  name                 = "internal"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}
```

## Linux VM Scale Set

```hcl
resource "azurerm_linux_virtual_machine_scale_set" "app" {
  name                = "app-vmss"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Standard_DS1_v2"
  instances           = 2
  admin_username      = "adminuser"

  admin_ssh_key {
    username   = "adminuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-focal"
    sku       = "20_04-lts-gen2"
    version   = "latest"
  }

  os_disk {
    storage_account_type = "Premium_LRS"
    caching              = "ReadWrite"
  }

  network_interface {
    name    = "main"
    primary = true

    ip_configuration {
      name      = "internal"
      primary   = true
      subnet_id = azurerm_subnet.internal.id
    }
  }

  tags = {
    Environment = var.environment
  }
}
```

## Auto-Scaling Profile

```hcl
resource "azurerm_monitor_autoscale_setting" "app" {
  name                = "app-autoscale"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  target_resource_id  = azurerm_linux_virtual_machine_scale_set.app.id

  profile {
    name = "default"

    capacity {
      default = 2
      minimum = 1
      maximum = 10
    }

    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = azurerm_linux_virtual_machine_scale_set.app.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 75
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT1M"
      }
    }
  }
}
```

## Deploying

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

OpenTofu makes Azure VM Scale Set deployment repeatable and manageable as code. Combining scale set definitions with auto-scaling policies gives you elastic, cost-efficient infrastructure that grows with demand and scales down during quiet periods.
