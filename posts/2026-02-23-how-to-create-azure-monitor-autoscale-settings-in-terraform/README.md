# How to Create Azure Monitor Autoscale Settings in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Azure Monitor, Autoscale, Monitoring, Infrastructure as Code

Description: Learn how to create Azure Monitor autoscale settings using Terraform to automatically scale your resources based on metrics and schedules.

---

Azure Monitor autoscale automatically adjusts the number of resource instances based on metric thresholds, schedules, or both. It supports Virtual Machine Scale Sets, App Services, Cloud Services, and more. Managing autoscale rules through Terraform ensures your scaling behavior is consistent, predictable, and version-controlled. This guide shows you how.

## Understanding Autoscale

Azure autoscale works through profiles, rules, and notifications. A profile defines the capacity limits (minimum, maximum, and default instance count). Rules define the conditions that trigger scale-out or scale-in actions. You can have multiple profiles, including schedule-based profiles for predictable load patterns.

## Setting Up the Foundation

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

resource "azurerm_resource_group" "main" {
  name     = "rg-autoscale"
  location = "eastus"
}
```

## App Service Autoscale

```hcl
# Create an App Service Plan to autoscale
resource "azurerm_service_plan" "main" {
  name                = "asp-production"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "S1"
}

# Configure autoscale for the App Service Plan
resource "azurerm_monitor_autoscale_setting" "app_service" {
  name                = "app-service-autoscale"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  target_resource_id  = azurerm_service_plan.main.id
  enabled             = true

  # Default profile with metric-based scaling
  profile {
    name = "default-profile"

    capacity {
      default = 2
      minimum = 2
      maximum = 10
    }

    # Scale out when CPU exceeds 70%
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.main.id
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

    # Scale in when CPU drops below 30%
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.main.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT10M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 30
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
        metric_name        = "MemoryPercentage"
        metric_resource_id = azurerm_service_plan.main.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 80
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }
  }

  # Notification settings
  notification {
    email {
      send_to_subscription_administrator    = true
      send_to_subscription_co_administrator = false
      custom_emails                         = [var.ops_email]
    }

    webhook {
      service_uri = var.webhook_url
    }
  }
}

variable "ops_email" {
  type = string
}

variable "webhook_url" {
  type      = string
  sensitive = true
}
```

## Schedule-Based Autoscale

```hcl
# Autoscale with schedule-based profiles
resource "azurerm_monitor_autoscale_setting" "scheduled" {
  name                = "scheduled-autoscale"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  target_resource_id  = azurerm_service_plan.main.id
  enabled             = true

  # Business hours profile (higher capacity)
  profile {
    name = "business-hours"

    capacity {
      default = 4
      minimum = 4
      maximum = 10
    }

    # Scale out on high CPU during business hours
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.main.id
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

    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.main.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT10M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 30
      }

      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT10M"
      }
    }

    # Active Monday through Friday, 8 AM to 6 PM UTC
    recurrence {
      timezone = "UTC"
      days     = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
      hours    = [8]
      minutes  = [0]
    }
  }

  # Off-hours profile (lower capacity)
  profile {
    name = "off-hours"

    capacity {
      default = 2
      minimum = 1
      maximum = 4
    }

    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.main.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 80
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }

    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.main.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT10M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 20
      }

      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT10M"
      }
    }

    # Active during off-hours
    recurrence {
      timezone = "UTC"
      days     = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
      hours    = [18]
      minutes  = [0]
    }
  }

  notification {
    email {
      custom_emails = [var.ops_email]
    }
  }
}
```

## VMSS Autoscale

```hcl
# Autoscale for Virtual Machine Scale Sets
resource "azurerm_monitor_autoscale_setting" "vmss" {
  name                = "vmss-autoscale"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  target_resource_id  = var.vmss_id
  enabled             = true

  profile {
    name = "default"

    capacity {
      default = 3
      minimum = 2
      maximum = 20
    }

    # Scale on CPU
    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = var.vmss_id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 75
      }

      scale_action {
        direction = "Increase"
        type      = "PercentChangeCount"
        value     = "50"
        cooldown  = "PT5M"
      }
    }

    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = var.vmss_id
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
      custom_emails = [var.ops_email]
    }
  }
}

variable "vmss_id" {
  type = string
}
```

## Best Practices

Always pair scale-out rules with corresponding scale-in rules to prevent resources from growing without bound. Set scale-in cooldowns longer than scale-out cooldowns to prevent flapping. Use a time window longer than the time grain for stable metric readings. Start with conservative scaling (small increments) and adjust based on observed behavior. Enable notifications so your team knows when scaling events occur. Test autoscale rules in a non-production environment first.

For monitoring the resources that autoscale manages, see our guide on [Azure Monitor metric alerts](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-monitor-metric-alerts-in-terraform/view).

## Conclusion

Azure Monitor autoscale settings managed through Terraform give you predictable, version-controlled scaling behavior. By combining metric-based rules with schedule-based profiles, you can handle both unexpected load spikes and predictable traffic patterns. The key is getting the right balance between responsiveness and stability through careful threshold and cooldown configuration.
