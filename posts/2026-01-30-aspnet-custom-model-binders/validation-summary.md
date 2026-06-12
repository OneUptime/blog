# Validation Summary: How to Implement Custom Model Binders in ASP.NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- C#
- ASP.NET Core MVC
- ASP.NET Core model binding
- Custom `IModelBinder` and `IModelBinderProvider` implementations
- `System.Text.Json`
- xUnit and Moq

## Sources Consulted
- Microsoft Learn: Custom Model Binding in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/mvc/advanced/custom-model-binding
- Microsoft Learn: Model Binding in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/mvc/models/model-binding
- Microsoft Learn: Custom formatters in ASP.NET Core Web API - https://learn.microsoft.com/en-us/aspnet/core/web-api/advanced/custom-formatters
- Microsoft Learn API Reference: `ModelBindingContext.ModelType` - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.modelbinding.modelbindingcontext.modeltype
- Microsoft Learn API Reference: `ModelMetadata.IsRequired` - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.modelbinding.modelmetadata.isrequired
- Microsoft Learn API Reference: `ModelMetadata` - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.modelbinding.modelmetadata

## Issues Found
- The `CompactDateAttribute` was declared for both parameters and properties, but `CompactDateModelBinderProvider` only checked `ParameterAttributes`. Updated the provider to check both `ParameterAttributes` and `PropertyAttributes` so property-level usage works as advertised.
- The compact date binder comment and best-practices section said returning early for a missing value lets other binders try. In ASP.NET Core, the provider has already selected the binder once `BindModelAsync` runs; returning without setting `bindingContext.Result` leaves the result unset. Updated the wording to avoid implying provider selection continues.
- The phone number example used `ModelMetadata.IsRequired` while describing a required parameter check. The official API reference states `IsRequired` is only applicable when metadata represents a property. Updated the example to use `IsReferenceOrNullableType` for the stated non-nullable-target behavior.

## Review Notes
The request-body CSV binder is technically possible, but ASP.NET Core's official guidance for adding support for request body formats is usually to implement an input formatter. The post already frames the CSV parser as simplified and recommends a proper CSV library for production use.
