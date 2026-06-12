# Validation Summary: How to Build Custom Filters in ASP.NET Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ASP.NET Core MVC filters
- C#
- ASP.NET Core Web API
- Dependency injection
- In-memory caching
- Distributed caching

## Sources Consulted
- Microsoft Learn: Filters in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters
- Microsoft Learn: IAuthorizationFilter.OnAuthorization API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.filters.iauthorizationfilter.onauthorization
- Microsoft Learn: IAuthorizationFilter API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.filters.iauthorizationfilter
- Microsoft Learn: ObjectResult.StatusCode API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.objectresult.statuscode
- Microsoft Learn: IDistributedCache API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.caching.distributed.idistributedcache
- Microsoft Learn: DistributedCacheExtensions.SetStringAsync API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.caching.distributed.distributedcacheextensions.setstringasync

## Issues Found
- The `ApiKeyAuthorizationFilter` implemented `IAuthorizationFilter` but used a method named `Authorize`. The ASP.NET Core interface requires `OnAuthorization(AuthorizationFilterContext)`, so the sample would not compile as written. Changed the method name to `OnAuthorization`.
- The resource filter purpose table said resource filters run before and after "everything else." Microsoft documents that resource filters run after authorization and surround the rest of the MVC filter pipeline. Updated the wording to avoid implying they run before authorization filters.
- The response cache filter checked `objectResult.StatusCode >= 200` and `< 300` directly. `ObjectResult.StatusCode` is nullable, and successful object results can be represented with a default 200 status. Updated the check to use `(objectResult.StatusCode ?? 200)` so default successful responses are cached as described.
- The `TypeFilterAttribute` comment said it creates a new instance each time. Microsoft documents type filters as factory-created and configurable with reuse hints, so the statement was too absolute. Updated the comment to focus on the supported behavior: accepting constructor arguments.

## Review Notes
- The examples are intentionally partial snippets and assume standard ASP.NET Core usings and application-specific types such as `WebhookPayload`, `Product`, `IAuditLogService`, and `AuditEntry`.
- Microsoft documentation recommends policy-based authorization for most custom authorization logic and using exception-handling middleware for broad exception handling. The post's filter examples are still technically valid for action-specific behavior.
- Local compilation was not performed because the `dotnet` CLI is not installed in the review environment.
