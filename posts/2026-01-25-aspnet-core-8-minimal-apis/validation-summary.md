# Validation Summary: How to Build REST APIs with ASP.NET Core 8 Minimal APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET 8
- C#
- ASP.NET Core 8 Minimal APIs
- Entity Framework Core
- Endpoint filters
- Route groups
- ASP.NET Core authorization
- ASP.NET Core error handling
- Swagger/OpenAPI with Swashbuckle

## Sources Consulted
- Microsoft Learn: Minimal APIs quick reference - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis
- Microsoft Learn: Route handlers in Minimal API apps - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/route-handlers
- Microsoft Learn: Authentication and authorization in Minimal APIs - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/security
- Microsoft Learn: Handle errors in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling
- Microsoft Learn: Handle errors in ASP.NET Core APIs - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling-api
- Microsoft Learn: Get started with Swashbuckle and ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/tutorials/getting-started-with-swashbuckle
- Microsoft Learn: ASP.NET Core support for Native AOT - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/native-aot
- Microsoft Learn: What's new in ASP.NET Core in .NET 8 - https://learn.microsoft.com/en-us/aspnet/core/release-notes/aspnetcore-8.0
- Microsoft Learn: .NET default templates for dotnet new - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-new-sdk-templates
- Microsoft Learn: C# record types reference - https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record
- Microsoft Learn: Validator.TryValidateObject - https://learn.microsoft.com/en-us/dotnet/api/system.componentmodel.dataannotations.validator.tryvalidateobject
- Microsoft Learn: EF Core In-Memory Database Provider - https://learn.microsoft.com/en-us/ef/core/providers/in-memory/
- Microsoft Learn: EF Core tracking vs. no-tracking queries - https://learn.microsoft.com/en-us/ef/core/querying/tracking

## Issues Found
- The setup commands did not install packages used later by the examples. Added `Microsoft.EntityFrameworkCore.InMemory` and `Swashbuckle.AspNetCore` package installation commands.
- The article implied Minimal APIs use no attributes. Revised the wording to clarify that controller classes and MVC inheritance are not required, while attributes remain optional.
- The EF Core in-memory provider was shown without a production caveat. Added a note that it is appropriate for demos/tests and that production APIs should use a real database provider.
- The validation example placed data annotation attributes on positional record parameters. Since the custom filter uses `Validator.TryValidateObject` to validate object properties, changed the attributes to target generated record properties with `property:`.
- The route group example used `RequireAuthorization()` without registering authorization services. Added `builder.Services.AddAuthorization();`.
- The route group snippet referenced `CreateProduct`, `UpdateProduct`, and `DeleteProduct` handlers without defining them. Added matching handler methods so the example is self-consistent.
- The exception handling snippet used `IExceptionHandlerFeature` without showing the required namespace. Added `using Microsoft.AspNetCore.Diagnostics;`.

## Review Notes
The core Minimal API routing, endpoint filter, route group, response helper, Swagger/OpenAPI, Native AOT, and EF Core `AsNoTracking` guidance aligns with official Microsoft documentation. The local environment did not have the `dotnet` CLI installed, so compilation and `dotnet new` behavior were verified from official documentation rather than by running local builds.
