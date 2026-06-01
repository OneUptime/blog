# Validation Summary: How to Build Azure Service Bus Namespaces with Topics and Subscriptions in Bicep

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Service Bus
- Azure Bicep
- Azure Resource Manager resource types
- Azure CLI
- Azure Monitor diagnostic settings

## Sources Consulted
- Microsoft.ServiceBus namespaces 2026-01-01 Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/2026-01-01/namespaces
- Microsoft.ServiceBus namespaces/topics 2026-01-01 Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/2026-01-01/namespaces/topics
- Microsoft.ServiceBus namespaces/topics/subscriptions 2026-01-01 Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/2026-01-01/namespaces/topics/subscriptions
- Microsoft.ServiceBus namespaces/topics/subscriptions/rules 2026-01-01 Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.servicebus/2026-01-01/namespaces/topics/subscriptions/rules
- Azure Service Bus topics, subscriptions, and default subscription rules: https://learn.microsoft.com/en-gb/azure/service-bus-messaging/service-bus-queues-topics-subscriptions
- Azure Service Bus topic filters and actions: https://learn.microsoft.com/en-us/azure/service-bus-messaging/topic-filters
- Azure Service Bus quotas and tier limits: https://learn.microsoft.com/azure/service-bus-messaging/service-bus-quotas
- Azure Service Bus duplicate detection: https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection
- Azure Service Bus dead-letter queues: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues
- Azure CLI az deployment group create reference: https://learn.microsoft.com/en-us/cli/azure/deployment/group?view=azure-cli-latest
- Microsoft.Insights diagnosticSettings Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/2021-05-01-preview/diagnosticsettings

## Issues Found
- The namespace snippet allowed `Basic` even though the template is for topics and subscriptions, which require Standard or Premium. Removed `Basic` from the allowed values.
- The namespace snippet said local authentication was disabled, but `disableLocalAuth` was set to `false`. Changed it to `true` and updated the wording to Microsoft Entra ID/SAS terminology.
- The output comment incorrectly said the template outputs a connection string. Changed it to describe the actual namespace ID and name outputs.
- The Service Bus resource examples used the older `2022-10-01-preview` API version. Updated the examples to the current stable `2026-01-01` Service Bus resource API.
- The `supportOrdering` comment incorrectly tied topic ordering to sessions. Updated it to describe ordered forwarding to subscriptions.
- The filter-rule examples added named rules while leaving the default true rule in place, which would still allow all messages through each subscription. Changed the examples to update the `$Default` rule for each subscription and added a short note explaining why.
- The analytics subscription comment said it needed all order events, but the later correlation filter narrows it to JSON events from `order-api`. Updated the comment to match the filter.
- The monitoring text said Bicep does not cover monitoring directly, while the post immediately shows a diagnostic settings resource. Reworded this to say the core topology snippets do not cover monitoring.
- The diagnostic settings snippet referenced `logAnalyticsWorkspaceId` without declaring it. Added a parameter declaration.

## Review Notes
Local `az` and `bicep` executables were not available in the review environment, so command syntax and resource schemas were verified against official Microsoft documentation instead of local compilation.
