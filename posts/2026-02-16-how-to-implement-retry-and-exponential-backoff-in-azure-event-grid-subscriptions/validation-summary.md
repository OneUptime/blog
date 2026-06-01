# Validation Summary: How to Implement Retry and Exponential Backoff in Azure Event Grid Subscriptions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Event Grid
- Azure CLI
- Azure Resource Manager / Bicep
- Azure Monitor metrics
- Azure Functions for .NET isolated worker
- Azure.Messaging.EventGrid for .NET
- Polly retry policies
- C# asynchronous programming

## Sources Consulted
- Microsoft Learn: Event Grid message delivery and retry - https://learn.microsoft.com/en-us/azure/event-grid/delivery-and-retry
- Microsoft Learn: Azure CLI `az eventgrid event-subscription create` reference - https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription
- Microsoft Learn: `Microsoft.EventGrid/topics/eventSubscriptions@2022-06-15` Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.eventgrid/2022-06-15/topics/eventsubscriptions
- Microsoft Learn: Supported metrics for `Microsoft.EventGrid/topics` - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-eventgrid-topics-metrics
- Microsoft Learn: Supported metrics for `Microsoft.EventGrid/eventSubscriptions` - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-eventgrid-eventsubscriptions-metrics
- Microsoft Learn: Receive Azure Event Grid events to an HTTP endpoint - https://learn.microsoft.com/en-us/azure/event-grid/receive-events
- Microsoft Learn: `EventGridEvent` class for .NET - https://learn.microsoft.com/en-us/dotnet/api/azure.messaging.eventgrid.eventgridevent
- Polly documentation: Retry resilience strategy - https://www.pollydocs.org/strategies/retry.html

## Issues Found
- The retry schedule incorrectly stated that retry 7 and beyond happen every 60 minutes. Updated it to match the documented schedule: 1 hour, 3 hours, 6 hours, then every 12 hours up to 24 hours.
- The article described `maxDeliveryAttempts` examples as retry counts. Changed this wording to delivery attempts, because the setting is the maximum number of delivery attempts, not additional retries after the first attempt.
- The Bicep comment described `maxDeliveryAttempts` as maximum retries. Changed the comment to maximum delivery attempts.
- The HTTP status code section omitted successful 203 and 204 responses. Added both documented success codes.
- The HTTP status code section incorrectly listed 404 as a universal non-retryable permanent error and treated 401 too broadly. Updated the section to reflect documented endpoint-specific behavior, including WebHook-specific 401 handling and Azure resource endpoint retries for 401 and 404.
- The best-practices section recommended all 4xx responses for permanent failures. Narrowed the advice to documented non-retryable statuses because some 4xx responses, such as 408 and 429, are retryable.
- The Mermaid retry timeline used minute-scale durations for 10-second and 30-second waits. Replaced it with a sequence diagram that accurately describes the wait intervals.
- The Azure Function WebHook example did not handle Event Grid subscription validation. Added a minimal `SubscriptionValidationEventData` branch that returns the required `validationResponse` before processing normal events.

## Review Notes
Azure CLI could not be checked locally because `az` is not installed in the workspace environment, so CLI flags were verified against the official Microsoft Learn CLI reference. The Polly example uses the established `WaitAndRetryAsync` API style; newer Polly versions also support the resilience pipeline API, but the snippet remains technically valid for projects using the classic Polly API.
