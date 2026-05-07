# Validation Summary: How to Set Up Azure Service Bus with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-style HCL
- Azure Resource Manager (`azurerm` provider)
- Azure Service Bus namespaces
- Azure Service Bus queues
- Azure Service Bus topics and subscriptions
- Azure Service Bus subscription rules
- Azure RBAC / Microsoft Entra ID

## Sources Consulted
- AzureRM provider docs for `azurerm_servicebus_namespace`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/servicebus_namespace
- AzureRM provider docs for `azurerm_servicebus_queue`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/servicebus_queue
- AzureRM provider docs for `azurerm_servicebus_topic`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/servicebus_topic
- AzureRM provider docs for `azurerm_servicebus_subscription`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/servicebus_subscription
- AzureRM provider docs for `azurerm_servicebus_subscription_rule`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/servicebus_subscription_rule
- AzureRM provider source for current Service Bus resource schema and Premium partitioning behavior: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/internal/services/servicebus/servicebus_namespace_resource.go
- AzureRM provider source for current queue schema and Premium partitioning behavior: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/internal/services/servicebus/servicebus_queue_resource.go
- AzureRM provider source for current topic schema and Premium partitioning behavior: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/internal/services/servicebus/servicebus_topic_resource.go
- Azure Service Bus partitioning overview: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-partitioning
- Enable partitioning for Azure Service Bus Premium namespaces: https://learn.microsoft.com/en-us/azure/service-bus-messaging/enable-partitions-premium
- Disable local authentication with Azure Service Bus: https://learn.microsoft.com/en-us/azure/service-bus-messaging/disable-local-authentication
- Overview of Azure Service Bus dead-letter queues: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues
- Azure Service Bus topic filters overview: https://learn.microsoft.com/en-us/azure/service-bus-messaging/topic-filters
- Authenticate an application to access Azure Service Bus entities: https://learn.microsoft.com/en-us/azure/service-bus-messaging/authenticate-application

## Issues Found
- The queue and topic snippets used `enable_partitioning`, but the current `azurerm_servicebus_queue` and `azurerm_servicebus_topic` schema use `partitioning_enabled`. I corrected the attribute names.
- The Premium namespace example was incomplete for current `azurerm` behavior. Premium namespaces require `premium_messaging_partitions`, and partitioned Premium namespaces require queues and topics in that namespace to also have `partitioning_enabled = true`. I added `premium_messaging_partitions` and aligned the queue/topic examples with that requirement.
- The topic subscription example used an inline `rule {}` block inside `azurerm_servicebus_subscription`, which is not how the current provider models subscription rules. I replaced it with a separate `azurerm_servicebus_subscription_rule` resource.
- The original subscription filter comment implied the filter would be exclusive. Azure Service Bus creates a `$Default` rule for new subscriptions that matches all messages, so I added a note explaining that the default rule must be removed or replaced separately if exclusive filtering is required.
- The SQL filter used an unscoped property reference. I changed it to `user.EventType LIKE 'Order%'` to match current Microsoft guidance for filtering on application properties.
- The post description referred to “authorization rules,” but the article’s code uses RBAC assignments and subscription rules rather than SAS authorization rules. I corrected the wording.
- The dead-letter queue best-practice bullet implied DLQs must be explicitly enabled as a general feature. In Service Bus, queues and subscriptions already have built-in DLQs, while `dead_lettering_on_message_expiration` specifically controls expiration behavior. I corrected that explanation.
- The post used the older “Azure AD” name in the authentication guidance. I updated it to “Microsoft Entra ID.”

## Review Notes
- The subscription-rule caveat remains important: with the current `azurerm` provider, exclusive filtering on a newly created subscription still requires handling the auto-created `$Default` rule outside this simple snippet.
- Azure Service Bus Premium namespace partitioning is region-dependent. The revised production example assumes deployment to a region where Premium partitioning is supported.
