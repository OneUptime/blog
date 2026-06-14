# Validation Summary: How to Master Dependency Injection Scopes in .NET 8

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET 8
- C#
- Microsoft.Extensions.DependencyInjection
- ASP.NET Core dependency injection
- Entity Framework Core DbContext lifetimes
- IHttpClientFactory and typed HTTP clients
- ASP.NET Core hosted/background services
- .NET 8 keyed services

## Sources Consulted
- Microsoft Learn: Service lifetimes in .NET dependency injection - https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/service-lifetimes
- Microsoft Learn: Dependency injection in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection
- Microsoft Learn: Dependency injection guidelines - https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/guidelines
- Microsoft Learn: IHttpClientFactory with .NET - https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory
- Microsoft Learn: Common IHttpClientFactory usage issues - https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory-troubleshooting
- Microsoft Learn: DbContext lifetime, configuration, and initialization - https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/
- Microsoft Learn: Use scoped services within a BackgroundService - https://learn.microsoft.com/en-us/dotnet/core/extensions/scoped-service
- Microsoft Learn: What's new in .NET 8 runtime, keyed DI services - https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8/runtime#keyed-di-services

## Issues Found
- The post described HttpClient as a singleton "via factory" and said typed client wrappers can have any lifetime. Updated this to explain that IHttpClientFactory creates short-lived HttpClient instances while pooling handlers, and that typed clients registered with AddHttpClient are transient by default.
- The captive dependency diagram marked singleton-to-transient and scoped-to-transient dependencies as wrong. Updated the diagram to mark scoped-to-transient as OK and singleton-to-transient as a thread-safety consideration, matching Microsoft guidance that the main validated lifetime violation is singleton services capturing scoped services.
- The summary stated "never inject a shorter-lived service into a longer-lived one." Narrowed this to "never inject scoped services into singletons" because transient dependencies can be valid depending on state, disposal, and thread-safety requirements.
- The singleton and BackgroundService examples used synchronous CreateScope while resolving services that may include EF Core DbContext. Updated the examples to use CreateAsyncScope with await using, matching current Microsoft guidance for scoped services in BackgroundService and async-disposable scoped services.
- The singleton scoped-dependency example said it would fail at runtime with ValidateScopes enabled. Clarified that it can fail during provider validation or service resolution when validation is enabled.

## Review Notes
- The code snippets are illustrative and omit surrounding using directives, model types, interfaces, and package references; this is acceptable for the guide format.
- The AddTransientHttpErrorPolicy example depends on the Polly integration package for IHttpClientFactory. For new .NET 8+ applications, Microsoft also documents newer resilience APIs, but the shown API remains a recognizable factory-based retry pattern when the relevant package is installed.
