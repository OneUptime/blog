# Validation Summary: How to Fix Model State is Invalid Errors in ASP.NET Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET 6+ / ASP.NET Core
- C#
- Model binding and model state validation
- Data annotation validators (`System.ComponentModel.DataAnnotations`)
- `[ApiController]` automatic 400 behavior and `InvalidModelStateResponseFactory`
- Custom `ValidationAttribute` and `IValidatableObject`
- FluentValidation
- xUnit / `Validator.TryValidateObject` for unit testing validation

## Sources Consulted
- ASP.NET Core model validation docs — https://learn.microsoft.com/en-us/aspnet/core/mvc/models/validation
- Handle errors / `[ApiController]` behavior — https://learn.microsoft.com/en-us/aspnet/core/web-api/
- `ApiBehaviorOptions.InvalidModelStateResponseFactory` — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.apibehavioroptions.invalidmodelstateresponsefactory
- `ValidationAttribute` / `IValidatableObject` / `Validator.TryValidateObject` — https://learn.microsoft.com/en-us/dotnet/api/system.componentmodel.dataannotations
- FluentValidation deprecation of `FluentValidation.AspNetCore` and auto-validation — https://github.com/FluentValidation/FluentValidation/issues/1960
- FluentValidation documentation — https://docs.fluentvalidation.net/

## Issues Found
- **Non-existent property reference (`request.Id`)**: In the "Automatic Validation with `[ApiController]`" section, the action returned `Created($"/api/products/{request.Id}", request)`, but the `ProductRequest` class used in that example is defined earlier with only `Name` and `Description` properties — there is no `Id` member, so the snippet would not compile. Changed `request.Id` to `request.Name`, which is a valid property on the defined model, preserving the intent of the example (returning a `201 Created` with a location URL).

## Review Notes
- The deprecation note for the `FluentValidation.AspNetCore` package and `AddFluentValidationAutoValidation` is accurate. As of FluentValidation 12 the package and its auto-validation pipeline are deprecated/removed, and the recommended path is the core `FluentValidation` package with manual validation (as the post demonstrates). For Minimal APIs, endpoint filters are now the officially suggested integration point — could be mentioned in a future revision but is not an error.
- `.NET 8+` ships a built-in `[AllowedValues]` attribute in `System.ComponentModel.DataAnnotations`. The post defines a custom `AllowedValuesAttribute` in the user's own namespace, which is fine as a teaching example, but readers on .NET 8+ should be aware of a potential name clash if they also import the framework attribute. Not changed since it is correct as written.
- `[Required]` on the non-nullable `DateTime` properties in the `IValidatableObject` example is effectively a no-op (value types are never null); the cross-property checks in `Validate()` are what enforce the real rules. This is a common and harmless pattern, left as-is.
- All other code samples (data annotation usage, ModelState error extraction, custom response factory, custom validators, and the `Validator.TryValidateObject` unit tests) are syntactically correct and use current, non-deprecated APIs.
