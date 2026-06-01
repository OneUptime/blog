# Validation Summary: How to Implement Distributed Caching with Azure Cache for Redis in ASP.NET Core

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cache for Redis
- Azure Managed Redis
- Azure CLI
- ASP.NET Core
- Microsoft.Extensions.Caching.StackExchangeRedis
- IDistributedCache
- StackExchange.Redis connection strings
- ASP.NET Core session state
- C#
- JSON configuration

## Sources Consulted
- Microsoft Learn: Distributed caching in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed
- Microsoft Learn: Session and state management in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/app-state
- Microsoft Learn: Azure CLI `az redis` reference - https://learn.microsoft.com/en-us/cli/azure/redis
- Microsoft Learn: What's New in Azure Cache for Redis - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-whats-new
- Microsoft Learn: Best practices for connection resilience - Azure Cache for Redis - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-best-practices-connection
- Microsoft Learn: TLS configuration settings - Azure Cache for Redis - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-tls-configuration
- Microsoft Learn: Monitor Azure Cache for Redis - https://learn.microsoft.com/en-us/azure/redis/monitor-cache
- Microsoft Learn: Manage an Azure Managed Redis cache using the Azure CLI - https://learn.microsoft.com/en-us/azure/redis/scripts/create-manage-cache

## Issues Found
- Azure Cache for Redis resource creation guidance did not mention the published retirement timeline. Added a short caveat that Microsoft recommends Azure Managed Redis for new deployments and that the `az redis` commands apply to Basic, Standard, and Premium Azure Cache for Redis tiers where creation is still available.
- The session storage snippet registered session services but did not show the required `app.UseSession()` middleware call. Added `app.UseSession()` before endpoint mapping guidance so the example matches ASP.NET Core session requirements.
- The session storage explanation said Redis lets users stay logged in across instances. That can be true only if an application stores login-related state in session; ASP.NET Core authentication commonly uses cookies independently of session. Updated the wording to say Redis keeps session state available across instances.

## Review Notes
- The Azure CLI commands and required `--sku` and `--vm-size` values match the official `az redis create` reference for Azure Cache for Redis Basic, Standard, and Premium tiers.
- The Redis connection string uses TLS port `6380`, `ssl=True`, and `abortConnect=False`, which align with Azure Cache for Redis TLS and StackExchange.Redis resilience guidance.
- The `AddStackExchangeRedisCache` registration, `IDistributedCache` usage, expiration options, and remove operations align with ASP.NET Core distributed caching documentation.
- Local execution of `az` and `dotnet` commands was not possible in this environment because neither CLI is installed, so command validation was performed against official documentation.
