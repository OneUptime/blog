# Validation Summary: How to Create Custom Validation Attributes in .NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET
- C#
- ASP.NET Core MVC and Razor Pages model validation
- System.ComponentModel.DataAnnotations
- ValidationAttribute
- IValidatableObject
- IClientModelValidator
- jQuery Validation and jQuery Unobtrusive Validation

## Sources Consulted
- Microsoft Learn: Model validation in ASP.NET Core MVC and Razor Pages - https://learn.microsoft.com/en-us/aspnet/core/mvc/models/validation
- Microsoft Learn: ValidationAttribute class - https://learn.microsoft.com/en-us/dotnet/api/system.componentmodel.dataannotations.validationattribute
- Microsoft Learn: ValidationAttribute.GetValidationResult method - https://learn.microsoft.com/en-us/dotnet/api/system.componentmodel.dataannotations.validationattribute.getvalidationresult
- Microsoft Learn: IValidatableObject interface - https://learn.microsoft.com/en-us/dotnet/api/system.componentmodel.dataannotations.ivalidatableobject
- Microsoft Learn: IValidatableObject.Validate method - https://learn.microsoft.com/en-us/dotnet/api/system.componentmodel.dataannotations.ivalidatableobject.validate
- Microsoft Learn: ValidationContext.GetService method - https://learn.microsoft.com/en-us/dotnet/api/system.componentmodel.dataannotations.validationcontext.getservice

## Issues Found
- The post described `IValidatableObject` as the approach for async validation. `IValidatableObject.Validate` is synchronous and returns `IEnumerable<ValidationResult>`, so the section was corrected to describe it as model-level synchronous validation and to recommend doing true async database/API checks in a handler/action or another async service.
- The `UniqueUsernameAttribute` comment recommended `IValidatableObject` for async operations. This was corrected to recommend handler/action or async service validation instead.
- The `IClientModelValidator` example used `context.Attributes.Add("data-val", ...)`, which can throw when another validator such as `[Required]` has already added the same key. The example now uses the `MergeAttribute` pattern shown in Microsoft documentation.

## Review Notes
- The examples assume typical SDK-style ASP.NET Core projects with implicit usings enabled. In projects without implicit usings, snippets that reference `IFormFile`, `Path`, LINQ methods, or `IDictionary` need the corresponding `using` directives.
- The local environment did not have the `dotnet` CLI installed, so code snippets were reviewed against official API documentation rather than compiled locally.
