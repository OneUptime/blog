# How to Create Azure Monitor Action Groups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Azure Monitor, Action Groups, Monitoring, Infrastructure as Code

Description: Learn how to create Azure Monitor action groups using Terraform to define notification channels and automated responses for alert handling.

---

Azure Monitor action groups are reusable collections of notification preferences and automated actions that you can attach to alert rules. They define what happens when an alert fires, whether that means sending an email, triggering a webhook, running an Azure Function, or creating an incident in your ITSM system. This guide shows you how to create and manage action groups with Terraform.

## Understanding Action Groups

An action group can contain multiple action types, and a single alert can trigger multiple action groups. This modular approach lets you compose notification strategies. For example, your critical alerts might trigger both an email group and a PagerDuty group, while warning alerts only trigger the email group.

## Setting Up the Provider

```hcl
# Configure the Azure provider
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

# Create a resource group for monitoring resources
resource "azurerm_resource_group" "monitoring" {
  name     = "rg-monitoring"
  location = "eastus"
}
```

## Basic Email and SMS Action Group

```hcl
# Create an action group with email and SMS notifications
resource "azurerm_monitor_action_group" "ops_team" {
  name                = "ops-team-notifications"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = "ops-notify"
  enabled             = true

  # Email notifications
  email_receiver {
    name                    = "ops-team-email"
    email_address           = var.ops_email
    use_common_alert_schema = true
  }

  email_receiver {
    name                    = "ops-lead-email"
    email_address           = var.ops_lead_email
    use_common_alert_schema = true
  }

  # SMS notifications for critical issues
  sms_receiver {
    name         = "ops-oncall-sms"
    country_code = "1"
    phone_number = var.oncall_phone
  }

  tags = {
    environment = "production"
    team        = "operations"
  }
}

variable "ops_email" {
  type = string
}

variable "ops_lead_email" {
  type = string
}

variable "oncall_phone" {
  type = string
}
```

## Webhook Action Group

```hcl
# Action group with webhook integrations
resource "azurerm_monitor_action_group" "webhooks" {
  name                = "webhook-notifications"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = "webhooks"
  enabled             = true

  # Slack webhook
  webhook_receiver {
    name                    = "slack-alerts"
    service_uri             = var.slack_webhook_url
    use_common_alert_schema = true
  }

  # PagerDuty webhook
  webhook_receiver {
    name                    = "pagerduty"
    service_uri             = var.pagerduty_webhook_url
    use_common_alert_schema = true
  }

  # Custom application webhook
  webhook_receiver {
    name                    = "custom-app"
    service_uri             = var.custom_webhook_url
    use_common_alert_schema = true
  }
}

variable "slack_webhook_url" {
  type      = string
  sensitive = true
}

variable "pagerduty_webhook_url" {
  type      = string
  sensitive = true
}

variable "custom_webhook_url" {
  type      = string
  sensitive = true
}
```

## Azure Function Action Group

```hcl
# Action group that triggers an Azure Function
resource "azurerm_monitor_action_group" "auto_remediation" {
  name                = "auto-remediation"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = "autofix"
  enabled             = true

  # Trigger an Azure Function for automated remediation
  azure_function_receiver {
    name                     = "restart-service"
    function_app_resource_id = var.function_app_id
    function_name            = "RestartService"
    http_trigger_url         = var.function_trigger_url
    use_common_alert_schema  = true
  }

  # Also send email notification about the auto-remediation
  email_receiver {
    name                    = "remediation-notification"
    email_address           = var.ops_email
    use_common_alert_schema = true
  }
}

variable "function_app_id" {
  type = string
}

variable "function_trigger_url" {
  type      = string
  sensitive = true
}
```

## Logic App Action Group

