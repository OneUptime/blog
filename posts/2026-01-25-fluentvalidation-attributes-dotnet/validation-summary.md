# Validation Summary: How to Create Validation Attributes with FluentValidation in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- C#
- FluentValidation
- ASP.NET Core
- NuGet/.NET CLI
- xUnit

## Sources Consulted
- FluentValidation ASP.NET Core documentation: https://docs.fluentvalidation.net/en/latest/aspnet.html
- FluentValidation dependency injection documentation: https://docs.fluentvalidation.net/en/latest/di.html
- FluentValidation asynchronous validation documentation: https://docs.fluentvalidation.net/en/latest/async.html
- FluentValidation built-in validators documentation: https://docs.fluentvalidation.net/en/latest/built-in-validators.html
- FluentValidation custom validators documentation: https://docs.fluentvalidation.net/en/latest/custom-validators.html
- FluentValidation conditions documentation: https://docs.fluentvalidation.net/en/latest/conditions.html
- FluentValidation collections documentation: https://docs.fluentvalidation.net/en/latest/collections.html
- FluentValidation testing documentation: https://docs.fluentvalidation.net/en/latest/testing.html
- FluentValidation.AspNetCore repository notice: https://github.com/FluentValidation/FluentValidation.AspNetCore
- .NET CLI package add documentation: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add

## Issues Found
- The post recommended installing `FluentValidation.AspNetCore` and calling `AddFluentValidationAutoValidation()`. The official FluentValidation documentation no longer recommends ASP.NET validation-pipeline auto-validation for new projects, and the `FluentValidation.AspNetCore` repository states that the package is unsupported. I changed the setup to install `FluentValidation.DependencyInjectionExtensions`, register validators with `AddValidatorsFromAssemblyContaining`, and rely on manual validation.
- The setup used `dotnet add package` without noting the current .NET 10 CLI form. Microsoft documentation now documents `dotnet package add` as the current form and notes that `dotnet add package` is for .NET 9 SDK or earlier. I updated the commands and added the compatibility note.
- The conditional validation example chained `.When(x => x.IsBulkOrder)` after both quantity validators. FluentValidation applies a trailing condition to all preceding validators in the same chain by default, so the positive-quantity rule would only run for bulk orders. I split the quantity rules so `GreaterThan(0)` always runs and the minimum-10 rule only applies to bulk orders.
- The custom error response example used ASP.NET Core `ModelState` customization, which only fits automatic model validation. After moving the article to the supported manual FluentValidation approach, I changed the example to shape errors from `ValidationResult.Errors`.

## Review Notes
The remaining FluentValidation APIs shown, including `RuleFor`, `MustAsync`, `RuleForEach`, `ChildRules`, `SetValidator`, built-in validators, and `TestValidate`, match current official documentation. The local environment did not have the `dotnet` CLI installed, so CLI verification was performed against Microsoft documentation rather than local `--help` output.
