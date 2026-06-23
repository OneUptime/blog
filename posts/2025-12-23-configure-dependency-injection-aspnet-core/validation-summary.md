# Validation Summary: How to Configure Dependency Injection in ASP.NET Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- C# / .NET
- ASP.NET Core
- Microsoft.Extensions.DependencyInjection (built-in IoC container)
- Entity Framework Core (`AddDbContext`)
- Options pattern (`Microsoft.Extensions.Options`)
- Keyed services (.NET 8+)
- Moq (unit testing)
- xUnit (`[Fact]`)

## Sources Consulted
- Dependency injection in ASP.NET Core — https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection
- Service lifetimes — https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection#service-lifetimes
- Keyed services — https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection#keyed-services
- `ServiceCollectionServiceExtensions` (Add* methods) — https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.servicecollectionserviceextensions
- Options pattern in ASP.NET Core — https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/options
- Scope validation / `ServiceProviderOptions` — https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.serviceprovideroptions
- `IServiceScopeFactory` — https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.iservicescopefactory

## Issues Found
No technical issues found.

The following items were specifically verified and confirmed correct:
- Service lifetime semantics for Transient, Scoped, and Singleton, including the mermaid diagram's depiction of scoped instances being shared within a single HTTP request.
- Registration APIs: `AddTransient`/`AddScoped`/`AddSingleton` with interface-to-implementation, concrete-type, factory (`Func<IServiceProvider, T>`), and instance overloads.
- Keyed services API names and usage: `AddKeyedScoped`, the `[FromKeyedServices("key")]` parameter attribute, and `GetRequiredKeyedService<T>(key)` — all current as of .NET 8+.
- Options pattern: `Configure<TOptions>(IConfigurationSection)` plus `IOptions<TOptions>.Value` injection.
- Captive-dependency rule: injecting a scoped service into a singleton fails when scope validation is enabled, and the `IServiceScopeFactory.CreateScope()` workaround is correct.
- Scope/build validation via `UseDefaultServiceProvider` with `ValidateScopes` and `ValidateOnBuild`.
- Moq + xUnit test example (`Setup`/`ReturnsAsync`/`Verify`/`Times.Once`).

## Review Notes
- Minor (not an error): `WebApplication.CreateBuilder` already enables `ValidateScopes` and `ValidateOnBuild` by default in the Development environment, so the explicit `UseDefaultServiceProvider` block in the "Validate Scopes in Development" section is largely redundant. It is still valid and useful as an explicit, self-documenting configuration, so no change was made.
- Minor (not an error): `System.Net.Mail.SmtpClient` is functional and compiles, though Microsoft's docs note it is not recommended for new development (they suggest libraries like MailKit). The example is illustrative of the Options pattern rather than email best practices, so it was left intact.
- The factory example reads `configuration["Stripe:ApiKey"]`, which returns a nullable string; under nullable reference types this may produce a compiler warning when passed to the constructor, but it is not an error and is acceptable for an illustrative snippet.
- Several types referenced in the examples (e.g., `Order`, `OrderRequest`, `PaymentResult`, `AppSettings`) are intentionally undefined application-specific types, consistent with the post's illustrative intent.
