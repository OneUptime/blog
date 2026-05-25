# Validation Summary: How to Create Azure Queue Storage in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM Provider
- Azure Storage Accounts
- Azure Queue Storage
- Azure Monitor metric alerts
- Azure Functions for Node.js
- Azure Service Bus

## Sources Consulted
- HashiCorp Terraform AzureRM `azurerm_storage_account` resource documentation for v3.80.0: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/storage_account.html.markdown
- HashiCorp Terraform AzureRM `azurerm_storage_queue` resource documentation for v3.80.0: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/storage_queue.html.markdown
- HashiCorp Terraform AzureRM `azurerm_storage_account_network_rules` resource documentation for v3.80.0: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/storage_account_network_rules.html.markdown
- HashiCorp Terraform AzureRM `azurerm_monitor_metric_alert` resource documentation for v3.80.0: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/monitor_metric_alert.html.markdown
- HashiCorp Terraform AzureRM `azurerm_linux_function_app` resource documentation for v3.117.1: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.117.1/website/docs/r/linux_function_app.html.markdown
- Azure Queue Storage introduction and limits: https://learn.microsoft.com/en-us/azure/storage/queues/reference
- Azure Queue Storage monitoring data reference: https://learn.microsoft.com/en-us/azure/storage/queues/monitor-queue-storage-reference
- Azure Queue Storage monitoring best practices: https://learn.microsoft.com/en-us/azure/storage/queues/queues-storage-monitoring-scenarios
- Azure Functions Queue Storage trigger documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue-trigger
- Azure Functions Node.js developer reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
- Azure Storage queues and Service Bus queues comparison: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-azure-and-service-bus-queues-compared-contrasted
- Azure Service Bus quotas and limits: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-quotas
- Azure Queue Storage pricing page: https://azure.microsoft.com/en-us/pricing/details/storage/queues/

## Issues Found
- The Azure Monitor example scoped `QueueMessageCount` to the storage account ID even though the metric namespace is `Microsoft.Storage/storageAccounts/queueServices`. Changed the scope to the queue service child resource ID, `${azurerm_storage_account.queues.id}/queueServices/default`, based on Azure Queue Storage monitoring documentation.
- The monitoring text and alert cadence implied near-real-time backlog detection. `QueueMessageCount` is sampled hourly and Microsoft notes that message count monitoring is refreshed daily, so the example now uses `frequency = "PT1H"` and `window_size = "P1D"` and the surrounding text no longer says "early."
- The Function App example used Node.js 18. Azure Functions still documents Node.js 18 as supported for the v4 programming model, but Node.js 20 is a more current supported target and is accepted by the AzureRM v3 provider line allowed by `~> 3.80`, so the example now uses `node_version = "20"`.
- The Service Bus comparison said Service Bus queues guarantee FIFO ordering without qualification. Updated it to say FIFO can be provided with sessions, which matches Microsoft documentation.
- The pricing paragraph gave fixed dollar amounts that vary by Azure region, redundancy option, and operation class. Replaced the exact figures with a durable statement about the pricing dimensions and a note to check the current Azure pricing page.

## Review Notes
The Terraform examples are pinned to the AzureRM 3.x provider line. The inline `queue_properties` block is valid for that provider line, but newer AzureRM 4.x documentation also exposes queue properties as a separate resource. Future updates could modernize the examples to AzureRM 4.x, but the current pinned version keeps the snippets technically valid.
