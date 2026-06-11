# Validation Summary: How to Build Custom Authorization Handlers in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C#
- ASP.NET Core
- ASP.NET Core authorization policies
- Custom authorization requirements and handlers
- Resource-based authorization with `IAuthorizationService`
- Dependency injection
- `IMemoryCache`
- xUnit

## Sources Consulted
- Microsoft Learn: Policy-based authorization in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/security/authorization/policies
- Microsoft Learn: Resource-based authorization in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resource-based
- Microsoft Learn: Custom Authorization Policy Providers - https://learn.microsoft.com/en-us/aspnet/core/security/authorization/iauthorizationpolicyprovider
- Microsoft Learn API reference: `AuthorizationHandlerContext` - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.authorization.authorizationhandlercontext
- Microsoft Learn API reference: `IAuthorizationService.AuthorizeAsync` - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.authorization.iauthorizationservice.authorizeasync
- Microsoft Learn API reference: `MemoryCacheExtensions.Set` - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.caching.memory.cacheextensions.set

## Issues Found
- The post described `context.Fail()` as immediately stopping authorization handler execution. In ASP.NET Core, `Fail()` makes the final authorization result fail and cannot be overridden by another handler, but other handlers are still invoked by default. Updated the handler behavior table, the blocked-user example comment, and the summary bullet to distinguish final authorization failure from handler invocation short-circuiting.
- Added the correct `AuthorizationOptions.InvokeHandlersAfterFailure = false` configuration snippet for the case where the app should stop invoking additional handlers after `Fail()`.

## Review Notes
The code examples use current ASP.NET Core authorization APIs and align with Microsoft guidance for custom requirements, multiple handlers, AND semantics for multiple policy requirements, and imperative resource-based authorization. The dynamic permission section registers permission policies from a known list at startup; applications that need unbounded policy names at runtime should consider a custom `IAuthorizationPolicyProvider`.