```hcl
# Action group that triggers a Logic App for complex workflows
resource "azurerm_monitor_action_group" "incident_workflow" {
  name                = "incident-workflow"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = "incident"
  enabled             = true

  # Trigger a Logic App for incident management
  logic_app_receiver {
    name                    = "create-incident"
    resource_id             = var.logic_app_id
    callback_url            = var.logic_app_callback_url
    use_common_alert_schema = true
  }

  # Send to ITSM system
  webhook_receiver {
    name                    = "itsm-integration"
    service_uri             = var.itsm_webhook_url
    use_common_alert_schema = true
  }
}

variable "logic_app_id" {
  type = string
}

variable "logic_app_callback_url" {
  type      = string
  sensitive = true
}

variable "itsm_webhook_url" {
  type      = string
  sensitive = true
}
```

## Tiered Alert Groups

Create different action groups for different severity levels:

```hcl
# Critical alerts - all channels
resource "azurerm_monitor_action_group" "critical" {
  name                = "critical-alerts"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = "critical"
  enabled             = true

  email_receiver {
    name                    = "team-email"
    email_address           = var.ops_email
    use_common_alert_schema = true
  }

  sms_receiver {
    name         = "oncall-sms"
    country_code = "1"
    phone_number = var.oncall_phone
  }

  webhook_receiver {
    name                    = "pagerduty-critical"
    service_uri             = var.pagerduty_webhook_url
    use_common_alert_schema = true
  }
}

# Warning alerts - email and Slack only
resource "azurerm_monitor_action_group" "warning" {
  name                = "warning-alerts"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = "warning"
  enabled             = true

  email_receiver {
    name                    = "team-email"
    email_address           = var.ops_email
    use_common_alert_schema = true
  }

  webhook_receiver {
    name                    = "slack-warnings"
    service_uri             = var.slack_webhook_url
    use_common_alert_schema = true
  }
}

# Informational alerts - email only
resource "azurerm_monitor_action_group" "info" {
  name                = "info-alerts"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = "info"
  enabled             = true

  email_receiver {
    name                    = "team-email"
    email_address           = var.ops_email
    use_common_alert_schema = true
  }
}
```

## Dynamic Action Groups

```hcl
# Create action groups dynamically from a variable
variable "action_groups" {
  type = map(object({
    short_name   = string
    emails       = list(string)
    webhook_urls = map(string)
  }))
  default = {
    "platform-team" = {
      short_name   = "platform"
      emails       = ["platform@company.com"]
      webhook_urls = {}
    }
    "security-team" = {
      short_name   = "security"
      emails       = ["security@company.com", "ciso@company.com"]
      webhook_urls = {}
    }
  }
}

resource "azurerm_monitor_action_group" "dynamic" {
  for_each = var.action_groups

  name                = "${each.key}-action-group"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = each.value.short_name
  enabled             = true

  dynamic "email_receiver" {
    for_each = each.value.emails
    content {
      name                    = "email-${email_receiver.key}"
      email_address           = email_receiver.value
      use_common_alert_schema = true
    }
  }

  dynamic "webhook_receiver" {
    for_each = each.value.webhook_urls
    content {
      name                    = webhook_receiver.key
      service_uri             = webhook_receiver.value
      use_common_alert_schema = true
    }
  }
}
```

## Best Practices

Always enable the common alert schema so all your action receivers get a consistent payload format regardless of the alert source. Create separate action groups for different severity levels and teams so you can compose them in different combinations. Test your action groups with a test alert before relying on them for production monitoring. Use short names that are easy to identify in the Azure portal. Keep webhook URLs in variables marked as sensitive to avoid exposing them in Terraform state.

For using action groups with metric alerts, see our guide on [Azure Monitor metric alerts](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-monitor-metric-alerts-in-terraform/view).

## Conclusion

Azure Monitor action groups managed through Terraform provide the notification backbone for your entire Azure monitoring strategy. By creating reusable, composable action groups, you can build sophisticated alert routing that ensures the right people get notified through the right channels at the right severity level. Terraform makes it easy to version-control these configurations and apply them consistently across environments.
