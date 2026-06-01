# Validation Summary: How to Use Azure Managed Application Notifications with Azure Event Grid

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Managed Applications
- Azure Marketplace / Partner Center notification endpoints
- Azure Event Grid system topics and event subscriptions
- Azure Resource Manager resource events
- ASP.NET Core webhook controllers
- Azure Functions and Durable Functions
- Azure Cosmos DB SDK

## Sources Consulted
- Azure managed applications with notifications: https://learn.microsoft.com/en-us/azure/azure-resource-manager/managed-applications/publish-notifications
- System topics in Azure Event Grid: https://learn.microsoft.com/en-us/azure/event-grid/system-topics
- Create, view, and manage Event Grid system topics using Azure CLI: https://learn.microsoft.com/en-us/azure/event-grid/create-view-manage-system-topics-cli
- az eventgrid system-topic CLI reference: https://learn.microsoft.com/en-us/cli/azure/eventgrid/system-topic
- az eventgrid event-subscription CLI reference: https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription
- Azure subscription and resource group Event Grid event schema: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-subscriptions
- Azure Resource Notifications as an Azure Event Grid source: https://learn.microsoft.com/en-us/azure/event-grid/event-schema-resource-notifications

## Issues Found
- The post conflated managed application lifecycle notifications with Event Grid system topics. Azure Managed Applications send lifecycle notifications through the configured notification webhook, while Event Grid is appropriate for resource-level events from sources such as subscriptions and resource groups. Updated the introduction and architecture to distinguish these mechanisms.
- The lifecycle event list included non-documented descriptions such as custom resource actions and generic configuration parameter updates. Replaced it with the documented `eventType` and `provisioningState` combinations for PUT, PATCH, and DELETE notifications.
- The Event Grid system topic command used an unsupported topic type, `Microsoft.Solutions.Applications`, and pointed at a publisher subscription/resource group. Updated it to use `Microsoft.Resources.ResourceGroups` with the managed resource group as the source.
- The Partner Center notification endpoint example omitted the documented `/resource` callback behavior and shared-secret query parameter pattern. Updated the URL and webhook route to handle `/resource?sig=...`.
- The webhook sample tried to validate a signature from the body and used payload fields that are not in the documented managed application notification schema, including `SubscriptionId`, `CustomerTenantId`, `ManagedResourceGroupId`, `PlanId`, and `Parameters`. Updated the controller and model to use documented fields such as `eventType`, `applicationId`, `eventTime`, `provisioningState`, `billingDetails`, `plan`, and `error`.
- The Event Grid setup sample depended on the non-existent `ManagedResourceGroupId` notification field. Updated it to resolve the managed resource group ID from the managed application resource before creating a resource-group event subscription.
- The retry section claimed exponential backoff for Azure managed application notification delivery. Updated it to the documented retry conditions and 10-hour retry window.

## Review Notes
The C# snippets remain illustrative and depend on application-specific services such as deployment tracking, notifications, and Azure client setup. A production implementation should also validate the managed application state by issuing a GET for the `applicationId`, as recommended by Microsoft, and Event Grid webhook endpoints should implement Event Grid subscription validation.
