# How to Create Azure Service Bus in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Service Bus, Messaging, Infrastructure as Code, Microservices

Description: Learn how to provision Azure Service Bus namespaces, queues, topics, and subscriptions using Terraform for reliable enterprise messaging.

---

Azure Service Bus is a fully managed enterprise message broker that supports both queues (point-to-point) and topics with subscriptions (publish-subscribe). It is the go-to choice when you need guaranteed message delivery, ordering, dead-letter handling, and transaction support between distributed applications.

If you have used simpler queuing systems and hit their limits - messages getting lost, no support for transactions, inability to filter messages for different consumers - Service Bus is the step up. And managing it through Terraform means you can version control your entire messaging topology.

## When to Use Service Bus

Service Bus fits scenarios where you need:

- Guaranteed at-least-once or exactly-once delivery
- FIFO ordering within sessions
- Dead-letter queues for messages that cannot be processed
- Topic-based pub/sub with filtered subscriptions
- Transactions that span multiple queues

If you just need basic event streaming at massive scale, Azure Event Hubs might be a better fit. But for traditional enterprise messaging patterns, Service Bus is the right tool.

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

## Creating the Service Bus Namespace

The namespace is the top-level container for all your queues and topics:

```hcl
resource "azurerm_resource_group" "messaging" {
  name     = "rg-messaging-prod"
  location = "eastus"

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

# Create the Service Bus namespace
resource "azurerm_servicebus_namespace" "main" {
  name                = "sb-prod-eastus-001"
  location            = azurerm_resource_group.messaging.location
  resource_group_name = azurerm_resource_group.messaging.name

  # Standard tier supports topics and subscriptions
  # Premium tier adds dedicated capacity, larger messages, and VNet integration
  sku = "Standard"

  # Premium tier settings (uncomment if using Premium)
  # sku      = "Premium"
  # capacity = 1  # Messaging units: 1, 2, 4, 8, or 16

  # Minimum TLS version for connections
  minimum_tls_version = "1.2"

  # Enable local auth (SAS keys) - set to false if using only Azure AD
  local_auth_enabled = true

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}
```

## Creating Queues

Queues provide point-to-point communication where each message is consumed by exactly one receiver:

```hcl
# Order processing queue with dead-letter and duplicate detection
resource "azurerm_servicebus_queue" "orders" {
  name         = "orders"
  namespace_id = azurerm_servicebus_namespace.main.id

  # Max size in MB (1024, 2048, 3072, 4096, 5120 for Standard)
  max_size_in_megabytes = 1024

  # Enable partitioning for higher throughput
  enable_partitioning = true

  # Time-to-live for messages (ISO 8601 duration)
  default_message_ttl = "P14D" # 14 days

  # Lock duration - how long a message is hidden from other consumers
  lock_duration = "PT1M" # 1 minute

  # Maximum number of delivery attempts before dead-lettering
  max_delivery_count = 10

  # Enable duplicate detection with a 10-minute window
  requires_duplicate_detection         = true
  duplicate_detection_history_time_window = "PT10M"

  # Dead-letter queue settings
  dead_lettering_on_message_expiration = true

  # Enable sessions for ordered processing
  requires_session = false
}

# Notification queue - simpler configuration
resource "azurerm_servicebus_queue" "notifications" {
  name         = "notifications"
  namespace_id = azurerm_servicebus_namespace.main.id

  max_size_in_megabytes = 1024
  default_message_ttl   = "P1D"  # 1 day
  lock_duration         = "PT30S" # 30 seconds
  max_delivery_count    = 5

  dead_lettering_on_message_expiration = true
}

# Session-enabled queue for ordered processing per entity
resource "azurerm_servicebus_queue" "workflow_steps" {
  name         = "workflow-steps"
  namespace_id = azurerm_servicebus_namespace.main.id

  max_size_in_megabytes = 1024
  default_message_ttl   = "P7D"
  lock_duration         = "PT2M"
  max_delivery_count    = 10

  # Sessions ensure FIFO ordering within each session ID
  requires_session = true

  dead_lettering_on_message_expiration = true
}
```

## Creating Topics and Subscriptions

Topics implement the publish-subscribe pattern where a single message can be delivered to multiple subscriptions:

