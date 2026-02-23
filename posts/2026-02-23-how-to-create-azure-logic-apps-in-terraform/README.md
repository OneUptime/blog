# How to Create Azure Logic Apps in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Logic Apps, Workflow Automation, Infrastructure as Code, Serverless

Description: A complete guide to creating Azure Logic Apps with Terraform, covering consumption and standard tiers, workflow definitions, triggers, and API connections.

---

Azure Logic Apps is a cloud-based platform for building automated workflows that integrate apps, data, services, and systems. Think of it as a way to connect different services together without writing a ton of glue code. Need to process an email attachment, save it to blob storage, and notify a Slack channel? Logic Apps can do that with a visual designer or, in our case, with code.

Managing Logic Apps through Terraform is particularly useful because it lets you version control your workflow definitions, deploy identical workflows across environments, and keep your automation infrastructure consistent. Let us walk through how to set this up.

## Consumption vs Standard Logic Apps

Azure offers two hosting models for Logic Apps:

- **Consumption** runs in a multi-tenant environment. You pay per action execution. Each Logic App resource contains a single workflow. This is the classic model.
- **Standard** runs on Azure App Service (or Azure Functions runtime). You pay for the hosting plan. A single Logic App resource can contain multiple workflows. This is the newer model.

We will cover both in this guide.

## Prerequisites

- Terraform 1.3+
- Azure subscription with Contributor access
- Azure CLI authenticated

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.3.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Creating a Consumption Logic App

```hcl
resource "azurerm_resource_group" "automation" {
  name     = "rg-automation-prod"
  location = "eastus"

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

# Consumption-tier Logic App with an HTTP trigger
resource "azurerm_logic_app_workflow" "process_orders" {
  name                = "la-process-orders-prod"
  location            = azurerm_resource_group.automation.location
  resource_group_name = azurerm_resource_group.automation.name

  # Enable the managed identity for authenticating with other Azure services
  identity {
    type = "SystemAssigned"
  }

  # Workflow parameters (accessible within the workflow definition)
  workflow_parameters = {
    "$connections" = jsonencode({
      defaultValue = {}
      type         = "Object"
    })
    "environment" = jsonencode({
      defaultValue = "production"
      type         = "String"
    })
  }

  tags = {
    Environment = "Production"
    Purpose     = "OrderProcessing"
  }
}
```

## Adding Triggers and Actions

Terraform manages Logic App triggers and actions as separate resources, which makes it easy to build workflows incrementally:

```hcl
# Add an HTTP request trigger
resource "azurerm_logic_app_trigger_http_request" "order_webhook" {
  name         = "order-received"
  logic_app_id = azurerm_logic_app_workflow.process_orders.id

  schema = jsonencode({
    type = "object"
    properties = {
      orderId = {
        type = "string"
      }
      customerEmail = {
        type = "string"
      }
      amount = {
        type = "number"
      }
      items = {
        type = "array"
        items = {
          type = "object"
          properties = {
            name = {
              type = "string"
            }
            quantity = {
              type = "integer"
            }
          }
        }
      }
    }
    required = ["orderId", "customerEmail", "amount"]
  })
}

# Add an HTTP action to call an external API
resource "azurerm_logic_app_action_http" "validate_order" {
  name         = "validate-order"
  logic_app_id = azurerm_logic_app_workflow.process_orders.id

  method = "POST"
  uri    = "https://api.example.com/orders/validate"

  body = jsonencode({
    orderId = "@{triggerBody()?['orderId']}"
    amount  = "@{triggerBody()?['amount']}"
  })

  headers = {
    "Content-Type" = "application/json"
  }

  run_after {}
}

# Add a custom action using the workflow definition directly
resource "azurerm_logic_app_action_custom" "send_confirmation" {
  name         = "send-confirmation-email"
  logic_app_id = azurerm_logic_app_workflow.process_orders.id

  body = jsonencode({
    type = "Http"
    inputs = {
      method = "POST"
      uri    = "https://api.example.com/notifications/email"
      body = {
        to      = "@{triggerBody()?['customerEmail']}"
        subject = "Order Confirmed"
        body    = "Your order @{triggerBody()?['orderId']} has been confirmed."
      }
      headers = {
        "Content-Type" = "application/json"
      }
    }
    runAfter = {
      "validate-order" = ["Succeeded"]
    }
  })
}
```

## Recurrence Trigger for Scheduled Workflows

```hcl
# Logic App that runs on a schedule
resource "azurerm_logic_app_workflow" "daily_report" {
  name                = "la-daily-report-prod"
  location            = azurerm_resource_group.automation.location
  resource_group_name = azurerm_resource_group.automation.name

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "Production"
    Purpose     = "Reporting"
  }
}

# Trigger that fires every day at 8 AM UTC
resource "azurerm_logic_app_trigger_recurrence" "daily" {
  name         = "daily-trigger"
  logic_app_id = azurerm_logic_app_workflow.daily_report.id

  frequency = "Day"
  interval  = 1

  # Start at a specific time
  start_time = "2026-01-01T08:00:00Z"
  time_zone  = "UTC"
}
```

## Creating a Standard Logic App

Standard Logic Apps run on an App Service plan and can contain multiple workflows:

