# Validation Summary: Create an Azure Managed Application with Custom Metering for Usage-Based Billing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Azure Marketplace
- Azure Managed Applications
- Microsoft Marketplace Metering Service API
- Partner Center custom meter dimensions
- Azure Functions
- C# / .NET
- Azure Cosmos DB for NoSQL
- ARM templates
- Managed identities / Microsoft Entra authentication
- curl / HTTP API testing

## Sources Consulted
- Microsoft Learn: Microsoft Marketplace metered billing APIs - https://learn.microsoft.com/en-us/partner-center/marketplace-offers/marketplace-metering-service-apis
- Microsoft Learn: Marketplace metering service authentication strategies - https://learn.microsoft.com/en-us/partner-center/marketplace-offers/marketplace-metering-service-authentication
- Microsoft Learn: Configure a managed application plan - https://learn.microsoft.com/en-us/partner-center/marketplace-offers/azure-app-managed
- Microsoft Learn: Managed application metered billing - https://learn.microsoft.com/en-us/partner-center/marketplace-offers/azure-app-metered-billing
- Microsoft Learn: Query items in Azure Cosmos DB for NoSQL using .NET - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-dotnet-query-items
- Microsoft Learn: Azure.Cosmos.Serialization namespace - https://learn.microsoft.com/en-ca/dotnet/api/azure.cosmos.serialization

## Issues Found
- The post implied raw usage could be sent hourly or daily. Microsoft documents one usage event per hour per resource and dimension, and usage can only be emitted for the past 24 hours. Updated the flow to report billable usage hourly.
- The post described included quantity as a billing threshold but did not state that publishers must only send usage above the base fee. Updated the text and code comments to make clear that the application must track the allowance and emit only billable overage usage.
- The Cosmos DB queries used camelCase field names even though the C# object shown writes PascalCase properties unless a serializer naming policy is configured. Updated the queries and dynamic result access to use the shown property names.
- The metering reporter marked an entire hour as reported even if one dimension failed. Updated the code so the hour is marked reported only when every dimension was accepted or already recorded.
- The retry logic treated HTTP 409 duplicate responses as failures. Microsoft documents 409 as an already successfully reported event for the same resource, hour, and dimension. Updated the code to treat conflicts as already recorded.
- The `effectiveStartTime` formatting did not explicitly include UTC. Updated the string format to include a trailing `Z`.
- The testing section referred to a metering API sandbox. Microsoft documents testing with preview/private plans and zero-priced custom dimensions, not a separate sandbox endpoint. Updated the wording and curl comment.
- The sample managed application request placeholder said `your-managed-app-resource-id`. Microsoft documents the single usage event `resourceId` for Azure Application Managed Apps plans as the managed app resource group ID. Updated the placeholder.
- The wrap-up implied new billing dimensions can simply be added to any existing plan. Microsoft documents plan-specific enablement behavior for dimensions. Updated the wording to refer to new or updated plans and enabling the dimension on the plan.

## Review Notes
The Azure Functions examples use the in-process attribute style (`FunctionName` / `TimerTrigger`). That style is still recognizable, but projects should confirm their target Azure Functions worker model and support timeline before using the snippets unchanged. The snippets also omit surrounding model classes, dependency injection registration, using directives, quota-tracking implementation, and ARM resources for the Function App, so they should be treated as focused examples rather than a complete deployable solution.
