# Validation Summary: How to Configure Swagger in ASP.NET Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- C# / .NET (incl. .NET 9)
- ASP.NET Core (controllers and Minimal APIs)
- Swashbuckle.AspNetCore (Swagger tooling)
- Swagger / OpenAPI
- Microsoft.AspNetCore.OpenApi (built-in OpenAPI support)
- JWT Bearer, API Key, and OAuth2 authentication schemes

## Sources Consulted
- Get started with Swashbuckle and ASP.NET Core — Microsoft Learn: https://learn.microsoft.com/en-us/aspnet/core/tutorials/getting-started-with-swashbuckle
- ASP.NET Core web API documentation with Swagger / OpenAPI — Microsoft Learn: https://learn.microsoft.com/en-us/aspnet/core/tutorials/web-api-help-pages-using-swagger
- Swashbuckle.AspNetCore — configure-and-customize-swaggerui docs: https://github.com/domaindrivendev/Swashbuckle.AspNetCore/blob/master/docs/configure-and-customize-swaggerui.md
- Swashbuckle.AspNetCore — MapSwaggerUI endpoint routing (Issue #1726, added in v10.2.0): https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/1726
- Swashbuckle.AspNetCore releases: https://github.com/domaindrivendev/Swashbuckle.AspNetCore/releases

## Issues Found
1. **Non-compiling Swagger authorization snippet (Production Considerations).** The post originally showed:
   ```csharp
   app.UseSwagger();
   app.UseSwaggerUI().RequireAuthorization("SwaggerAccess");
   ```
   This does not compile. `UseSwaggerUI()` (and `UseSwagger()`) are middleware that return `IApplicationBuilder`, which has no `RequireAuthorization` extension. `RequireAuthorization` is an endpoint convention that requires an `IEndpointConventionBuilder`.
   **Fix:** Replaced with the endpoint-routing equivalents `MapSwagger()` and `MapSwaggerUI()`, which return `IEndpointConventionBuilder` and therefore support `RequireAuthorization`. Also protected the underlying `swagger.json` endpoint (`MapSwagger`), not just the UI, and added a brief explanatory comment. Verified against the Swashbuckle docs and issue #1726 (MapSwaggerUI added in v10.2.0).

## Review Notes
- The `.NET 9` note about Swashbuckle no longer being in the default Web API template and the introduction of `Microsoft.AspNetCore.OpenApi` (`AddOpenApi()` / `MapOpenApi()`) is accurate.
- All remaining code is correct: `AddSwaggerGen`/`OpenApiInfo`/`OpenApiContact`/`OpenApiLicense`, XML comments setup (`GenerateDocumentationFile`, `IncludeXmlComments`), security definitions (`AddSecurityDefinition`/`AddSecurityRequirement`), OAuth2 flows, multiple `SwaggerDoc` versioning, `SwaggerUIOptions` customizations (`DefaultModelsExpandDepth`, `DocExpansion`, `EnableDeepLinking`, `DisplayRequestDuration`, `InjectStylesheet`, `InjectJavascript`, `OAuthUsePkce`, etc.), operation/schema filters (`IOperationFilter`/`ISchemaFilter`), and the Minimal API `WithOpenApi` example.
- The JWT example uses `Type = SecuritySchemeType.ApiKey` with `Scheme = "Bearer"`. This is a valid and widely-used pattern. An equally common alternative is `Type = SecuritySchemeType.Http`, `Scheme = "bearer"`, `BearerFormat = "JWT"`. Either works; left as-is.
- `OpenApiSchema.Type` is set with string values (e.g. `"string"`), which is correct for the Microsoft.OpenApi 1.x version that current Swashbuckle depends on. Note that Microsoft.OpenApi 2.0 changes `Type` to a `JsonSchemaType` enum; if/when Swashbuckle migrates, these snippets may need updating.
- `AddEndpointsApiExplorer()` is still valid and commonly shown, though it is increasingly redundant in recent ASP.NET Core versions.
