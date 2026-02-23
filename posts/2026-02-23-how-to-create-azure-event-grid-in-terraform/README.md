# How to Create Azure Event Grid in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Event Grid, Event-Driven, Infrastructure as Code, Serverless

Description: Learn how to create Azure Event Grid topics, subscriptions, and system topics with Terraform for building reactive event-driven architectures.

---

Azure Event Grid is a fully managed event routing service that makes it simple to build event-driven architectures. Unlike messaging systems like Service Bus where consumers pull messages from queues, Event Grid pushes events to subscribers in near real-time. It handles millions of events per second and charges you per operation rather than for provisioned capacity.

If you need to react to things happening in your Azure environment - a blob getting uploaded, a resource being created, a custom event from your application - Event Grid is how you wire it all together. Managing it through Terraform keeps your event routing configuration in code, making it reviewable, testable, and reproducible.

## Event Grid Concepts

Before diving into code, let us clarify the key concepts:

- **Topics** are endpoints where event publishers send events. There are system topics (built into Azure services) and custom topics (your own endpoints).
- **Event Subscriptions** define which events get delivered to which handlers, optionally with filters.
- **Event Handlers** are destinations like Azure Functions, webhooks, Storage Queues, Service Bus, or Event Hubs.
- **Domains** group multiple topics for multi-tenant scenarios.

## Prerequisites

- Terraform 1.3+
- Azure subscription with Contributor permissions
- Azure CLI authenticated

## Provider Setup

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

## Creating a Custom Event Grid Topic

Custom topics let your applications publish their own events:

```hcl
resource "azurerm_resource_group" "events" {
  name     = "rg-events-prod"
  location = "eastus"

  tags = {
    Environment = "Production"
  }
}

# Create a custom Event Grid topic
resource "azurerm_eventgrid_topic" "orders" {
  name                = "egt-orders-prod-001"
  location            = azurerm_resource_group.events.location
  resource_group_name = azurerm_resource_group.events.name

  # Use CloudEvent schema for better interoperability
  input_schema = "CloudEventSchemaV1_0"

  # Public network access settings
  public_network_access_enabled = true

  # Enable local auth (access keys)
  local_auth_enabled = true

  # Managed identity for authenticated delivery
  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "Production"
    Domain      = "Orders"
  }
}

# Output the topic endpoint and keys
output "orders_topic_endpoint" {
  description = "Event Grid topic endpoint for publishing events"
  value       = azurerm_eventgrid_topic.orders.endpoint
}

output "orders_topic_primary_key" {
  description = "Primary access key for the Event Grid topic"
  value       = azurerm_eventgrid_topic.orders.primary_access_key
  sensitive   = true
}
```

## Creating Event Subscriptions

Event subscriptions route events from a topic to a handler. Let us create several subscription types:

```hcl
# Storage queue to receive events
resource "azurerm_storage_account" "events" {
  name                     = "stevtprod001"
  resource_group_name      = azurerm_resource_group.events.name
  location                 = azurerm_resource_group.events.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_queue" "order_events" {
  name                 = "order-events"
  storage_account_name = azurerm_storage_account.events.name
}

# Subscription that sends events to a Storage Queue
resource "azurerm_eventgrid_event_subscription" "orders_to_queue" {
  name  = "orders-to-storage-queue"
  scope = azurerm_eventgrid_topic.orders.id

  # Deliver events to the storage queue
  storage_queue_endpoint {
    storage_account_id = azurerm_storage_account.events.id
    queue_name         = azurerm_storage_queue.order_events.name

    # How long a message lives in the queue (in seconds)
    queue_message_time_to_live_in_seconds = 604800 # 7 days
  }

  # Filter to only receive specific event types
  advanced_filter {
    string_in {
      key    = "data.status"
      values = ["completed", "cancelled"]
    }
  }

  # Retry policy
  retry_policy {
    max_delivery_attempts = 30
    event_time_to_live    = 1440 # minutes (24 hours)
  }
}
```

### Subscription to a Webhook

```hcl
# Subscription that sends events to a webhook endpoint
resource "azurerm_eventgrid_event_subscription" "orders_to_webhook" {
  name  = "orders-to-webhook"
  scope = azurerm_eventgrid_topic.orders.id

  webhook_endpoint {
    url                               = "https://myapi.example.com/webhooks/eventgrid"
    max_events_per_batch              = 1
    preferred_batch_size_in_kilobytes = 64
  }

  # Subject-based filtering
  subject_filter {
    subject_begins_with = "/orders/"
    subject_ends_with   = ""
    case_sensitive       = false
  }

  # Include specific event types only
  included_event_types = [
    "OrderCreated",
    "OrderShipped",
    "OrderDelivered"
  ]

  retry_policy {
    max_delivery_attempts = 10
    event_time_to_live    = 720
  }

  # Dead-letter undeliverable events to blob storage
  storage_blob_dead_letter_destination {
    storage_account_id          = azurerm_storage_account.events.id
    storage_blob_container_name = azurerm_storage_container.dead_letters.name
  }
}

# Container for dead-lettered events
resource "azurerm_storage_container" "dead_letters" {
  name                  = "dead-letters"
  storage_account_name  = azurerm_storage_account.events.name
  container_access_type = "private"
}
```

