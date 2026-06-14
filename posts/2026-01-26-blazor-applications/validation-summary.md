# Validation Summary: How to Build Blazor Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Blazor
- C#
- .NET
- ASP.NET Core
- WebAssembly
- SignalR
- Razor components
- JavaScript interop
- Docker

## Sources Consulted
- Microsoft Learn: ASP.NET Core Blazor hosting models - https://learn.microsoft.com/en-us/aspnet/core/blazor/hosting-models
- Microsoft Learn: ASP.NET Core Blazor tooling - https://learn.microsoft.com/en-us/aspnet/core/blazor/tooling
- Microsoft Learn: ASP.NET Core Blazor project structure - https://learn.microsoft.com/en-us/aspnet/core/blazor/project-structure
- Microsoft Learn: What's new in ASP.NET Core in .NET 8 - https://learn.microsoft.com/en-us/aspnet/core/release-notes/aspnetcore-8.0
- Microsoft Learn: ASP.NET Core Blazor dependency injection - https://learn.microsoft.com/en-us/aspnet/core/blazor/fundamentals/dependency-injection
- Microsoft Learn: ASP.NET Core Blazor forms overview - https://learn.microsoft.com/en-us/aspnet/core/blazor/forms/
- Microsoft Learn: ASP.NET Core Blazor forms validation - https://learn.microsoft.com/en-us/aspnet/core/blazor/forms/validation
- Microsoft Learn: ASP.NET Core Blazor data binding - https://learn.microsoft.com/en-us/aspnet/core/blazor/components/data-binding
- Microsoft Learn: ASP.NET Core Razor component lifecycle - https://learn.microsoft.com/en-us/aspnet/core/blazor/components/lifecycle
- Microsoft Learn: ASP.NET Core Blazor JavaScript interoperability - https://learn.microsoft.com/en-us/aspnet/core/blazor/javascript-interoperability/
- Microsoft Learn: Secure an ASP.NET Core Blazor WebAssembly standalone app - https://learn.microsoft.com/en-us/aspnet/core/blazor/security/webassembly/standalone-with-authentication-library
- Microsoft Learn: Handle errors in ASP.NET Core Blazor apps - https://learn.microsoft.com/en-us/aspnet/core/blazor/fundamentals/handle-errors
- Microsoft Learn: ASP.NET Core Razor component virtualization - https://learn.microsoft.com/en-us/aspnet/core/blazor/components/virtualization
- Microsoft Learn: Default ASP.NET Core port changed from 80 to 8080 - https://learn.microsoft.com/en-us/dotnet/core/compatibility/containers/8.0/aspnet-port

## Issues Found
- The post described Blazor as having only two hosting models and used the removed `dotnet new blazorserver` template. Updated the explanation and setup commands to use the modern Blazor Web App template (`dotnet new blazor`) and standalone WebAssembly template (`dotnet new blazorwasm`), matching .NET 8+ guidance.
- The project structure diagram showed older top-level `Pages/` and `Shared/` folders. Updated it to the current Blazor Web App structure with `Components/Pages` and `Components/Layout`, and aligned page example file comments with that layout.
- The `EditForm` example omitted a form name. Added `FormName="registration"` to align with current Blazor form guidance and avoid form-posting errors in static server-side rendering scenarios.
- The dependency injection section said scoped services are one instance per user circuit while showing a WebAssembly host builder. Clarified that scoped services are per circuit in Blazor Server and behave like singletons in Blazor WebAssembly.
- The custom authentication state provider decoded JWT payloads as standard Base64 but JWTs use base64url encoding. Added `-`/`_` normalization before padding and added missing `System.Net.Http.Headers` and `System.Text.Json` imports used by the snippet.
- The custom error boundary was named `ErrorBoundary.razor` while inheriting `ErrorBoundary`, which can conflict with the framework type. Renamed the example to `CustomErrorBoundary.razor`, used the fully qualified base class, and updated usage.
- The .NET 8 Dockerfile exposed port 80 and mapped host port 8080 to container port 80. Updated the example to expose and map port 8080, which is the default ASP.NET Core port in .NET 8 container images.

## Review Notes
The examples remain illustrative and omit some app-specific model and service types such as `Product`, `CartItem`, `WeatherForecast`, and custom services. The local environment did not have the `dotnet` CLI installed, so CLI/template validation was performed against official Microsoft documentation rather than local `dotnet new` help output.
