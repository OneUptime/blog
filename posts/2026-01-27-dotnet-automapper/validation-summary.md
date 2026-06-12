# Validation Summary: How to Use AutoMapper in .NET Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- C#
- AutoMapper
- ASP.NET Core dependency injection
- Entity Framework Core query projection
- NuGet / .NET CLI
- xUnit

## Sources Consulted
- AutoMapper Getting Started Guide: https://docs.automapper.io/en/stable/Getting-started.html
- AutoMapper Dependency Injection documentation: https://docs.automapper.io/en/stable/Dependency-injection.html
- AutoMapper 13.0 Upgrade Guide: https://docs.automapper.io/en/latest/13.0-Upgrade-Guide.html
- AutoMapper 15.0 Upgrade Guide: https://docs.automapper.io/en/latest/15.0-Upgrade-Guide.html
- AutoMapper Configuration Validation documentation: https://docs.automapper.io/en/stable/Configuration-validation.html
- AutoMapper Queryable Extensions documentation: https://docs.automapper.io/en/stable/Queryable-Extensions.html
- AutoMapper Lists and Arrays documentation: https://docs.automapper.io/en/stable/Lists-and-arrays.html
- AutoMapper Flattening documentation: https://docs.automapper.io/en/latest/Flattening.html
- AutoMapper Conditional Mapping documentation: https://docs.automapper.io/en/stable/Conditional-mapping.html
- .NET CLI `dotnet package add` documentation: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- NuGet Gallery page for AutoMapper.Extensions.Microsoft.DependencyInjection: https://www.nuget.org/packages/automapper.extensions.microsoft.dependencyinjection/
- OneUptime website: https://oneuptime.com
- Author GitHub profile: https://github.com/nawazdhandala

## Issues Found
- The install section recommended `AutoMapper.Extensions.Microsoft.DependencyInjection`. This package is discontinued because `AddAutoMapper` is included in AutoMapper starting with version 13. Updated the install instructions to use only the core `AutoMapper` package.
- The install command used only the older `dotnet add package` form. Current .NET CLI documentation prefers `dotnet package add` for .NET 10+, with `dotnet add package` still noted for .NET 9 SDK and earlier.
- The dependency injection snippet used an older `AddAutoMapper` overload. AutoMapper 15 requires the configuration action parameter and a license key. Updated the registration example accordingly.
- The testing and startup compilation snippets used the old `MapperConfiguration` constructor. AutoMapper 15 requires an `ILoggerFactory`; updated examples to pass `NullLoggerFactory.Instance` and set a license key in configuration.
- The benefits list described AutoMapper configuration as compile-time checked. Configuration validation happens through runtime validation, commonly in tests, so the wording was corrected.
- The ignore-property example referenced `SensitiveField`, which was not present on the earlier `UserDto` type and would not compile in that context. Updated the example to ignore an existing `Email` property.
- The `ForAllMembers` comment said it ignored unmapped properties, but the shown condition actually skips null source values. Updated the comment to match the code.
- The `ProjectTo` example omitted the `AutoMapper.QueryableExtensions` namespace and referenced `_context.Users` from a variable typed as base `DbContext`. Added the namespace and changed the query to `_context.Set<User>()`.

## Review Notes
The post is now technically aligned with current AutoMapper documentation. The local environment did not have the `dotnet` CLI installed, so CLI and C# API validation was performed against official documentation rather than local compilation.
