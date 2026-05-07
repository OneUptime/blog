# How to Set Up Azure Activity Log Exports with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Activity Logs, Monitoring, Compliance, Infrastructure as Code

Description: Learn how to export Azure Activity Logs to Log Analytics, Storage Accounts, and Event Hubs using OpenTofu for centralized audit logging and compliance.

Azure Activity Logs record subscription-level control plane events including resource creation, deletion, configuration changes, service health events, and security alerts. Azure retains these events for 90 days by default. Exporting them to a centralized destination ensures your audit trail is preserved and queryable. Managing exports in OpenTofu ensures every subscription has consistent log routing from day one.

## Provider Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  subscription_id = var.subscription_id
  features {}
}
```

## Export to Log Analytics Workspace

```hcl
resource "azurerm_log_analytics_workspace" "main" {
  name                = "central-logs-workspace"
  location            = var.location
  resource_group_name = azurerm_resource_group.monitoring.name
  sku                 = "PerGB2018"
  retention_in_days   = 90

  tags = {
    Purpose = "Centralized audit logging"
  }
}

# Diagnostic setting to export subscription activity logs

resource "azurerm_monitor_diagnostic_setting" "activity_logs" {
  name               = "export-activity-logs"
  target_resource_id = "/subscriptions/${var.subscription_id}"

  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "Administrative"  # Resource create, update, delete
  }

  enabled_log {
    category = "Security"  # Microsoft Defender for Cloud alerts
  }

  enabled_log {
    category = "ServiceHealth"  # Azure service incidents
  }

  enabled_log {
    category = "Alert"  # Azure Monitor alerts fired
  }

  enabled_log {
    category = "Recommendation"  # Advisor recommendations
  }

  enabled_log {
    category = "Policy"  # Azure Policy effect actions
  }

  enabled_log {
    category = "Autoscale"  # Autoscale events
  }

  enabled_log {
    category = "ResourceHealth"  # Resource health changes
  }
}
```

## Export to Storage Account for Long-Term Retention

```hcl
resource "azurerm_storage_account" "audit_logs" {
  name                     = "auditlogs${var.suffix}"
  resource_group_name      = azurerm_resource_group.monitoring.name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-redundant for compliance
  min_tls_version          = "TLS1_2"

  blob_properties {
    delete_retention_policy {
      days = 7
    }
  }
}

resource "azurerm_monitor_diagnostic_setting" "activity_to_storage" {
  name               = "activity-logs-to-storage"
  target_resource_id = "/subscriptions/${var.subscription_id}"

  storage_account_id = azurerm_storage_account.audit_logs.id

  enabled_log {
    category = "Administrative"
  }

  enabled_log {
    category = "Security"
  }
}

# Diagnostic setting retention was retired; use a storage management policy instead.
resource "azurerm_storage_management_policy" "audit_logs_retention" {
  storage_account_id = azurerm_storage_account.audit_logs.id

  rule {
    name    = "delete-activity-logs-after-365-days"
    enabled = true

    filters {
      prefix_match = ["insights-activity-logs/resourceId=/SUBSCRIPTIONS/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        delete_after_days_since_modification_greater_than = 365
      }
    }
  }
}
```

## Export to Event Hub for Real-Time Processing

```hcl
resource "azurerm_eventhub_namespace" "logs" {
  name                = "activity-log-stream"
  location            = var.location
  resource_group_name = azurerm_resource_group.monitoring.name
  sku                 = "Standard"
  capacity            = 2
}

resource "azurerm_eventhub" "activity_logs" {
  name              = "azure-activity-logs"
  namespace_id      = azurerm_eventhub_namespace.logs.id
  partition_count     = 4
  message_retention   = 7
}

# Diagnostic settings require a namespace SAS rule with Manage, Send, and Listen.
resource "azurerm_eventhub_namespace_authorization_rule" "logs_sender" {
  name                = "activity-log-stream-access"
  namespace_name      = azurerm_eventhub_namespace.logs.name
  resource_group_name = azurerm_resource_group.monitoring.name
  listen              = true
  send                = true
  manage              = true
}

resource "azurerm_monitor_diagnostic_setting" "activity_to_eventhub" {
  name               = "activity-logs-to-eventhub"
  target_resource_id = "/subscriptions/${var.subscription_id}"

  eventhub_name                  = azurerm_eventhub.activity_logs.name
  eventhub_authorization_rule_id = azurerm_eventhub_namespace_authorization_rule.logs_sender.id

  enabled_log {
    category = "Administrative"
  }

  enabled_log {
    category = "Security"
  }
}
```

## Alert on Critical Activity Log Events

```hcl
# Alert on policy assignment creates and updates
resource "azurerm_monitor_activity_log_alert" "policy_change" {
  name                = "policy-assignment-changed"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = "Global"
  scopes              = ["/subscriptions/${var.subscription_id}"]
  description         = "Alert when a policy assignment is created or modified"

  criteria {
    category       = "Administrative"
    operation_name = "Microsoft.Authorization/policyAssignments/write"
  }

  action {
    action_group_id = azurerm_monitor_action_group.security.id
  }
}

# Alert on role assignment creates and updates
resource "azurerm_monitor_activity_log_alert" "rbac_change" {
  name                = "rbac-assignment-changed"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = "Global"
  scopes              = ["/subscriptions/${var.subscription_id}"]

  criteria {
    category       = "Administrative"
    operation_name = "Microsoft.Authorization/roleAssignments/write"
  }

  action {
    action_group_id = azurerm_monitor_action_group.security.id
  }
}
```

## Conclusion

Azure Activity Log exports in OpenTofu provide a centralized audit trail of subscription-level control plane events. Export to Log Analytics for 90-day queryable retention, to Storage Accounts for long-term compliance archival, and to Event Hubs for real-time SIEM integration. Create Activity Log alerts for high-priority security events like RBAC and policy assignment changes to get immediate notification of privileged actions.
