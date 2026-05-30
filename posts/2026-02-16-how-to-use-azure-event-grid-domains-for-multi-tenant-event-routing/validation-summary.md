# Validation Summary: How to Use Azure Event Grid Domains for Multi-Tenant Event Routing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Event Grid domains
- Azure Event Grid domain topics and event subscriptions
- Azure CLI
- Azure Resource Manager / Bicep
- Azure SDK for .NET
- Azure RBAC
- Azure Monitor metrics

## Sources Consulted
- Azure Event Grid event domains concepts: https://learn.microsoft.com/en-us/azure/event-grid/event-domains
- Manage topics and publish events using event domains: https://learn.microsoft.com/en-us/azure/event-grid/how-to-event-domains
- Azure CLI `az eventgrid domain`: https://learn.microsoft.com/en-us/cli/azure/eventgrid/domain
- Azure CLI `az eventgrid domain topic`: https://learn.microsoft.com/en-us/cli/azure/eventgrid/domain/topic
- Azure CLI `az eventgrid domain topic event-subscription`: https://learn.microsoft.com/en-us/cli/azure/eventgrid/domain/topic/event-subscription
- Azure CLI `az eventgrid domain event-subscription`: https://learn.microsoft.com/en-us/cli/azure/eventgrid/domain/event-subscription
- Azure Event Grid quotas and limits: https://learn.microsoft.com/en-us/azure/event-grid/quotas-limits
- Azure Event Grid EventGridEvent .NET API: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.eventgrid.eventgridevent
- Azure Event Grid EventGridPublisherClient .NET API: https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.eventgrid.eventgridpublisherclient
- Azure Resource Manager Event Grid .NET API: https://learn.microsoft.com/en-us/dotnet/api/azure.resourcemanager.eventgrid
- Azure Event Grid ARM/Bicep resource reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.eventgrid/2022-06-15/domains
- Azure Event Grid RBAC and Microsoft Entra publishing authentication: https://learn.microsoft.com/en-us/azure/event-grid/authenticate-with-microsoft-entra-id

## Issues Found
- The domain topic Azure CLI commands used `az eventgrid domain-topic ...`, which is not the current command group. Changed them to `az eventgrid domain topic ...`.
- The post said domain topics are auto-created on first publish. Microsoft documentation describes automatic domain topic creation when creating the first event subscription for a domain topic, so the wording was corrected.
- The tenant onboarding SDK snippet stopped after getting the event subscription collection and did not create the subscription. Added `EventGridSubscriptionData` with a `WebHookEventSubscriptionDestination` and a `CreateOrUpdateAsync` call.
- The throughput limit omitted the MB/sec constraint and claimed it could be increased. Updated it to the documented domain publish limit of 5,000 events or 5 MB per second, whichever comes first.
- The monitoring command for listing domain topics used the invalid `az eventgrid domain-topic list` command. Changed it to `az eventgrid domain topic list`.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI validation was performed against Microsoft Learn command reference pages rather than local `az --help` output.
