# Validation Summary: How to Monitor Azure Service Bus Queue Depth and Set Up Alerts

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure Service Bus
- Azure Monitor metrics and metric alerts
- Azure CLI
- Bicep / Azure Resource Manager metric alert resources
- Azure.Messaging.ServiceBus .NET SDK
- Azure Workbooks
- Azure Functions, App Service, and AKS scaling concepts

## Sources Consulted
- Azure Service Bus monitoring data reference: https://learn.microsoft.com/en-us/azure/service-bus-messaging/monitor-service-bus-reference
- Monitor Azure Service Bus: https://learn.microsoft.com/en-us/azure/service-bus-messaging/monitor-service-bus
- Azure CLI `az monitor metrics alert create` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft.Insights/metricAlerts ARM/Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/metricalerts
- Azure Monitor metric alert ARM template samples: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/resource-manager-alerts-metric
- Azure Monitor dynamic thresholds overview: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-dynamic-thresholds
- Azure.Messaging.ServiceBus.Administration `ServiceBusAdministrationClient.GetQueueRuntimePropertiesAsync`: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.administration.servicebusadministrationclient.getqueueruntimepropertiesasync
- Azure.Messaging.ServiceBus.Administration `QueueRuntimeProperties`: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.servicebus.administration.queueruntimeproperties
- Azure Functions Service Bus trigger documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus-trigger

## Issues Found
- The dead-letter metric alert used `Total` aggregation in Bicep. Azure Service Bus `DeadletteredMessages` is a point-in-time count metric that supports average, minimum, and maximum aggregations, so the Bicep example now uses `Maximum`.
- The Azure CLI dead-letter alert used `total DeadletteredMessages`. The CLI condition was updated to `max DeadletteredMessages` for the same aggregation reason.
- The Azure Workbook section used a Log Analytics `AzureMetrics` KQL query for `ActiveMessages` split by queue. Microsoft documents that Service Bus active-message metrics are not exported to diagnostic settings, and dimensions are not included in exported metrics sent to Log Analytics. The section now uses a Workbook Metrics data source configuration instead of KQL.

## Review Notes
The SDK sample uses current `Azure.Messaging.ServiceBus.Administration` APIs and valid runtime property names. Dynamic thresholds and dimension-based alerting are supported by Azure Monitor, but in production the exact alert behavior should be tested with the target namespace and queues because dynamic thresholds need historical data before they become fully useful.
