# Validation Summary: How to Build a Multi-Region Azure Cosmos DB App with Session Consistency in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Azure Cosmos DB multi-region writes
- Azure Cosmos DB consistency levels and session tokens
- Azure Cosmos DB .NET SDK v3
- ASP.NET Core
- Azure CLI
- Azure Container Apps
- Azure Front Door

## Sources Consulted
- Azure Cosmos DB consistency levels: https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels
- Configure multi-region writes for Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/how-to-multi-master
- Azure Cosmos DB conflict resolution policies: https://learn.microsoft.com/en-us/azure/cosmos-db/conflict-resolution-policies
- Manage Azure Cosmos DB conflict resolution policies: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-manage-conflicts
- Create an item in Azure Cosmos DB for NoSQL using .NET: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-dotnet-create-item
- Read an item in Azure Cosmos DB for NoSQL using .NET: https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/how-to-dotnet-read-item
- `CosmosClientOptions.ApplicationPreferredRegions` API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.cosmosclientoptions.applicationpreferredregions
- `ItemRequestOptions.SessionToken` API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.itemrequestoptions.sessiontoken
- `Headers.Session` API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.headers.session
- Azure Cosmos DB CLI examples: https://learn.microsoft.com/en-us/azure/cosmos-db/manage-with-cli
- Azure Container Apps environment variables: https://learn.microsoft.com/en-us/azure/container-apps/environment-variables
- Azure Container Apps secrets: https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets

## Issues Found
- The `SessionTokenManager.SaveToken` method accepted `ItemResponse<dynamic>`, which would not accept `ItemResponse<UserProfile>` because generic classes are invariant. I changed it to generic overloads for `ItemResponse<T>` and `FeedResponse<T>`.
- The singleton session token dictionary was a plain `Dictionary<string, string>`, which is not safe for concurrent ASP.NET Core requests. I changed it to `ConcurrentDictionary<string, string>`.
- The user profile model used `Id`, `Region`, and other PascalCase properties without JSON mapping. Azure Cosmos DB for NoSQL requires the item identifier field to be lowercase `id`, and the query used lowercase `c.region`. I added `JsonProperty` mappings.
- The upsert path did not guarantee that the Cosmos DB item id matched the `userId` used by `ReadItemAsync`. I set `profile.Id = profile.UserId` before upsert.
- The conflict resolution sample used `/updatedAt`, but Last Writer Wins custom resolution paths for API for NoSQL must be numeric. I added an `updatedAtEpoch` numeric property and changed the resolution path to `/updatedAtEpoch`.
- The conflict resolution code comment incorrectly described the sample as stored-procedure-based custom conflict resolution. I corrected it to Last Writer Wins with a custom numeric path.
- The query method did not persist the session token returned by paged query responses. I saved the token after each `ReadNextAsync`.
- The middleware sample referenced `SaveTokenDirect`, but that method was not implemented. I added it to `SessionTokenManager`.
- The middleware read a response session token from `HttpContext.Items`, but no code ever wrote that item. I changed it to read the current token from `SessionTokenManager`.
- The middleware was defined but not registered in the ASP.NET Core pipeline. I added `app.UseMiddleware<SessionTokenMiddleware>();`.
- The deployment sample used `AZURE_REGION=East_US` and `AZURE_REGION=West_Europe`, which are not valid Cosmos SDK region display names. I changed them to `"East US"` and `"West Europe"`.
- The Azure Container Apps secret-backed environment variable examples were unquoted across continued lines. I quoted the `key=value` entries to match Azure CLI guidance and preserve spaces in region names.
- The comment for `EnableContentResponseOnWrite` claimed it was needed to get the session token. Session tokens are response headers; the option controls whether the write response includes the resource body. I corrected the comment.

## Review Notes
- The Azure CLI and .NET SDK were not installed in the local environment, so local execution was not possible. CLI and SDK validation was performed against current Microsoft Learn documentation and Azure SDK API reference pages.
- The .NET SDK tracks session tokens automatically within a single client instance. Manual token propagation is still relevant for stateless web applications or multi-node web tiers, which is the scenario covered by the post.
