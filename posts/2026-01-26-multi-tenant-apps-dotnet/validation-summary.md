# Validation Summary: How to Build Multi-Tenant Apps in .NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- C#
- ASP.NET Core middleware and dependency injection
- Entity Framework Core
- SQL Server provider for EF Core
- ASP.NET Core distributed caching with Redis
- Multi-tenant SaaS architecture

## Sources Consulted
- Microsoft Learn: EF Core multi-tenancy - https://learn.microsoft.com/en-us/ef/core/miscellaneous/multitenancy
- Microsoft Learn: EF Core global query filters - https://learn.microsoft.com/en-us/ef/core/querying/filters
- Microsoft Learn: Write custom ASP.NET Core middleware - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/write
- Microsoft Learn: Dependency injection in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection
- Microsoft Learn: AddDbContext API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.entityframeworkservicecollectionextensions.adddbcontext
- Microsoft Learn: Distributed caching in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed
- Microsoft Learn: HttpResponse.WriteAsJsonAsync API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.httpresponsejsonextensions.writeasjsonasync

## Issues Found
- The strategy table listed schema-per-tenant without noting the EF Core limitation. Microsoft documentation says schema-per-tenant is not directly supported by EF Core and is not recommended as an EF Core solution, so the table now calls this out.
- The composite tenant resolver accepted `IEnumerable<ITenantResolver>`, which can cause a circular dependency if the composite resolver is registered as the `ITenantResolver` implementation. The sample now injects the concrete subdomain and header resolvers and the registration section registers those concrete services plus `CompositeTenantResolver` as `ITenantResolver`.
- The header resolver described `X-Tenant-Id` as generally useful for APIs. Because client-supplied tenant headers are easy to spoof unless constrained by authentication and authorization, the wording now limits the example to trusted internal APIs.
- The database-per-tenant factory used `Activator.CreateInstance`, which only works for context constructors that accept exactly the supplied options. The sample now uses `ActivatorUtilities.CreateInstance` so normal dependency-injected DbContext constructor dependencies can still be resolved.
- The global query filter loop applied filters to any `ITenantEntity`, including possible derived entity types. EF Core global query filters can only be defined on root entity types, so the sample now checks `entityType.BaseType == null` before applying a filter.

## Review Notes
- The code snippets are illustrative and omit namespace imports and application-specific types such as `ITenantRepository` and `FeatureNotAvailableException`.
- The `dotnet` CLI is not installed in this workspace, so local compilation was not possible. The review relied on current Microsoft documentation and static inspection.
- The shared-database global query filter approach is consistent with EF Core guidance, but production systems should also authorize tenant access at the identity/claims layer rather than relying only on request-derived tenant identifiers.