```hcl
# Events topic - multiple consumers can subscribe
resource "azurerm_servicebus_topic" "events" {
  name         = "events"
  namespace_id = azurerm_servicebus_namespace.main.id

  max_size_in_megabytes = 1024
  default_message_ttl   = "P7D"

  # Partitioning for higher throughput
  enable_partitioning = true

  # Allow batched operations for performance
  enable_batched_operations = true

  # Support ordering for this topic
  support_ordering = false
}

# Subscription for the billing service - receives all order events
resource "azurerm_servicebus_subscription" "billing" {
  name     = "billing"
  topic_id = azurerm_servicebus_topic.events.id

  max_delivery_count = 10
  lock_duration      = "PT1M"

  # Auto-delete if idle for this duration (0 means never)
  auto_delete_on_idle = "P30D"

  # Forward dead-lettered messages to a specific queue for analysis
  dead_lettering_on_message_expiration          = true
  dead_lettering_on_filter_evaluation_exception = true
}

# Subscription for the audit service - only receives specific events
resource "azurerm_servicebus_subscription" "audit" {
  name     = "audit"
  topic_id = azurerm_servicebus_topic.events.id

  max_delivery_count = 5
  lock_duration      = "PT30S"

  dead_lettering_on_message_expiration = true
}

# Subscription filter - audit only cares about security events
resource "azurerm_servicebus_subscription_rule" "audit_filter" {
  name            = "security-events-only"
  subscription_id = azurerm_servicebus_subscription.audit.id

  filter_type = "SqlFilter"

  # SQL filter expression to match specific properties
  sql_filter = "EventType = 'SecurityAlert' OR EventType = 'AccessDenied'"
}

# Subscription for analytics - receives everything with correlation filter
resource "azurerm_servicebus_subscription" "analytics" {
  name     = "analytics"
  topic_id = azurerm_servicebus_topic.events.id

  max_delivery_count = 3
  lock_duration      = "PT30S"

  dead_lettering_on_message_expiration = true
}

# Correlation filter example
resource "azurerm_servicebus_subscription_rule" "analytics_filter" {
  name            = "high-priority-events"
  subscription_id = azurerm_servicebus_subscription.analytics.id

  filter_type = "CorrelationFilter"

  correlation_filter {
    label = "high-priority"
  }
}
```

## Authorization Rules and Access Policies

Control access to the namespace, queues, and topics with SAS policies:

```hcl
# Namespace-level authorization rule for management
resource "azurerm_servicebus_namespace_authorization_rule" "management" {
  name         = "management-policy"
  namespace_id = azurerm_servicebus_namespace.main.id

  listen = true
  send   = true
  manage = true
}

# Queue-level authorization rule - sender can only send
resource "azurerm_servicebus_queue_authorization_rule" "order_sender" {
  name     = "order-sender"
  queue_id = azurerm_servicebus_queue.orders.id

  listen = false
  send   = true
  manage = false
}

# Queue-level authorization rule - processor can only listen
resource "azurerm_servicebus_queue_authorization_rule" "order_processor" {
  name     = "order-processor"
  queue_id = azurerm_servicebus_queue.orders.id

  listen = true
  send   = false
  manage = false
}

# Topic-level authorization rule for publishers
resource "azurerm_servicebus_topic_authorization_rule" "event_publisher" {
  name     = "event-publisher"
  topic_id = azurerm_servicebus_topic.events.id

  listen = false
  send   = true
  manage = false
}
```

## Premium Tier with Network Isolation

For production workloads that need dedicated resources and private networking:

```hcl
# Virtual network for private access
resource "azurerm_virtual_network" "main" {
  name                = "vnet-messaging-prod"
  location            = azurerm_resource_group.messaging.location
  resource_group_name = azurerm_resource_group.messaging.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "servicebus" {
  name                 = "snet-servicebus"
  resource_group_name  = azurerm_resource_group.messaging.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Premium namespace with network rules
resource "azurerm_servicebus_namespace" "premium" {
  name                = "sb-prod-premium-001"
  location            = azurerm_resource_group.messaging.location
  resource_group_name = azurerm_resource_group.messaging.name
  sku                 = "Premium"
  capacity            = 1

  # Restrict public network access
  public_network_access_enabled = false

  minimum_tls_version = "1.2"

  # Network rule set
  network_rule_set {
    default_action                = "Deny"
    public_network_access_enabled = false
    trusted_services_allowed      = true

    # Allow traffic from specific subnet
    network_rules {
      subnet_id                            = azurerm_subnet.servicebus.id
      ignore_missing_vnet_service_endpoint = false
    }
  }

  tags = {
    Environment = "Production"
    Tier        = "Premium"
  }
}
```

## Outputs

```hcl
# Connection strings for applications
output "namespace_connection_string" {
  description = "Service Bus namespace default connection string"
  value       = azurerm_servicebus_namespace.main.default_primary_connection_string
  sensitive   = true
}

output "order_sender_connection_string" {
  description = "Connection string for order queue sender"
  value       = azurerm_servicebus_queue_authorization_rule.order_sender.primary_connection_string
  sensitive   = true
}

output "namespace_id" {
  description = "Service Bus namespace resource ID"
  value       = azurerm_servicebus_namespace.main.id
}
```

## Best Practices

**Choose the right tier.** Standard is fine for most workloads and supports all message patterns. Premium is necessary when you need dedicated throughput, message sizes over 256 KB, virtual network integration, or geo-disaster recovery.

**Use least-privilege SAS policies.** Create separate authorization rules for senders and receivers. Never share namespace-level Manage keys with application code.

**Set reasonable TTLs and max delivery counts.** Messages should not live forever. Dead-letter queues are your safety net for messages that cannot be processed.

**Enable duplicate detection for idempotency-critical queues.** If a producer might accidentally send the same message twice, duplicate detection prevents downstream issues.

**Monitor dead-letter queues.** Set up alerts on the dead-letter queue message count. Messages in the dead-letter queue represent processing failures that need attention.

## Conclusion

Azure Service Bus combined with Terraform gives you a declarative, reproducible way to build your messaging infrastructure. From simple point-to-point queues to complex pub/sub topologies with filtered subscriptions, Terraform handles it all. The key is getting your namespace tier, queue configurations, and access policies right from the start - and with infrastructure as code, adjusting them later is just a pull request away.