### Subscription to Service Bus

```hcl
# Service Bus namespace and queue for event processing
resource "azurerm_servicebus_namespace" "events" {
  name                = "sb-events-prod-001"
  location            = azurerm_resource_group.events.location
  resource_group_name = azurerm_resource_group.events.name
  sku                 = "Standard"
}

resource "azurerm_servicebus_queue" "order_processing" {
  name         = "order-processing"
  namespace_id = azurerm_servicebus_namespace.events.id
}

# Route events to Service Bus queue
resource "azurerm_eventgrid_event_subscription" "orders_to_servicebus" {
  name  = "orders-to-servicebus"
  scope = azurerm_eventgrid_topic.orders.id

  service_bus_queue_endpoint_id = azurerm_servicebus_queue.order_processing.id

  # Advanced filtering with multiple conditions
  advanced_filter {
    number_greater_than {
      key   = "data.amount"
      value = 100
    }

    string_not_in {
      key    = "data.region"
      values = ["test", "staging"]
    }
  }

  retry_policy {
    max_delivery_attempts = 30
    event_time_to_live    = 1440
  }
}
```

## System Topics - Reacting to Azure Resource Events

System topics let you subscribe to events emitted by Azure services themselves:

```hcl
# Storage account we want to monitor for blob events
resource "azurerm_storage_account" "data" {
  name                     = "stdataprod001"
  resource_group_name      = azurerm_resource_group.events.name
  location                 = azurerm_resource_group.events.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "uploads" {
  name                  = "uploads"
  storage_account_name  = azurerm_storage_account.data.name
  container_access_type = "private"
}

# System topic for blob storage events
resource "azurerm_eventgrid_system_topic" "storage" {
  name                   = "egst-storage-prod-001"
  location               = azurerm_resource_group.events.location
  resource_group_name    = azurerm_resource_group.events.name
  source_arm_resource_id = azurerm_storage_account.data.id
  topic_type             = "Microsoft.Storage.StorageAccounts"

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "Production"
  }
}

# Subscribe to blob created events
resource "azurerm_eventgrid_system_topic_event_subscription" "blob_created" {
  name                = "blob-upload-notifications"
  system_topic        = azurerm_eventgrid_system_topic.storage.name
  resource_group_name = azurerm_resource_group.events.name

  # Send to a storage queue for processing
  storage_queue_endpoint {
    storage_account_id = azurerm_storage_account.events.id
    queue_name         = "blob-notifications"
  }

  # Only trigger on blob creation in the uploads container
  included_event_types = [
    "Microsoft.Storage.BlobCreated"
  ]

  subject_filter {
    subject_begins_with = "/blobServices/default/containers/uploads/"
    subject_ends_with   = ".csv"
  }
}

# Create the notification queue
resource "azurerm_storage_queue" "blob_notifications" {
  name                 = "blob-notifications"
  storage_account_name = azurerm_storage_account.events.name
}
```

## Event Grid Domains for Multi-Tenant Scenarios

Event Grid Domains let you manage thousands of topics under a single domain, which is useful for multi-tenant applications:

```hcl
# Create an Event Grid domain
resource "azurerm_eventgrid_domain" "platform" {
  name                = "egd-platform-prod-001"
  location            = azurerm_resource_group.events.location
  resource_group_name = azurerm_resource_group.events.name

  input_schema = "CloudEventSchemaV1_0"

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "Production"
  }
}

# Create a topic within the domain (one per tenant)
resource "azurerm_eventgrid_domain_topic" "tenant_a" {
  name                = "tenant-a"
  domain_name         = azurerm_eventgrid_domain.platform.name
  resource_group_name = azurerm_resource_group.events.name
}

resource "azurerm_eventgrid_domain_topic" "tenant_b" {
  name                = "tenant-b"
  domain_name         = azurerm_eventgrid_domain.platform.name
  resource_group_name = azurerm_resource_group.events.name
}
```

## Best Practices

**Use CloudEvent schema for new topics.** The CloudEvents specification is an industry standard supported by multiple cloud providers. It makes your events more portable and interoperable.

**Always configure dead-letter destinations.** Events that cannot be delivered should go somewhere for investigation. Without dead-lettering, failed events are lost.

**Use subject and advanced filters aggressively.** The more precisely you filter at the subscription level, the less work your event handlers need to do. This reduces costs and improves performance.

**Monitor delivery metrics.** Event Grid exposes metrics for published events, matched events, delivery successes, and failures. Set up alerts on delivery failure rates.

**Secure your topics.** Use managed identities for delivery authentication, restrict network access for custom topics, and rotate access keys regularly.

## Conclusion

Azure Event Grid with Terraform gives you a clean, declarative way to build event-driven architectures. Whether you are routing Azure resource events to processing pipelines, building custom pub/sub systems, or managing multi-tenant event routing with domains, the Terraform resources cover every scenario. The key is getting your filtering and dead-lettering right so events always reach the right handlers, and failures are always captured.
