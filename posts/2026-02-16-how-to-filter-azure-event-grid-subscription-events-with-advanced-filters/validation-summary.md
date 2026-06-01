# Validation Summary: How to Filter Azure Event Grid Subscription Events with Advanced Filters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Event Grid
- Azure CLI
- ARM/Bicep templates
- Event Grid event subscriptions
- Event Grid advanced filters

## Sources Consulted
- Microsoft Learn: Understand event filtering for Event Grid subscriptions - https://learn.microsoft.com/en-us/azure/event-grid/event-filtering
- Microsoft Learn: Event filters for subscriptions to Azure Event Grid namespace topics - https://learn.microsoft.com/en-us/azure/event-grid/namespace-event-filtering
- Microsoft Learn: Azure CLI `az eventgrid event-subscription create` reference - https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription?view=azure-cli-latest
- Microsoft Learn: Event Grid Bicep/ARM resource reference for event subscriptions - https://learn.microsoft.com/en-us/azure/templates/microsoft.eventgrid/topics/eventsubscriptions
- Microsoft Learn: Azure Event Grid quotas and limits - https://learn.microsoft.com/en-us/azure/event-grid/quotas-limits
- Microsoft Azure: Event Grid pricing - https://azure.microsoft.com/en-us/pricing/details/event-grid/

## Issues Found
- The post said advanced filters can filter on any event field. Updated this to "supported event fields" because Event Grid documents specific top-level fields and `data` fields for advanced filtering.
- The string operator list omitted `StringNotContains`, `StringNotBeginsWith`, and `StringNotEndsWith`. Added those supported operators.
- The array filtering note implied arrays should generally be restructured. Updated it to mention supported primitive arrays with `enableAdvancedFilteringOnArrays`, while preserving the warning that arrays of objects such as `data.items[0].category` are not supported.
- The architecture diagram used `eventType=Order*`, which could imply wildcard event type matching. Replaced it with explicit event types because Event Grid event type filters match listed event types.
- The debugging section said filters are case-sensitive. Updated this to distinguish filter key paths from string value comparisons, since Event Grid advanced string comparisons are case-insensitive.
- The pricing section said there is no extra cost for filtering and that users only pay for matched delivered events. Updated this because official pricing states Event Grid billing can include published events, advanced filtering, and delivery attempts.
- The limits section described 25 values per `StringIn`/`NumberIn` operator. Updated it to the documented limit of 25 filter values across all advanced filters on a subscription.

## Review Notes
The Azure CLI examples use documented flags and advanced filter syntax. The Bicep example matches the documented Event Grid event subscription schema for advanced filter objects and Azure Function destinations.
