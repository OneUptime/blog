# Validation Summary: How to Set Up API Versioning in ASP.NET Core

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- .NET / C#
- ASP.NET Core (MVC controllers and Minimal APIs)
- Asp.Versioning library (`Asp.Versioning.Mvc`, `Asp.Versioning.Mvc.ApiExplorer`)
- API versioning strategies (URL path, query string, header, combined)
- Swashbuckle / Swagger (OpenAPI) integration

## Sources Consulted
- dotnet/aspnet-api-versioning GitHub repository and wiki — https://github.com/dotnet/aspnet-api-versioning
- API Versioning Options wiki — https://github.com/dotnet/aspnet-api-versioning/wiki/API-Versioning-Options
- API Documentation wiki (Swagger integration) — https://github.com/dotnet/aspnet-api-versioning/wiki/API-Documentation
- Milan Jovanović, "API Versioning in ASP.NET Core" — https://www.milanjovanovic.tech/blog/api-versioning-in-aspnetcore
- Code Maze, "API Versioning in ASP.NET Core" — https://code-maze.com/aspnetcore-api-versioning/

## Issues Found
No technical issues found.

The post correctly uses the modern `Asp.Versioning.*` package family rather than the deprecated `Microsoft.AspNetCore.Mvc.Versioning` packages. Verified items:

- NuGet package names `Asp.Versioning.Mvc` and `Asp.Versioning.Mvc.ApiExplorer` are current and correct.
- The fluent registration chain `AddApiVersioning(...).AddMvc().AddApiExplorer(...)` matches the current API.
- `ApiVersion`, `MapToApiVersion`, `[ApiVersion(... Deprecated = true)]`, and the `api-deprecated-versions` response header behavior are accurate.
- Version readers `UrlSegmentApiVersionReader`, `QueryStringApiVersionReader`, `HeaderApiVersionReader`, and `ApiVersionReader.Combine(...)` are correct.
- Swagger integration via `IApiVersionDescriptionProvider` (namespace `Asp.Versioning.ApiExplorer`), `ApiVersionDescriptions`, `GroupNameFormat = "'v'VVV"`, and the `app.DescribeApiVersions()` extension are valid.
- Minimal API versioning via `app.NewApiVersionSet()`, `HasApiVersion`, `WithApiVersionSet`, and `MapToApiVersion` is correct.
- `ApiVersionUnspecifiedException` exists in the `Asp.Versioning` namespace and is usable from an exception filter.

## Review Notes
- Minor logical nuance (not an error): in the "Version Negotiation Error Handling" example the options set `AssumeDefaultVersionWhenUnspecified = true`, which causes the library to substitute the default version when none is supplied. As a result the `ApiVersionUnspecifiedException` branch in the filter would not actually trigger under that configuration — it becomes reachable only when `AssumeDefaultVersionWhenUnspecified` is left `false`. The code itself is valid; the example is illustrative.
- Minimal API support (`NewApiVersionSet`, `WithApiVersionSet`) comes from `Asp.Versioning.Http`, which is referenced transitively by `Asp.Versioning.Mvc`, so the listed package install is sufficient. Readers building a Minimal-API-only project could install `Asp.Versioning.Http` directly.
- The library has continued to evolve (e.g., Asp.Versioning 10.x adds tighter integration with the built-in OpenAPI document generation in .NET 10). The Swashbuckle-based Swagger approach shown here remains valid for projects using Swashbuckle.
