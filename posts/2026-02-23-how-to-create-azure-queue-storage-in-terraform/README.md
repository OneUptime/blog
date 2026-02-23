# How to Create Azure Queue Storage in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Queue Storage, Messaging, Infrastructure as Code, Cloud Storage

Description: Learn how to create Azure Queue Storage in Terraform for reliable message queuing between application components with proper configuration and monitoring.

---

Azure Queue Storage provides a simple, cost-effective message queuing service for decoupling application components. It handles millions of messages, each up to 64 KB in size, and works well for asynchronous task processing, work distribution, and building loosely coupled architectures. Terraform makes it easy to define queues alongside the rest of your infrastructure.

This guide covers creating queue storage in Terraform, configuring multiple queues, setting up monitoring, and integrating with Azure Functions.

## Provider Setup

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

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

## Storage Account

Queue Storage lives inside a Storage Account. You need one before creating any queues.

```hcl
# main.tf
resource "azurerm_resource_group" "queues" {
  name     = "rg-queue-storage"
  location = "East US"
}

# Storage account configured for queue workloads
resource "azurerm_storage_account" "queues" {
  name                     = "stqueueprod2026"
  resource_group_name      = azurerm_resource_group.queues.name
  location                 = azurerm_resource_group.queues.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
  account_kind             = "StorageV2"

  enable_https_traffic_only = true
  min_tls_version           = "TLS1_2"

  # Queue-specific properties
  queue_properties {
    # Logging for queue operations
    logging {
      version               = "1.0"
      delete                = true
      read                  = true
      write                 = true
      retention_policy_days = 30
    }

    # Metrics collection
    hour_metrics {
      version               = "1.0"
      enabled               = true
      include_apis          = true
      retention_policy_days = 30
    }

    minute_metrics {
      version               = "1.0"
      enabled               = true
      include_apis          = true
      retention_policy_days = 7
    }

    # CORS rules if accessing queues from a web application
    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "POST", "PUT", "DELETE"]
      allowed_origins    = ["https://app.example.com"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## Creating Queues

```hcl
# queues.tf
# Queue for processing new orders
resource "azurerm_storage_queue" "orders" {
  name                 = "order-processing"
  storage_account_name = azurerm_storage_account.queues.name

  metadata = {
    purpose     = "new-order-processing"
    environment = "production"
  }
}

# Queue for sending email notifications
resource "azurerm_storage_queue" "email" {
  name                 = "email-notifications"
  storage_account_name = azurerm_storage_account.queues.name

  metadata = {
    purpose = "email-delivery"
  }
}

# Dead letter queue for failed messages
resource "azurerm_storage_queue" "dead_letter" {
  name                 = "dead-letter"
  storage_account_name = azurerm_storage_account.queues.name

  metadata = {
    purpose = "failed-message-storage"
  }
}

# Queue for background image processing
resource "azurerm_storage_queue" "image_processing" {
  name                 = "image-processing"
  storage_account_name = azurerm_storage_account.queues.name

  metadata = {
    purpose = "image-resize-and-optimize"
  }
}

# Queue for report generation
resource "azurerm_storage_queue" "reports" {
  name                 = "report-generation"
  storage_account_name = azurerm_storage_account.queues.name

  metadata = {
    purpose = "scheduled-report-generation"
  }
}
```

## Creating Multiple Queues with for_each

When you have many queues to create, use `for_each` to keep things clean.

```hcl
# dynamic-queues.tf
variable "queues" {
  description = "Map of queues to create"
  type = map(object({
    metadata = map(string)
  }))
  default = {
    "user-registration" = {
      metadata = { purpose = "new-user-onboarding" }
    }
    "payment-processing" = {
      metadata = { purpose = "payment-gateway-integration" }
    }
    "inventory-updates" = {
      metadata = { purpose = "stock-level-synchronization" }
    }
    "audit-logging" = {
      metadata = { purpose = "audit-trail-recording" }
    }
    "webhook-delivery" = {
      metadata = { purpose = "outbound-webhook-dispatch" }
    }
  }
}

resource "azurerm_storage_queue" "dynamic" {
  for_each             = var.queues
  name                 = each.key
  storage_account_name = azurerm_storage_account.queues.name
  metadata             = each.value.metadata
}
```

## Network Security

Lock down queue access to specific networks.

```hcl
# networking.tf
resource "azurerm_storage_account_network_rules" "queues" {
  storage_account_id = azurerm_storage_account.queues.id

  default_action             = "Deny"
  ip_rules                   = ["203.0.113.0/24"]  # Office IP range
  virtual_network_subnet_ids = [var.app_subnet_id]
  bypass                     = ["AzureServices"]
}
```

## Monitoring with Azure Monitor

Set up alerts for queue depth to catch processing backlogs early.

```hcl
# monitoring.tf
# Action group for queue alerts
resource "azurerm_monitor_action_group" "queue_alerts" {
  name                = "ag-queue-alerts"
  resource_group_name = azurerm_resource_group.queues.name
  short_name          = "QueueAlert"

  email_receiver {
    name          = "ops-team"
    email_address = "ops@company.com"
  }
}

