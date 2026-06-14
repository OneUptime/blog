# Validation Summary: How to Customize Swagger Documentation in ASP.NET Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ASP.NET Core
- .NET CLI
- Swagger / OpenAPI
- Swashbuckle.AspNetCore
- Microsoft.OpenApi
- C#
- XML documentation comments
- OAuth2, JWT bearer authentication, and API key authentication

## Sources Consulted
- Microsoft Learn: Get started with Swashbuckle and ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/tutorials/getting-started-with-swashbuckle
- Microsoft Learn: dotnet package add command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Swashbuckle.AspNetCore official docs: Configure and customize SwaggerGen - https://github.com/domaindrivendev/Swashbuckle.AspNetCore/blob/master/docs/configure-and-customize-swaggergen.md
- Swashbuckle.AspNetCore official docs: Migrating to v10 - https://github.com/domaindrivendev/Swashbuckle.AspNetCore/blob/master/docs/migrating-to-v10.md
- Swashbuckle.AspNetCore NuGet package page - https://www.nuget.org/packages/Swashbuckle.AspNetCore/
- Microsoft.OpenApi source: OpenApiSchema - https://github.com/microsoft/OpenAPI.NET/blob/main/src/Microsoft.OpenApi/Models/OpenApiSchema.cs
- Microsoft.OpenApi source: OpenApiMediaType - https://github.com/microsoft/OpenAPI.NET/blob/main/src/Microsoft.OpenApi/Models/OpenApiMediaType.cs
- Microsoft.OpenApi source: OpenApiParameter - https://github.com/microsoft/OpenAPI.NET/blob/main/src/Microsoft.OpenApi/Models/OpenApiParameter.cs
- Microsoft.OpenApi source: OpenApiSecurityScheme - https://github.com/microsoft/OpenAPI.NET/blob/main/src/Microsoft.OpenApi/Models/OpenApiSecurityScheme.cs

## Issues Found
- The installation command used the older verb-first `dotnet add package` form. Updated it to the current .NET 10 noun-first `dotnet package add Swashbuckle.AspNetCore` form.
- Security requirement snippets used the pre-Swashbuckle 10 direct `AddSecurityRequirement(new OpenApiSecurityRequirement { ... })` overload and `OpenApiReference` pattern. Updated them to the current v10 delegate-based `AddSecurityRequirement(document => ...)` and `OpenApiSecuritySchemeReference` pattern.
- The custom header operation filter set `OpenApiSchema.Type` to the string `"string"`, which is no longer correct in Microsoft.OpenApi v2. Updated it to `JsonSchemaType.String`.
- Response examples used `OpenApiString`, which is not the current Microsoft.OpenApi v2 representation for examples. Updated examples to use `JsonNode.Parse(...)`.
- Schema filter examples used the old `ISchemaFilter.Apply(OpenApiSchema, ...)` signature. Updated them to the current `IOpenApiSchema` signature and cast to `OpenApiSchema` before mutating concrete schema members.
- The default-value schema filter used a non-standard `ToCamelCase()` helper and the removed `OpenApiAnyFactory.CreateFromJson(...)` API. Updated it to `JsonNamingPolicy.CamelCase.ConvertName(...)` and `JsonSerializer.SerializeToNode(...)`.
- The API versioning inclusion predicate read attributes from endpoint metadata directly. Updated it to use `api.TryGetMethodInfo(...)` and controller reflection, matching Swashbuckle's documented pattern.

## Review Notes
- The post remains focused on Swashbuckle. In .NET 9 and later, ASP.NET Core also includes built-in OpenAPI support, but Swashbuckle remains available as a community package and the article is still technically relevant.
- The snippets omit `using` directives, so readers will still need imports such as `Microsoft.OpenApi`, `System.Text.Json`, `System.Text.Json.Nodes`, and `System.Reflection` depending on which snippets they copy.
