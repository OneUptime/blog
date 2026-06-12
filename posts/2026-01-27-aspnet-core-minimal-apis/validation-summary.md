# Validation Summary: How to Build Minimal APIs in ASP.NET Core 8

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ASP.NET Core 8 Minimal APIs
- C# and .NET 8
- Dependency injection
- Endpoint filters
- Data annotations and FluentValidation
- OpenAPI / Swagger with Swashbuckle
- Entity Framework Core patterns
- ASP.NET Core routing and error handling

## Sources Consulted
- Microsoft Learn: Tutorial - Create a Minimal API with ASP.NET Core: https://learn.microsoft.com/en-us/aspnet/core/tutorials/min-web-api?view=aspnetcore-8.0
- Microsoft Learn: Minimal APIs quick reference: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis?view=aspnetcore-8.0
- Microsoft Learn: Parameter binding in Minimal API apps: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/parameter-binding?view=aspnetcore-8.0
- Microsoft Learn: Filters in Minimal API apps: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/min-api-filters?view=aspnetcore-8.0
- Microsoft Learn: Routing in ASP.NET Core: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/routing?view=aspnetcore-8.0
- Microsoft Learn: Get started with Swashbuckle and ASP.NET Core: https://learn.microsoft.com/en-us/aspnet/core/tutorials/getting-started-with-swashbuckle?view=aspnetcore-8.0
- Microsoft Learn: .NET default templates for dotnet new: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-new-sdk-templates
- Microsoft Learn: Handle errors in ASP.NET Core APIs: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling-api?view=aspnetcore-8.0

## Issues Found
- The post description ended with "using ASP.", which was incomplete. Changed it to "using ASP.NET Core."
- The getting started command used `dotnet new web`, but the following project structure used Swagger/Swashbuckle services that are not part of the empty web template. Changed the command to `dotnet new webapi -n MyMinimalApi`, which creates a Minimal API project by default in the .NET 8 SDK when controllers are not requested.
- The validation section implied that data annotations alone validate Minimal API request models in ASP.NET Core 8. Updated the wording to clarify that data annotations define rules, but Minimal APIs in .NET 8 require endpoint filters, manual validation, or a validation library to enforce them.
- The OpenAPI section described Swagger/OpenAPI support as built-in in a way that could imply Swagger UI and `AddSwaggerGen` are built into ASP.NET Core 8. Updated the wording to clarify that the examples use Swashbuckle.AspNetCore for Swagger/OpenAPI generation and Swagger UI.

## Review Notes
- Local compilation was not possible because the `dotnet` CLI is not installed in the review environment.
- The complete in-memory repository example is appropriate for demo purposes, but a production implementation should use a thread-safe store or a real database-backed repository.
