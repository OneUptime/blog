# Validation Summary: How to Create Azure Service Bus in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Service Bus namespaces
- Azure Service Bus queues, topics, subscriptions, and subscription rules
- Azure Service Bus SAS authorization rules
- Azure virtual networks and service endpoints

## Sources Consulted
- HashiCorp AzureRM provider v3.80.0 `azurerm_servicebus_namespace` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/servicebus_namespace.html.markdown
- HashiCorp AzureRM provider v3.80.0 `azurerm_servicebus_queue` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/servicebus_queue.html.markdown
- HashiCorp AzureRM provider v3.80.0 `azurerm_servicebus_topic` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/servicebus_topic.html.markdown
- HashiCorp AzureRM provider v3.80.0 `azurerm_servicebus_subscription` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/servicebus_subscription.html.markdown
- HashiCorp AzureRM provider v3.80.0 `azurerm_servicebus_subscription_rule` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/servicebus_subscription_rule.html.markdown
- HashiCorp AzureRM provider v3.80.0 Service Bus authorization rule documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/servicebus_namespace_authorization_rule.html.markdown
- Microsoft Learn, Azure Service Bus duplicate detection: https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection
- Microsoft Learn, Azure Service Bus message sessions: https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions
- Microsoft Learn, Azure Service Bus transaction processing: https://learn.microsoft.com/en-ca/azure/service-bus-messaging/service-bus-transactions
- Microsoft Learn, Azure Service Bus service endpoints: https://learn.microsoft.com/en-in/azure/service-bus-messaging/service-bus-service-endpoints
- Microsoft Azure Service Bus pricing details: https://azure.microsoft.com/en-us/pricing/details/service-bus/

## Issues Found
- The post claimed Service Bus is appropriate for "exactly-once delivery." Azure Service Bus supports at-least-once delivery, and duplicate detection can discard duplicate sends within a configured window when producers reuse the same message ID. Changed the wording to "At-least-once delivery with duplicate detection for producer retries."
- The queue explanation said each message is consumed by exactly one receiver. Because Service Bus uses at-least-once delivery and messages can be redelivered after lock loss or processing failure, changed this to say each message is delivered to a single competing receiver at a time.
- The subscription example used `dead_lettering_on_filter_evaluation_exception`, which is not an AzureRM v3.80.0 argument. Replaced it with the correct `dead_lettering_on_filter_evaluation_error` argument.
- The billing subscription comment said dead-lettered messages were forwarded to a queue, but no `forward_dead_lettered_messages_to` setting was configured. Updated the comment to describe the actual dead-letter settings.
- The `auto_delete_on_idle` comment said "0 means never," but the Terraform argument expects an ISO 8601 duration with a minimum idle interval; omitting the setting is the way to avoid configuring auto-delete in this example. Updated the comment.
- The Premium network-rule example added a subnet rule with `ignore_missing_vnet_service_endpoint = false` but did not enable the `Microsoft.ServiceBus` service endpoint on the subnet. Added `service_endpoints = ["Microsoft.ServiceBus"]`.
- The Premium network-rule example disabled public network access while also configuring service-endpoint based selected-network access. Azure Service Bus service endpoint rules require selected public network access, while disabled public access is for private endpoint-only access. Updated the example to keep public network access enabled and deny by default through the network rule set.

## Review Notes
- The post pins AzureRM `~> 3.80`, so the examples were reviewed against the AzureRM 3.80 documentation. Current AzureRM 4.x documentation uses some renamed Service Bus arguments, so a future provider upgrade would need a separate pass.
- Terraform CLI was not installed in the review environment, so `terraform validate` could not be run locally.
