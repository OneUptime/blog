# Validation Summary: How to Create Azure Event Grid in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Event Grid custom topics
- Azure Event Grid event subscriptions
- Azure Event Grid system topics
- Azure Event Grid domains
- Azure Storage Queues and Blob Storage
- Azure Service Bus

## Sources Consulted
- HashiCorp AzureRM provider v3.80.0 `azurerm_eventgrid_topic` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/eventgrid_topic
- HashiCorp AzureRM provider v3.80.0 `azurerm_eventgrid_event_subscription` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/eventgrid_event_subscription
- HashiCorp AzureRM provider v3.80.0 `azurerm_eventgrid_system_topic` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/eventgrid_system_topic
- HashiCorp AzureRM provider v3.80.0 `azurerm_eventgrid_system_topic_event_subscription` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/eventgrid_system_topic_event_subscription
- HashiCorp AzureRM provider v3.80.0 `azurerm_eventgrid_domain` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/eventgrid_domain
- HashiCorp AzureRM provider v3.80.0 `azurerm_eventgrid_domain_topic` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/eventgrid_domain_topic
- Azure Event Grid overview: https://learn.microsoft.com/en-us/azure/event-grid/overview
- Azure Event Grid event handlers: https://learn.microsoft.com/en-us/azure/event-grid/event-handlers
- Azure Event Grid delivery and retry: https://learn.microsoft.com/en-us/azure/event-grid/delivery-and-retry
- Azure Event Grid managed identities for delivery: https://learn.microsoft.com/azure/event-grid/managed-service-identity
- Azure Event Grid domains: https://learn.microsoft.com/en-us/azure/event-grid/how-to-event-domains

## Issues Found
- The system-topic subscription used the literal queue name `"blob-notifications"`, so Terraform had no dependency edge from the Event Grid subscription to `azurerm_storage_queue.blob_notifications`. Changed it to `azurerm_storage_queue.blob_notifications.name` so the queue is created before the subscription.
- The custom topic example commented that the topic identity was "for authenticated delivery." A managed identity on the topic is required for managed-identity delivery, but the subscription must also be configured to use it. Updated the comment to say the identity can be used by event subscriptions for authenticated delivery.

## Review Notes
- The post pins AzureRM to `~> 3.80`, and the reviewed Terraform resource names, blocks, attributes, retry policy fields, advanced filters, Event Grid schema values, system topic settings, and domain topic settings are valid for AzureRM v3.80.0.
- AzureRM v4 is the current major provider line as of this review date. The examples remain valid for the pinned v3.80 provider, but a future refresh could update the provider version and account for any v4 provider configuration requirements.
