# Validation Summary: How to Design a Multi-Region Active-Active Architecture

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Front Door Standard/Premium
- Azure CLI
- Azure Cosmos DB for NoSQL
- Azure Cosmos DB multi-region writes
- Microsoft.Azure.Cosmos .NET SDK
- ASP.NET Core session state and distributed caching
- Azure Cache for Redis
- Azure App Service
- Azure DevOps Pipelines

## Sources Consulted
- Azure Front Door CLI quickstart: https://learn.microsoft.com/en-us/azure/frontdoor/create-front-door-cli
- Azure Front Door traffic routing methods: https://learn.microsoft.com/en-us/azure/frontdoor/routing-methods
- Azure Front Door origins and origin groups: https://learn.microsoft.com/en-us/azure/frontdoor/origin
- Azure CLI `az afd origin-group` reference: https://learn.microsoft.com/en-us/cli/azure/afd/origin-group
- Azure CLI `az afd route` reference: https://learn.microsoft.com/en-us/cli/azure/afd/route
- Azure CLI `az cosmosdb create` reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb
- Azure Cosmos DB multi-region writes: https://learn.microsoft.com/en-us/azure/cosmos-db/multi-region-writes
- Azure Cosmos DB conflict resolution policies: https://learn.microsoft.com/en-us/azure/cosmos-db/conflict-resolution-policies
- Azure Cosmos DB manage conflicts: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-manage-conflicts
- Microsoft.Azure.Cosmos `ConflictResolutionPolicy`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.conflictresolutionpolicy
- Microsoft.Azure.Cosmos `CosmosClientOptions.ApplicationPreferredRegions`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.cosmosclientoptions.applicationpreferredregions
- Azure CLI `az redis create` reference: https://learn.microsoft.com/en-us/cli/azure/redis
- Azure Cache for Redis overview and retirement notice: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview
- Azure Cache for Redis high availability and zone redundancy: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-high-availability
- ASP.NET Core session state: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/app-state
- ASP.NET Core distributed caching: https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed
- Azure DevOps deployment jobs schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/deployment-jobs
- Azure App Service deploy task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-web-app-v1

## Issues Found
- The Azure Front Door CLI sequence created a profile, endpoint, origin group, and origins, but did not create a route. Added `az afd route create` so the endpoint is actually mapped to the origin group.
- The Cosmos DB conflict-resolution text said Cosmos DB offers three options. Official documentation defines two policies, Last Writer Wins and Custom. Reworded the explanation while preserving the three practical examples.
- The custom Last Writer Wins path example did not state that the custom conflict resolution path must be numeric. Added that requirement.
- The Cosmos DB client comment said `EnableContentResponseOnWrite` is needed for conflict detection. The SDK option controls whether write operations return the item content. Corrected the comment.
- The Redis CLI examples used `P1`; the Azure CLI reference lists Premium VM sizes as lowercase values such as `p1`. Updated both examples.
- The session-management snippet called `AddSession()` without configuring a distributed cache provider, so it did not actually implement distributed session storage. Added a Cosmos DB `IDistributedCache` provider example and clarified Redis as an alternative only when replicated or when regional session loss is acceptable.

## Review Notes
Azure Cache for Redis now has an announced retirement timeline, and Microsoft recommends migration to Azure Managed Redis. The existing `az redis create` examples remain valid for Basic, Standard, and Premium Azure Cache for Redis, but future revisions should consider using Azure Managed Redis examples instead.
