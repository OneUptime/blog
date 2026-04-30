# How to Deploy Highly Available Applications with OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, High Availability, OpenTofu, Availability Zone, VMSS, App Service

Description: Learn how to deploy highly available applications on Azure using OpenTofu with Availability Zones, Virtual Machine Scale Sets, and zone-redundant load balancers.

## Overview

High availability on Azure distributes workloads across Availability Zones within a region, uses VMSS or zone-redundant App Service for resilient multi-instance hosting, and Standard Load Balancer for zone-redundant traffic distribution.

## Step 1: Zone-Redundant App Service

```hcl
# main.tf - Zone-redundant App Service Plan

resource "azurerm_service_plan" "ha" {
  name                = "ha-app-plan"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "P1v3"

  # Zone balancing distributes across AZs automatically
  zone_balancing_enabled = true  # Requires a plan and region that support zone redundancy
  worker_count           = 3     # Example count; use a multiple of your region's available zones
}

resource "azurerm_linux_web_app" "ha" {
  name                = "ha-app"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  service_plan_id     = azurerm_service_plan.ha.id
  https_only          = true

  site_config {
    always_on = true

    health_check_path                 = "/health"
    health_check_eviction_time_in_min = 2  # Evict unhealthy instances after 2 minutes
  }

  app_settings = {
    WEBSITE_HEALTHCHECK_MAXPINGFAILURES = "10"
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.insights.connection_string
  }
}
```

## Step 2: Virtual Machine Scale Set (VMSS)

```hcl
# VMSS across multiple zones
resource "azurerm_linux_virtual_machine_scale_set" "ha_vmss" {
  name                = "ha-app-vmss"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Standard_D4s_v3"
  instances           = 3

  # Spread across all availability zones
  zones               = ["1", "2", "3"]
  zone_balance        = true  # Even distribution across zones

  upgrade_mode = "Rolling"

  admin_username = "azureuser"
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
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  network_interface {
    name    = "ha-nic"
    primary = true

    ip_configuration {
      name                                   = "ha-ipconfig"
      primary                                = true
      subnet_id                              = azurerm_subnet.app.id
      load_balancer_backend_address_pool_ids = [azurerm_lb_backend_address_pool.vmss.id]
    }
  }

  health_probe_id = azurerm_lb_probe.health.id

  # Automatic OS image upgrades
  automatic_os_upgrade_policy {
    disable_automatic_rollback  = false
    enable_automatic_os_upgrade = true
  }

  automatic_instance_repair {
    enabled      = true
    grace_period = "PT10M"
    action       = "Replace"
  }

  rolling_upgrade_policy {
    max_batch_instance_percent              = 20
    max_unhealthy_instance_percent          = 20
    max_unhealthy_upgraded_instance_percent = 5
    pause_time_between_batches              = "PT2M"
  }

}
```

## Step 3: Zone-Redundant Load Balancer

```hcl
# Standard SKU Load Balancer with a zone-redundant frontend
resource "azurerm_lb" "ha" {
  name                = "ha-app-lb"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Standard"  # Standard is required for availability zones

  frontend_ip_configuration {
    name                 = "ha-frontend"
    public_ip_address_id = azurerm_public_ip.lb.id
    zones                = ["1", "2", "3"]  # Zone-redundant frontend
  }
}

resource "azurerm_lb_probe" "health" {
  loadbalancer_id = azurerm_lb.ha.id
  name            = "health-probe"
  port            = 8080
  protocol        = "Http"
  request_path    = "/health"
  interval_in_seconds = 15
  number_of_probes    = 3
}
```

## Summary

Highly available applications on Azure built with OpenTofu use zone-redundant services to protect against datacenter failures within a region. App Service Premium v3 with `zone_balancing_enabled` distributes instances across zones automatically. VMSS with `zone_balance = true`, `upgrade_mode = "Rolling"`, a load balancer health probe, and `automatic_instance_repair` can replace unhealthy instances while using the same health signal for rolling and automatic OS image upgrades.
