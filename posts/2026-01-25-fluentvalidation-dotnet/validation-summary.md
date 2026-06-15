# Validation Summary: How to Validate Requests with FluentValidation in .NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- C#
- ASP.NET Core MVC controllers and action filters
- FluentValidation
- FluentValidation dependency injection extensions
- xUnit

## Sources Consulted
- FluentValidation ASP.NET Core documentation: https://docs.fluentvalidation.net/en/latest/aspnet.html
- FluentValidation dependency injection documentation: https://docs.fluentvalidation.net/en/latest/di.html
- FluentValidation asynchronous validation documentation: https://docs.fluentvalidation.net/en/latest/async.html
- FluentValidation conditions documentation: https://docs.fluentvalidation.net/en/latest/conditions.html
- FluentValidation collections documentation: https://docs.fluentvalidation.net/en/latest/collections.html
- FluentValidation test extensions documentation: https://docs.fluentvalidation.net/en/latest/testing.html
- FluentValidation built-in validators documentation: https://docs.fluentvalidation.net/en/latest/built-in-validators.html
- NuGet package page for FluentValidation.AspNetCore: https://www.nuget.org/packages/FluentValidation.AspNetCore/

## Issues Found
- The setup instructions installed `FluentValidation.AspNetCore`, which NuGet marks as deprecated and no longer maintained. The current FluentValidation documentation recommends registering validators through `FluentValidation.DependencyInjectionExtensions` for this style of manual/filter-based validation, so the package command was updated.
- The `Program.cs` snippet used `AddValidatorsFromAssemblyContaining<Program>()` without importing the dependency injection extension namespace shown in the official docs. Added `using FluentValidation.DependencyInjectionExtensions;`.
- The `Program.cs` comment said `AddControllers()` added automatic validation. `AddControllers()` only registers controller services; automatic validation requires an explicit validation pipeline/filter approach. The comment was corrected to avoid implying behavior that does not occur.
- The validation filter snippet used `GetService` but omitted the `Microsoft.Extensions.DependencyInjection` namespace needed when implicit usings are not available. Added the missing using.
- The description ended with `ASP`, which was imprecise for an ASP.NET Core tutorial. Updated it to `ASP.NET Core`.

## Review Notes
The custom action-filter approach is technically valid for async validators because it calls `ValidateAsync`. Future updates could mention that FluentValidation's older ASP.NET validation-pipeline integration is not recommended for new projects and does not support asynchronous validators.