# Alert when queue depth exceeds threshold
resource "azurerm_monitor_metric_alert" "queue_depth" {
  name                = "alert-queue-depth-high"
  resource_group_name = azurerm_resource_group.queues.name
  scopes              = [azurerm_storage_account.queues.id]
  description         = "Alert when queue message count exceeds 1000"

  criteria {
    metric_namespace = "Microsoft.Storage/storageAccounts/queueServices"
    metric_name      = "QueueMessageCount"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 1000
  }

  action {
    action_group_id = azurerm_monitor_action_group.queue_alerts.id
  }

  frequency   = "PT5M"   # Check every 5 minutes
  window_size = "PT15M"  # Look at 15-minute window
}
```

## Integration with Azure Functions

Azure Functions has a built-in trigger for Queue Storage. Here is how the pieces fit together.

```hcl
# function-app.tf
# App Service Plan for the Function App
resource "azurerm_service_plan" "functions" {
  name                = "asp-queue-functions"
  resource_group_name = azurerm_resource_group.queues.name
  location            = azurerm_resource_group.queues.location
  os_type             = "Linux"
  sku_name            = "Y1"  # Consumption plan
}

# Storage account for Function App runtime
resource "azurerm_storage_account" "functions" {
  name                     = "stfuncprod2026"
  resource_group_name      = azurerm_resource_group.queues.name
  location                 = azurerm_resource_group.queues.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# Function App that processes queue messages
resource "azurerm_linux_function_app" "queue_processor" {
  name                = "func-queue-processor"
  resource_group_name = azurerm_resource_group.queues.name
  location            = azurerm_resource_group.queues.location
  service_plan_id     = azurerm_service_plan.functions.id

  storage_account_name       = azurerm_storage_account.functions.name
  storage_account_access_key = azurerm_storage_account.functions.primary_access_key

  site_config {
    application_stack {
      node_version = "18"
    }
  }

  app_settings = {
    # Connection string for the queue storage account
    "QueueStorageConnection" = azurerm_storage_account.queues.primary_connection_string
    "QUEUE_NAME"             = azurerm_storage_queue.orders.name
  }
}
```

The corresponding Azure Function code would look like this:

```javascript
// src/functions/processOrder.js
const { app } = require('@azure/functions');

app.storageQueue('processOrder', {
    queueName: process.env.QUEUE_NAME,
    connection: 'QueueStorageConnection',
    handler: (queueItem, context) => {
        context.log('Processing order:', queueItem);
        // Process the order message
    }
});
```

## Outputs

```hcl
# outputs.tf
output "storage_account_name" {
  value       = azurerm_storage_account.queues.name
  description = "Storage account name for queue access"
}

output "queue_names" {
  value = {
    orders           = azurerm_storage_queue.orders.name
    email            = azurerm_storage_queue.email.name
    dead_letter      = azurerm_storage_queue.dead_letter.name
    image_processing = azurerm_storage_queue.image_processing.name
    reports          = azurerm_storage_queue.reports.name
  }
  description = "Names of all queues created"
}

output "queue_endpoint" {
  value       = azurerm_storage_account.queues.primary_queue_endpoint
  description = "Primary queue service endpoint"
}

output "connection_string" {
  value       = azurerm_storage_account.queues.primary_connection_string
  sensitive   = true
  description = "Connection string for queue access"
}
```

## Queue Storage vs Service Bus

Azure offers two main messaging services. Choosing between them depends on your needs:

**Queue Storage** is the simpler option. It supports messages up to 64 KB, has no ordering guarantee, and charges per transaction. Best for simple task queues with high throughput and low cost requirements.

**Service Bus Queues** support messages up to 256 KB (or 100 MB with Premium), guarantee FIFO ordering, support dead-lettering natively, and offer sessions for message grouping. Better for enterprise messaging patterns.

If your needs are straightforward - a producer puts messages in and a consumer takes them out - Queue Storage is the right choice. If you need ordering, transactions, or complex routing, look at Service Bus instead.

## Deployment

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Queue Storage is one of the cheapest Azure services. At the time of writing, storage costs around $0.045 per GB per month, and operations cost $0.004 per 10,000 transactions. This makes it practical to use queues liberally for decoupling components without worrying about cost.
