# Validation Summary: How to Build Custom StateContainer in Blazor

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Blazor components
- ASP.NET Core dependency injection
- C#
- .NET records and init-only properties
- JavaScript interop
- Browser localStorage
- xUnit

## Sources Consulted
- Microsoft Learn: ASP.NET Core Blazor state management overview - https://learn.microsoft.com/en-us/aspnet/core/blazor/state-management/
- Microsoft Learn: ASP.NET Core Blazor dependency injection - https://learn.microsoft.com/en-us/aspnet/core/blazor/fundamentals/dependency-injection
- Microsoft Learn: Dependency injection in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection
- Microsoft Learn: ASP.NET Core Razor component disposal - https://learn.microsoft.com/en-us/aspnet/core/blazor/components/component-disposal
- Microsoft Learn: ASP.NET Core Blazor synchronization context - https://learn.microsoft.com/en-us/aspnet/core/blazor/components/synchronization-context
- Microsoft Learn: Call JavaScript functions from .NET methods in ASP.NET Core Blazor - https://learn.microsoft.com/en-us/aspnet/core/blazor/javascript-interoperability/call-javascript-from-dotnet
- Microsoft Learn: ASP.NET Core Blazor protected browser storage - https://learn.microsoft.com/en-us/aspnet/core/blazor/state-management/protected-browser-storage
- Microsoft Learn: C# records - https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record
- Microsoft Learn: C# with expression - https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/with-expression

## Issues Found
- The introduction said the guide covered middleware, but the post does not include a middleware pattern. Changed this to history tracking to match the actual content.
- The `Program.cs` snippet used `WebApplication.CreateBuilder(args)` while also describing Blazor WebAssembly. That builder is appropriate for server-side ASP.NET Core hosting, not standalone Blazor WebAssembly. Removed the hosting-specific builder line and clarified scoped lifetime behavior for Blazor Server and Blazor WebAssembly.
- The persistent state example defined `LocalStorageService` but did not register `IBrowserStorage` or `PersistentCartState` in dependency injection. Added the required scoped registrations.
- The persistence base class told readers to call initialization from `OnInitializedAsync`, which fails in prerendered server-side components because JavaScript interop and `localStorage` are unavailable during prerendering. Added the caveat to use `OnAfterRenderAsync(firstRender)` when prerendering is enabled.
- The `DocumentEditor` example referenced `DocumentState` without defining it. Added a minimal `DocumentState` record with the properties used by the sample.

## Review Notes
The remaining examples align with Microsoft guidance for custom in-memory state containers, event unsubscription in component disposal, and wrapping externally triggered UI updates with `InvokeAsync(StateHasChanged)`. I could not run a local .NET compile because the `dotnet` CLI is not installed in this environment.
