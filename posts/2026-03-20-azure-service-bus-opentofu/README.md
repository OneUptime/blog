# How to Set Up Azure Service Bus with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Service Bus, Messaging, Queue, Topic, Infrastructure as Code

Description: Learn how to provision Azure Service Bus namespaces, queues, topics, subscriptions, and authorization rules using OpenTofu for reliable asynchronous messaging between services.

---

Azure Service Bus provides enterprise messaging with queues for point-to-point and topics for publish-subscribe patterns. OpenTofu manages the namespace, queues, topics, subscriptions, subscription rules, and RBAC assignments for a fully configured messaging infrastructure.

## Service Bus Architecture

```mermaid
graph LR
    A[Producer Service] --> B[Service Bus Namespace]
    B --> C[Queue<br/>Point-to-point]
    B --> D[Topic<br/>Pub/Sub]
    D --> E[Subscription 1<br/>Service A]
    D --> F[Subscription 2<br/>Service B]
    C --> G[Consumer Service]
```

## Service Bus Namespace

```hcl
# service_bus.tf

resource "azurerm_resource_group" "messaging" {
  name     = "rg-messaging-${var.environment}"
  location = var.location
}

resource "azurerm_servicebus_namespace" "main" {
  name                = "sb-${var.prefix}-${var.environment}"
  resource_group_name = azurerm_resource_group.messaging.name
  location            = azurerm_resource_group.messaging.location
  sku                 = var.environment == "production" ? "Premium" : "Standard"

  # Premium SKU features: private endpoints, dedicated capacity
  capacity = var.environment == "production" ? 2 : 0

  # Premium namespace partitioning is configured at the namespace level
  premium_messaging_partitions = var.environment == "production" ? 2 : 0

  # Disable local authentication - use Microsoft Entra ID only
  local_auth_enabled = false

  minimum_tls_version = "1.2"

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Queues

```hcl
# queues.tf
resource "azurerm_servicebus_queue" "orders" {
  name         = "orders"
  namespace_id = azurerm_servicebus_namespace.main.id

  max_size_in_megabytes        = 5120
  max_delivery_count           = 10  # Move to DLQ after 10 failures
  default_message_ttl          = "P14D"  # 14 days
  lock_duration                = "PT30S"  # 30 second lock for processing

  dead_lettering_on_message_expiration = true
  requires_duplicate_detection         = true
  duplicate_detection_history_time_window = "PT10M"

  partitioning_enabled = var.environment == "production"
}

resource "azurerm_servicebus_queue" "orders_dlq_processor" {
  name         = "orders-dlq-processor"
  namespace_id = azurerm_servicebus_namespace.main.id

  max_size_in_megabytes = 1024
  default_message_ttl   = "P7D"
  partitioning_enabled  = var.environment == "production"
}
```

## Topics and Subscriptions

```hcl
# topics.tf
resource "azurerm_servicebus_topic" "events" {
  name         = "domain-events"
  namespace_id = azurerm_servicebus_namespace.main.id

  max_size_in_megabytes   = 5120
  default_message_ttl     = "P7D"
  partitioning_enabled    = var.environment == "production"
  support_ordering        = false
}

# Each consuming service gets its own subscription
resource "azurerm_servicebus_subscription" "inventory" {
  name               = "inventory-service"
  topic_id           = azurerm_servicebus_topic.events.id
  max_delivery_count = 10

  dead_lettering_on_filter_evaluation_error = true
  dead_lettering_on_message_expiration      = true
}

# New subscriptions start with a $Default rule that matches all messages.
# Replace or remove it separately if you want this filter to be exclusive.
resource "azurerm_servicebus_subscription_rule" "inventory_order_events" {
  name            = "order-events-only"
  subscription_id = azurerm_servicebus_subscription.inventory.id
  filter_type     = "SqlFilter"
  sql_filter      = "user.EventType LIKE 'Order%'"
}

resource "azurerm_servicebus_subscription" "notifications" {
  name               = "notification-service"
  topic_id           = azurerm_servicebus_topic.events.id
  max_delivery_count = 5
}
```

## RBAC Assignments

```hcl
# rbac.tf - use managed identity instead of connection strings

# Grant sender role to producer app
resource "azurerm_role_assignment" "producer" {
  scope                = azurerm_servicebus_namespace.main.id
  role_definition_name = "Azure Service Bus Data Sender"
  principal_id         = var.producer_identity_id
}

# Grant receiver role to consumer app
resource "azurerm_role_assignment" "consumer" {
  scope                = azurerm_servicebus_queue.orders.id
  role_definition_name = "Azure Service Bus Data Receiver"
  principal_id         = var.consumer_identity_id
}
```

## Best Practices

- Use `local_auth_enabled = false` to require Microsoft Entra ID authentication - this prevents the use of SAS keys, which are harder to rotate and audit than managed identity assignments.
- Set `max_delivery_count` and `dead_lettering_on_message_expiration = true` - queues and subscriptions already have built-in dead-letter queues, and these settings ensure failed or expired messages are retained for inspection.
- Use `partitioning_enabled = true` for high-throughput queues and topics, and set `premium_messaging_partitions` higher than `1` when you use the Premium SKU - partitioned entities distribute load across multiple message brokers and increase throughput.
- Set appropriate `lock_duration` (30-300 seconds) based on your processing time - if processing takes longer than the lock duration, the message is redelivered to another consumer.
- Grant RBAC roles at the queue, topic, or subscription level rather than the namespace level - this limits each service to only the entities it needs, following the principle of least privilege.
