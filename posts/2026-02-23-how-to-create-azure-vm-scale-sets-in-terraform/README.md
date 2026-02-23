# How to Create Azure VM Scale Sets in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, VM Scale Sets, Auto Scaling, Compute, Infrastructure as Code

Description: Learn how to create Azure Virtual Machine Scale Sets with Terraform for automatic scaling, rolling upgrades, and high-availability compute workloads.

---

Azure Virtual Machine Scale Sets (VMSS) let you deploy and manage a group of identical VMs that automatically scale based on demand. Instead of manually adding or removing VMs as traffic changes, the scale set handles it for you. Combined with a load balancer, VMSS provides a resilient, elastic compute tier for your applications.

Terraform is particularly well suited for managing scale sets because the configuration captures everything - the VM template, scaling rules, upgrade policy, and networking - in one place. This guide covers creating Linux and Windows scale sets, configuring autoscale rules, and setting up rolling upgrades.

## Prerequisites

- Terraform 1.0 or later
- Azure CLI authenticated
- An existing VNet and subnet
- An SSH key pair for Linux scale sets

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

variable "location" {
  default = "East US"
}
```

## Networking Foundation

```hcl
resource "azurerm_resource_group" "vmss" {
  name     = "rg-vmss-prod-eus"
  location = var.location

  tags = {
    Environment = "production"
  }
}

resource "azurerm_virtual_network" "main" {
  name                = "vnet-vmss-prod"
  location            = azurerm_resource_group.vmss.location
  resource_group_name = azurerm_resource_group.vmss.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "vmss" {
  name                 = "snet-vmss"
  resource_group_name  = azurerm_resource_group.vmss.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}
```

## Load Balancer

Scale sets work best behind a load balancer:

```hcl
# Public IP for the load balancer
resource "azurerm_public_ip" "lb" {
  name                = "pip-lb-vmss-prod"
  location            = azurerm_resource_group.vmss.location
  resource_group_name = azurerm_resource_group.vmss.name
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = {
    Environment = "production"
  }
}

# Load balancer
resource "azurerm_lb" "vmss" {
  name                = "lb-vmss-prod"
  location            = azurerm_resource_group.vmss.location
  resource_group_name = azurerm_resource_group.vmss.name
  sku                 = "Standard"

  frontend_ip_configuration {
    name                 = "frontend"
    public_ip_address_id = azurerm_public_ip.lb.id
  }

  tags = {
    Environment = "production"
  }
}

# Backend pool for VMSS instances
resource "azurerm_lb_backend_address_pool" "vmss" {
  loadbalancer_id = azurerm_lb.vmss.id
  name            = "vmss-backend-pool"
}

# Health probe
resource "azurerm_lb_probe" "http" {
  loadbalancer_id = azurerm_lb.vmss.id
  name            = "http-probe"
  protocol        = "Http"
  port            = 80
  request_path    = "/health"
}

# Load balancing rule
resource "azurerm_lb_rule" "http" {
  loadbalancer_id                = azurerm_lb.vmss.id
  name                           = "http-rule"
  protocol                       = "Tcp"
  frontend_port                  = 80
  backend_port                   = 80
  frontend_ip_configuration_name = "frontend"
  backend_address_pool_ids       = [azurerm_lb_backend_address_pool.vmss.id]
  probe_id                       = azurerm_lb_probe.http.id

  # Enable session persistence if needed
  load_distribution = "Default"
}

# NAT rule for SSH access (port 50000+ maps to each instance)
resource "azurerm_lb_nat_pool" "ssh" {
  resource_group_name            = azurerm_resource_group.vmss.name
  loadbalancer_id                = azurerm_lb.vmss.id
  name                           = "ssh-nat-pool"
  protocol                       = "Tcp"
  frontend_port_start            = 50000
  frontend_port_end              = 50119
  backend_port                   = 22
  frontend_ip_configuration_name = "frontend"
}
```

## Creating a Linux VM Scale Set

```hcl
resource "azurerm_linux_virtual_machine_scale_set" "app" {
  name                = "vmss-app-prod"
  location            = azurerm_resource_group.vmss.location
  resource_group_name = azurerm_resource_group.vmss.name

  # SKU and initial instance count
  sku       = "Standard_D2s_v3"
  instances = 2

  # Admin credentials
  admin_username = "azureuser"

  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  disable_password_authentication = true

  # Spread across availability zones
  zones        = ["1", "2", "3"]
  zone_balance = true

  # Upgrade policy - Manual, Automatic, or Rolling
  upgrade_mode = "Rolling"

  # Rolling upgrade configuration
  rolling_upgrade_policy {
    max_batch_instance_percent              = 20
    max_unhealthy_instance_percent          = 20
    max_unhealthy_upgraded_instance_percent = 5
    pause_time_between_batches              = "PT1M"
  }

  # Health probe for rolling upgrades
  health_probe_id = azurerm_lb_probe.http.id

  # Automatic instance repair
  automatic_instance_repair {
    enabled      = true
    grace_period = "PT30M"
  }

  # OS image
  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  # OS disk
  os_disk {
    storage_account_type = "Premium_LRS"
    caching              = "ReadWrite"
    disk_size_gb         = 64
  }

  # Data disk (optional)
  data_disk {
    lun                  = 0
    caching              = "ReadWrite"
    create_option        = "Empty"
    disk_size_gb         = 100
    storage_account_type = "Premium_LRS"
  }

  # Network interface configuration
  network_interface {
    name    = "nic-vmss"
    primary = true

    ip_configuration {
      name                                   = "internal"
      primary                                = true
      subnet_id                              = azurerm_subnet.vmss.id
      load_balancer_backend_address_pool_ids = [azurerm_lb_backend_address_pool.vmss.id]
      load_balancer_inbound_nat_rules_ids    = [azurerm_lb_nat_pool.ssh.id]
    }
  }

  # Custom data for initial configuration
  custom_data = base64encode(<<-EOF
    #cloud-config
    package_update: true
    packages:
      - nginx
    runcmd:
      - systemctl enable nginx
      - systemctl start nginx
  EOF
  )

  # Boot diagnostics
  boot_diagnostics {}

  # Automatic OS upgrades
  automatic_os_upgrade_policy {
    disable_automatic_rollback  = false
    enable_automatic_os_upgrade = true
  }

  tags = {
    Environment = "production"
    Workload    = "web-app"
  }
}
```

## Autoscale Configuration

Define rules that automatically adjust the instance count:

```hcl
# Autoscale settings for the VMSS
resource "azurerm_monitor_autoscale_setting" "app" {
  name                = "autoscale-vmss-app"
  location            = azurerm_resource_group.vmss.location
  resource_group_name = azurerm_resource_group.vmss.name
  target_resource_id  = azurerm_linux_virtual_machine_scale_set.app.id

  # Default profile for normal operation
  profile {
    name = "default"

    capacity {
      default = 2
      minimum = 2
      maximum = 10
    }

    # Scale out on high CPU
    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = azurerm_linux_virtual_machine_scale_set.app.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 70
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "2"
        cooldown  = "PT5M"
      }
    }

    # Scale in on low CPU
    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = azurerm_linux_virtual_machine_scale_set.app.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT10M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 25
      }

      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT10M"
      }
    }

    # Scale out on high memory
    rule {
      metric_trigger {
        metric_name        = "Available Memory Bytes"
        metric_resource_id = azurerm_linux_virtual_machine_scale_set.app.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 1073741824  # 1 GB
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }
  }

  # Scheduled profile for known peak hours
  profile {
    name = "peak-hours"

    capacity {
      default = 5
      minimum = 5
      maximum = 15
    }

    # Same rules but with higher baseline
    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = azurerm_linux_virtual_machine_scale_set.app.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 70
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "3"
        cooldown  = "PT5M"
      }
    }

    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = azurerm_linux_virtual_machine_scale_set.app.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT10M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 25
      }

      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT10M"
      }
    }

    # Recurrence schedule - weekdays 8 AM to 6 PM EST
    recurrence {
      timezone = "Eastern Standard Time"
      days     = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
      hours    = [8]
      minutes  = [0]
    }
  }

  # Notifications on scale events
  notification {
    email {
      custom_emails                         = ["ops-team@example.com"]
      send_to_subscription_administrator    = false
      send_to_subscription_co_administrator = false
    }
  }

  tags = {
    Environment = "production"
  }
}
```

## Outputs

```hcl
output "vmss_id" {
  description = "ID of the VM Scale Set"
  value       = azurerm_linux_virtual_machine_scale_set.app.id
}

