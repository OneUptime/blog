# Validation Summary: How to Build GraphQL APIs with Hot Chocolate in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- ASP.NET Core
- C#
- GraphQL
- Hot Chocolate
- Entity Framework Core
- DataLoader / GreenDonut
- GraphQL filtering, sorting, projections, pagination, mutations, subscriptions, authorization, and persisted operations

## Sources Consulted
- Hot Chocolate v16 getting started: https://chillicream.com/docs/hotchocolate/v16/get-started-with-graphql-in-net-core/
- Hot Chocolate v16 Entity Framework Core integration: https://chillicream.com/docs/hotchocolate/v16/fetching-data/integrations/entity-framework/
- Hot Chocolate v16 DataLoader documentation: https://chillicream.com/docs/hotchocolate/v16/fetching-data/batching/dataloader/
- Hot Chocolate v16 filtering documentation: https://chillicream.com/docs/hotchocolate/v16/fetching-data/filtering/
- Hot Chocolate v16 sorting documentation: https://chillicream.com/docs/hotchocolate/v16/fetching-data/sorting/
- Hot Chocolate v16 projections documentation: https://chillicream.com/docs/hotchocolate/v16/fetching-data/projections/
- Hot Chocolate v16 pagination documentation: https://chillicream.com/docs/hotchocolate/v16/fetching-data/pagination/
- Hot Chocolate v16 subscriptions documentation: https://chillicream.com/docs/hotchocolate/v16/defining-a-schema/subscriptions/
- Hot Chocolate v16 authorization documentation: https://chillicream.com/docs/hotchocolate/v16/security/authorization/
- Hot Chocolate v16 cost analysis and public API guidance: https://chillicream.com/docs/hotchocolate/v16/security/cost-analysis/ and https://chillicream.com/docs/hotchocolate/v16/guides/public-api/
- Hot Chocolate v16 persisted operations documentation: https://chillicream.com/docs/hotchocolate/v16/performance/trusted-documents/
- Hot Chocolate v14 and v15 migration notes for removed/deprecated APIs: https://chillicream.com/docs/hotchocolate/v16/migrating/migrate-from-13-to-14/ and https://chillicream.com/docs/hotchocolate/v16/migrating/migrate-from-14-to-15/

## Issues Found
- The setup commands omitted packages required by later snippets: Hot Chocolate authorization, persisted operation filesystem storage, JWT bearer authentication, and SQL Server EF Core provider. Added the missing package commands.
- The examples used older Hot Chocolate registration style and obsolete EF integration APIs such as `[UseDbContext]`, `[ScopedService]`, `RegisterDbContext<T>()`, and `DbContextKind.Pooled`. Updated the snippets to use direct resolver injection with `RegisterDbContextFactory<ApplicationDbContext>()`.
- The DataLoader examples used optional `DataLoaderOptions`, which is no longer valid in current Hot Chocolate/GreenDonut patterns. Made `DataLoaderOptions` required.
- The review DataLoader used `GroupedDataLoader`, which current migration guidance discourages. Reworked it to a `BatchDataLoader<int, Review[]>` that returns grouped review arrays.
- The complete registration sample manually registered DataLoaders on the GraphQL builder. Updated it to use `builder.Services.AddDataLoader(...)`, matching current GreenDonut registration guidance.
- The authorization snippet called Hot Chocolate `.AddAuthorization()` but did not register ASP.NET Core authentication/authorization services. Added `AddAuthentication().AddJwtBearer()` and `AddAuthorization()`, and noted that GraphQL fields should use `HotChocolate.Authorization.AuthorizeAttribute`.
- The persisted query performance snippet used outdated API names: `UsePersistedQueryPipeline()` and `AddReadOnlyFileSystemQueryStorage(...)`. Updated it to `UsePersistedOperationPipeline()` and `AddFileSystemOperationDocumentStorage(...)`.
- The performance snippet claimed response caching via `UseQueryCachePipeline()`, which did not match current Hot Chocolate v16 guidance. Removed that call and updated the wording to persisted operations and query analysis.
- The pagination snippets used projection-capable registration but omitted `[UseProjection]` on paged fields. Added `[UseProjection]` in the documented middleware order.

## Review Notes
The local environment did not have the `dotnet` CLI installed, so compile validation could not be performed locally. The review was performed against current official Hot Chocolate v16 documentation and migration notes. The post still uses explicit `AddQueryType<T>()` style rather than the newer source-generator-first `[QueryType]`/`AddTypes()` style; this is acceptable as a code-first tutorial, but a future update could modernize the whole article around the v16 source-generator template.
