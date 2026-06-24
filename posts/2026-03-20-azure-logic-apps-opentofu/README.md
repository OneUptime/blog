# How to Create Azure Logic Apps with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Logic Apps, Workflow Automation, Infrastructure as Code, Serverless

Description: Learn how to create Azure Logic Apps Standard and Consumption workflows for event-driven automation and integration using OpenTofu.

## Introduction

Azure Logic Apps provide a cloud-based workflow service for automating and integrating applications, data, and services. OpenTofu manages Consumption Logic App resources, triggers, and actions as code, and can provision the hosting infrastructure for Standard Logic Apps.

## Logic App Consumption (Multi-Tenant)

```hcl
resource "azurerm_resource_group" "main" {
  name     = "rg-logicapps-${var.environment}"
  location = var.location
}

resource "azurerm_logic_app_workflow" "order_notification" {
  name                = "la-order-notification-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Adding Triggers and Actions

```hcl
# HTTP Request trigger

resource "azurerm_logic_app_trigger_http_request" "order_trigger" {
  name         = "when-order-received"
  logic_app_id = azurerm_logic_app_workflow.order_notification.id

  schema = jsonencode({
    type = "object"
    properties = {
      orderId       = { type = "string" }
      customerEmail = { type = "string" }
      amount        = { type = "number" }
    }
  })
}

# HTTP action for an external notification webhook
resource "azurerm_logic_app_action_http" "notify_webhook" {
  name         = "send-order-notification"
  logic_app_id = azurerm_logic_app_workflow.order_notification.id

  method = "POST"
  uri    = "https://prod-webhooks.example.com/notify"

  body = jsonencode({
    orderId       = "@{triggerBody()?['orderId']}"
    customerEmail = "@{triggerBody()?['customerEmail']}"
    amount        = "@{triggerBody()?['amount']}"
  })

  headers = {
    "Content-Type" = "application/json"
  }
}
```

## Recurrence Trigger

```hcl
resource "azurerm_logic_app_workflow" "daily_report" {
  name                = "la-daily-report-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_logic_app_trigger_recurrence" "daily_report" {
  name         = "daily-trigger"
  logic_app_id = azurerm_logic_app_workflow.daily_report.id

  frequency  = "Day"
  interval   = 1
  start_time = "2026-01-01T08:00:00Z"
  time_zone  = "UTC"
}
```

## Logic App Standard (Single-Tenant)

For Standard, OpenTofu provisions the Logic App resource and its hosting infrastructure. Individual workflows are stored in project `workflow.json` files and deployed separately.

```hcl
resource "azurerm_service_plan" "logic" {
  name                = "asp-logic-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Windows"
  sku_name            = "WS1"  # Workflow Standard tier
}

resource "azurerm_storage_account" "logic" {
  name                     = "stlogic${var.environment}sa"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_logic_app_standard" "main" {
  name                       = "la-standard-${var.environment}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  app_service_plan_id        = azurerm_service_plan.logic.id
  storage_account_name       = azurerm_storage_account.logic.name
  storage_account_access_key = azurerm_storage_account.logic.primary_access_key

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"     = "node"
    "WEBSITE_NODE_DEFAULT_VERSION" = "~18"
  }
}
```

## Outputs

```hcl
output "workflow_callback_url" {
  description = "Webhook URL for the HTTP trigger"
  value       = azurerm_logic_app_trigger_http_request.order_trigger.callback_url
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Azure Logic Apps simplify workflow automation and service integration. OpenTofu manages Consumption workflow resources, triggers, and actions, and can provision the hosting resources required for Standard Logic Apps, whose workflow definitions are deployed separately as project files.