output "vmss_name" {
  description = "Name of the VM Scale Set"
  value       = azurerm_linux_virtual_machine_scale_set.app.name
}

output "lb_public_ip" {
  description = "Public IP of the load balancer"
  value       = azurerm_public_ip.lb.ip_address
}
```

## Monitoring Scale Sets

Autoscaling is only as good as the metrics driving it. Use OneUptime to monitor both the infrastructure metrics (CPU, memory, network) and application-level health (response times, error rates). Sometimes the scale set adds instances but the application is not actually handling more load - that points to a bottleneck somewhere else entirely.

## Tips and Gotchas

- Rolling upgrades require a health probe. Without one, Azure cannot tell if an instance is healthy after the upgrade.
- The cooldown period on scale rules prevents rapid oscillation. Set it long enough to let new instances warm up and start serving traffic.
- Zone balancing distributes instances evenly across availability zones. If one zone has a capacity issue, new instances will go to other zones.
- Changing the OS image or data disk configuration in a scale set does not automatically update existing instances. Use the `upgrade_mode` setting to control how updates are applied.

## Summary

VM Scale Sets are the right choice when you need elastic compute that responds to demand automatically. Terraform captures the full configuration - VM template, networking, load balancing, and autoscale rules - in a single, reviewable file. Start with CPU-based scaling rules and add memory and custom metrics as you learn your application's behavior. The rolling upgrade policy ensures you can update your application without downtime.