```hcl
# App Service plan for Standard Logic App
resource "azurerm_service_plan" "logic_apps" {
  name                = "asp-logicapps-prod"
  location            = azurerm_resource_group.automation.location
  resource_group_name = azurerm_resource_group.automation.name

  os_type  = "Windows"
  sku_name = "WS1" # Workflow Standard 1

  tags = {
    Environment = "Production"
  }
}

# Storage account required for Standard Logic Apps
resource "azurerm_storage_account" "logic_apps" {
  name                     = "stlogicappsprod001"
  resource_group_name      = azurerm_resource_group.automation.name
  location                 = azurerm_resource_group.automation.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# Standard Logic App (single-tenant)
resource "azurerm_logic_app_standard" "main" {
  name                       = "la-standard-prod-001"
  location                   = azurerm_resource_group.automation.location
  resource_group_name        = azurerm_resource_group.automation.name
  app_service_plan_id        = azurerm_service_plan.logic_apps.id
  storage_account_name       = azurerm_storage_account.logic_apps.name
  storage_account_access_key = azurerm_storage_account.logic_apps.primary_access_key

  # Application settings
  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"     = "node"
    "WEBSITE_NODE_DEFAULT_VERSION" = "~18"
  }

  site_config {
    dotnet_framework_version = "v6.0"
    use_32_bit_worker        = false

    # Application Insights integration
    app_scale_limit = 10
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "Production"
  }
}
```

## API Connections for Logic Apps

Logic Apps connect to external services through API connections. Here is how to set up a few common ones:

```hcl
# Office 365 Outlook API connection (for sending emails)
resource "azurerm_api_connection" "outlook" {
  name                = "office365-connection"
  resource_group_name = azurerm_resource_group.automation.name
  managed_api_id      = "/subscriptions/${data.azurerm_subscription.current.subscription_id}/providers/Microsoft.Web/locations/${azurerm_resource_group.automation.location}/managedApis/office365"
  display_name        = "Office 365 Outlook"

  # Note: OAuth connections typically need manual consent in the portal
  # after initial creation
}

data "azurerm_subscription" "current" {}

# Azure Blob Storage API connection
resource "azurerm_api_connection" "blob_storage" {
  name                = "azureblob-connection"
  resource_group_name = azurerm_resource_group.automation.name
  managed_api_id      = "/subscriptions/${data.azurerm_subscription.current.subscription_id}/providers/Microsoft.Web/locations/${azurerm_resource_group.automation.location}/managedApis/azureblob"
  display_name        = "Azure Blob Storage"

  parameter_values = {
    accountName = azurerm_storage_account.logic_apps.name
    accessKey   = azurerm_storage_account.logic_apps.primary_access_key
  }
}
```

## Complete Workflow Definition

For complex workflows, you can define the entire workflow as a JSON definition:

```hcl
# Logic App with a full workflow definition inline
resource "azurerm_logic_app_workflow" "file_processor" {
  name                = "la-file-processor-prod"
  location            = azurerm_resource_group.automation.location
  resource_group_name = azurerm_resource_group.automation.name

  # Workflow definition as JSON
  workflow_schema  = "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#"
  workflow_version = "1.0.0.0"

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "Production"
  }
}
```

## Diagnostic Settings

Monitor your Logic App runs with diagnostic settings:

```hcl
# Log Analytics workspace for monitoring
resource "azurerm_log_analytics_workspace" "monitoring" {
  name                = "law-automation-prod"
  location            = azurerm_resource_group.automation.location
  resource_group_name = azurerm_resource_group.automation.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# Send Logic App diagnostics to Log Analytics
resource "azurerm_monitor_diagnostic_setting" "logic_app" {
  name                       = "diag-logicapp-to-law"
  target_resource_id         = azurerm_logic_app_workflow.process_orders.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.monitoring.id

  enabled_log {
    category = "WorkflowRuntime"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
```

## Best Practices

**Use managed identities instead of stored credentials.** When your Logic App needs to access Azure resources like Key Vault, Storage, or SQL Database, use the system-assigned managed identity rather than storing connection strings.

**Separate workflow definition from infrastructure.** For complex workflows, consider storing the workflow JSON definition in a separate file and loading it with `file()` or `templatefile()`. This makes the Terraform code cleaner and the workflow easier to test.

**Monitor run history.** Set up alerts on failed workflow runs. Logic Apps retains run history for a limited time, so sending diagnostic logs to Log Analytics ensures you have long-term visibility.

**Use parameters for environment-specific values.** Do not hardcode URLs, connection strings, or other values that change between environments. Use workflow parameters and Terraform variables to inject them.

**Consider cost implications.** Consumption Logic Apps charge per action execution. A workflow that runs every minute and executes 10 actions adds up. Standard Logic Apps have a fixed hosting cost that might be cheaper for high-volume scenarios.

## Conclusion

Azure Logic Apps with Terraform gives you the ability to automate workflows and integrations while keeping everything in version control. Whether you are building simple scheduled tasks with consumption-tier Logic Apps or complex multi-workflow applications with Standard tier, Terraform handles the provisioning, trigger configuration, and API connections. The trick is finding the right balance between defining workflows in Terraform and managing them through the visual designer - most teams use Terraform for the infrastructure and API connections, then export complex workflow definitions from the designer.
