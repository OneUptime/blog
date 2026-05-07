# How to Create Azure VM Scale Sets with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, VM Scale Sets, Auto Scaling, VMSS, High Availability, Infrastructure as Code

Description: Learn how to create Azure Virtual Machine Scale Sets with OpenTofu to automatically scale VM capacity based on demand, enabling elastic compute for variable workloads.

## Introduction

Azure Virtual Machine Scale Sets (VMSS) allow you to deploy and manage a set of identical, auto-scaling VMs. Scale sets automatically increase or decrease the number of VM instances based on demand or a defined schedule. They integrate with Azure Load Balancer and Application Gateway for traffic distribution. Azure also supports flexible orchestration mode for advanced scenarios such as mixing VM types and sizes, but the resource used in this example creates a uniform scale set. Scale sets are the foundation for auto-scaling application tiers.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured
- A Resource Group, Virtual Network, Subnet, and Standard Load Balancer with a frontend IP configuration named `frontend` and a backend pool

## Step 1: Create Linux VM Scale Set

```hcl
resource "azurerm_linux_virtual_machine_scale_set" "app" {
  name                = "${var.project_name}-vmss"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "Standard_D2s_v3"

  # Initial instance count
  instances = 2

  admin_username                  = "azureuser"
  disable_password_authentication = true

  admin_ssh_key {
    username   = "azureuser"
    public_key = var.ssh_public_key
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  os_disk {
    storage_account_type = "Premium_LRS"
    caching              = "ReadWrite"
  }

  network_interface {
    name    = "primary"
    primary = true

    ip_configuration {
      name                                   = "internal"
      primary                                = true
      subnet_id                              = var.subnet_id
      load_balancer_backend_address_pool_ids = [azurerm_lb_backend_address_pool.main.id]
    }
  }

  # Upgrade policy - how updates are rolled out
  upgrade_mode    = "Rolling"
  health_probe_id = azurerm_lb_probe.http.id

  rolling_upgrade_policy {
    max_batch_instance_percent              = 20
    max_unhealthy_instance_percent          = 20
    max_unhealthy_upgraded_instance_percent = 5
    pause_time_between_batches              = "PT0S"
  }

  automatic_os_upgrade_policy {
    enable_automatic_os_upgrade = true
    disable_automatic_rollback  = false
  }

  identity {
    type = "SystemAssigned"
  }

  lifecycle {
    ignore_changes = [instances]
  }

  tags = {
    Name = "${var.project_name}-vmss"
  }

  depends_on = [azurerm_lb_rule.http]
}
```

## Step 2: Configure Autoscaling

```hcl
resource "azurerm_monitor_autoscale_setting" "app" {
  name                = "${var.project_name}-autoscale"
  resource_group_name = var.resource_group_name
  location            = var.location
  target_resource_id  = azurerm_linux_virtual_machine_scale_set.app.id

  profile {
    name = "default"

    capacity {
      default = 2
      minimum = 2
      maximum = 10
    }

    # Scale out when CPU > 75%
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
        value     = "2"
        cooldown  = "PT5M"
      }
    }

    # Scale in when CPU < 25%
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
  }

  notification {
    email {
      send_to_subscription_administrator    = false
      send_to_subscription_co_administrator = false
      custom_emails                         = [var.alert_email]
    }
  }
}
```

## Step 3: Health Probe for Scale Set

```hcl
resource "azurerm_lb_probe" "http" {
  loadbalancer_id = azurerm_lb.main.id
  name            = "http-health"
  protocol        = "Http"
  port            = 80
  request_path    = "/health"
  interval_in_seconds = 5
  number_of_probes    = 2
}

resource "azurerm_lb_rule" "http" {
  loadbalancer_id                = azurerm_lb.main.id
  name                           = "http"
  protocol                       = "Tcp"
  frontend_port                  = 80
  backend_port                   = 80
  frontend_ip_configuration_name = "frontend"
  backend_address_pool_ids       = [azurerm_lb_backend_address_pool.main.id]
  probe_id                       = azurerm_lb_probe.http.id
  load_distribution              = "SourceIPProtocol"
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check current instance count

az vmss show \
  --resource-group <rg> \
  --name <vmss-name> \
  --query "sku.capacity"

# Manually scale
az vmss scale \
  --resource-group <rg> \
  --name <vmss-name> \
  --new-capacity 5

# List instances
az vmss list-instances \
  --resource-group <rg> \
  --name <vmss-name> \
  --output table
```

## Conclusion

Use `upgrade_mode = "Rolling"` in production to update VMs in batches without taking down the entire fleet-combine with `automatic_os_upgrade_policy` to keep OS patches current. Set the minimum capacity in autoscale to at least 2 to maintain availability during single VM failures. The scale-out cooldown should be shorter than scale-in cooldown to react quickly to load spikes but avoid thrashing during transient traffic variations. Use `instances` to set the initial count, but let autoscaling manage runtime capacity once deployed by ignoring changes to `instances` in the VMSS resource.
