# Validation Summary: How to Use GraphQL APIs with Hot Chocolate in ASP.NET Core on Azure App Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure App Service
- Azure CLI
- GraphQL
- Hot Chocolate
- ASP.NET Core
- C#
- Entity Framework Core
- SQL Server / Azure SQL connection strings

## Sources Consulted
- Hot Chocolate Entity Framework Core integration: https://chillicream.com/docs/hotchocolate/v15/integrations/entity-framework/
- Hot Chocolate endpoints and GraphQLServerOptions: https://chillicream.com/docs/hotchocolate/v15/server/endpoints/
- Hot Chocolate filtering: https://chillicream.com/docs/hotchocolate/v15/fetching-data/filtering/
- Hot Chocolate sorting: https://chillicream.com/docs/hotchocolate/v15/fetching-data/sorting/
- Hot Chocolate authorization: https://chillicream.com/docs/hotchocolate/v15/security/authentication/
- Azure CLI webapp command reference: https://learn.microsoft.com/en-us/cli/azure/webapp?view=azure-cli-latest
- Azure CLI connection string command reference: https://learn.microsoft.com/en-us/cli/azure/webapp/config/connection-string?view=azure-cli-latest
- Azure CLI zip deployment command reference: https://learn.microsoft.com/en-us/cli/azure/webapp/deployment/source?view=azure-cli-latest
- Azure App Service ASP.NET Core configuration: https://learn.microsoft.com/en-us/azure/app-service/configure-language-dotnetcore

## Issues Found
- The post claimed it covered subscriptions, but the tutorial only implements queries and mutations. Updated the description to remove subscriptions from the implemented scope.
- The opening paragraph included schema stitching in a list of GraphQL specification features. Removed schema stitching from that claim because it is not part of the GraphQL specification.
- The query comments claimed pagination support in the `GetBooks` resolver, but the code did not use `[UsePaging]`. Updated the wording to filtering and sorting only.
- The resolver examples used the older `[UseDbContext]` and `[ScopedService]` pattern with a pooled DbContext factory. Updated the examples to use direct `BookstoreContext` resolver injection and added `.RegisterDbContextFactory<BookstoreContext>()`, matching the current Hot Chocolate EF Core factory pattern.
- The setup commands omitted the Hot Chocolate authorization package even though the production snippet used `.AddAuthorization()`. Added `HotChocolate.AspNetCore.Authorization`.
- The Azure App Service Linux runtime value used `DOTNET|8.0`. Updated it to `DOTNETCORE:8.0`, which matches current Azure CLI runtime naming for Linux web apps.
- The production endpoint snippet only mapped GraphQL inside the non-development branch. Updated it to always map GraphQL while disabling the built-in IDE outside development.
- Updated "Banana Cake Pop" references to "Nitro GraphQL IDE", the current Hot Chocolate IDE name.
- The conclusion mentioned pagination support as part of the tutorial outcome even though the code does not configure paging. Updated it to filtering and sorting.

## Review Notes
The local environment did not have `dotnet` or `az` installed, so CLI and compile validation were performed against official documentation rather than local command execution. The example still uses a placeholder SQL connection string; for a production deployment, managed identity or Key Vault-backed configuration would be preferable to a password-based connection string.
