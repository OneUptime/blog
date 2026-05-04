# How to Create Azure Event Grid Topics with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Event Grid, Event-Driven, Infrastructure as Code

Description: Learn how to create Azure Event Grid topics, subscriptions, and event handlers with OpenTofu for reactive, event-driven Azure architectures.

Azure Event Grid provides event-driven messaging between Azure services and custom applications. Managing topics and subscriptions in OpenTofu ensures your event routing is documented, version-controlled, and consistently deployed.

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

## Creating a Custom Topic

```hcl
resource "azurerm_resource_group" "events" {
  name     = "events-rg"
  location = "eastus"
}

resource "azurerm_eventgrid_topic" "application" {
  name                = "myapp-events"
  location            = azurerm_resource_group.events.location
  resource_group_name = azurerm_resource_group.events.name

  input_schema = "EventGridSchema"  # or CloudEventSchemaV1_0, CustomEventSchema

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}

# Output endpoint and key for application configuration

output "topic_endpoint" {
  value = azurerm_eventgrid_topic.application.endpoint
}

output "topic_key" {
  value     = azurerm_eventgrid_topic.application.primary_access_key
  sensitive = true
}
```

## Event Subscription to Azure Function

```hcl
resource "azurerm_eventgrid_event_subscription" "order_processor" {
  name  = "order-processor"
  scope = azurerm_eventgrid_topic.application.id

  azure_function_endpoint {
    function_id = "${azurerm_function_app.processor.id}/functions/ProcessOrder"
  }

  # Filter to only OrderCreated events
  included_event_types = ["OrderCreated", "OrderUpdated"]

  subject_filter {
    subject_begins_with = "/orders/"
  }
}
```

## Event Subscription to Storage Queue

```hcl
resource "azurerm_eventgrid_event_subscription" "to_queue" {
  name  = "events-to-queue"
  scope = azurerm_eventgrid_topic.application.id

  storage_queue_endpoint {
    storage_account_id = azurerm_storage_account.events.id
    queue_name         = azurerm_storage_queue.events.name
  }

  retry_policy {
    max_delivery_attempts = 30
    event_time_to_live    = 1440  # Minutes (24 hours)
  }

  storage_blob_dead_letter_destination {
    storage_account_id          = azurerm_storage_account.events.id
    storage_blob_container_name = "deadletter"
  }
}
```

## Event Subscription to Event Hub

```hcl
resource "azurerm_eventgrid_event_subscription" "to_eventhub" {
  name  = "events-to-eventhub"
  scope = azurerm_eventgrid_topic.application.id

  eventhub_endpoint_id = azurerm_eventhub.events.id

  # Advanced filter - only forward high-value orders
  advanced_filter {
    number_greater_than_or_equals {
      key   = "data.amount"
      value = 1000
    }
  }
}
```

## System Topic (Azure Service Events)

```hcl
# Subscribe to blob storage events (no custom topic needed)
resource "azurerm_eventgrid_system_topic" "blob_events" {
  name                   = "blob-storage-events"
  resource_group_name    = azurerm_resource_group.events.name
  location               = azurerm_resource_group.events.location
  source_arm_resource_id = azurerm_storage_account.data.id
  topic_type             = "Microsoft.Storage.StorageAccounts"
}

resource "azurerm_eventgrid_system_topic_event_subscription" "blob_created" {
  name                = "blob-created-handler"
  system_topic        = azurerm_eventgrid_system_topic.blob_events.name
  resource_group_name = azurerm_resource_group.events.name

  included_event_types = ["Microsoft.Storage.BlobCreated"]

  subject_filter {
    subject_begins_with = "/blobServices/default/containers/uploads/"
  }

  azure_function_endpoint {
    function_id = "${azurerm_function_app.processor.id}/functions/ProcessUpload"
  }
}
```

## Conclusion

Azure Event Grid in OpenTofu enables reactive, serverless architectures with minimal infrastructure overhead. Create custom topics for application events, subscribe to system topics for Azure service events, and use advanced filters to route only relevant events to each handler. Configure dead letter destinations and retry policies to ensure no events are lost.
