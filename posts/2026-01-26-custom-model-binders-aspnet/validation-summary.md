# Validation Summary: How to Create Custom Model Binders in ASP.NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ASP.NET Core MVC / Web API
- C#
- Custom model binding
- `IModelBinder`
- `IModelBinderProvider`
- `ModelBinderAttribute`
- Entity Framework Core lookup patterns
- `System.Text.Json`

## Sources Consulted
- Microsoft Learn: Custom Model Binding in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/mvc/advanced/custom-model-binding
- Microsoft Learn: Model Binding in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/mvc/models/model-binding
- Microsoft Learn: `ModelBinderAttribute` API - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.modelbinderattribute
- Microsoft Learn: `ModelBinderAttribute` constructor - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.modelbinderattribute.-ctor
- Microsoft Learn: `ModelMetadata` API - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.modelbinding.modelmetadata
- Microsoft Learn: `DefaultModelBindingContext` API - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.modelbinding.defaultmodelbindingcontext

## Issues Found
- The `DateRangeBinderAttribute` example implemented only `IModelNameProvider`, which can supply a model name but does not select `DateRangeModelBinder`. Changed it to inherit from `ModelBinderAttribute` and pass `typeof(DateRangeModelBinder)` to the base constructor, then updated the usage to `[DateRangeBinder]`.
- The encrypted binder provider example checked only `metadata.ContainerType` and `PropertyName`, so it would not detect `[Encrypted]` on action parameters even though the attribute allowed `AttributeTargets.Parameter`. Replaced that pattern with an `EncryptedAttribute` that inherits from `ModelBinderAttribute`, and changed the binder to use `bindingContext.ModelType` for deserialization so one non-generic binder can handle both parameters and properties.

## Review Notes
- The remaining examples align with the official ASP.NET Core model binding guidance: custom binders implement `IModelBinder`, providers implement `IModelBinderProvider`, and `BinderTypeModelBinder` is appropriate when a binder should be activated through dependency injection.
- The local environment does not have the `dotnet` CLI installed, so syntax verification was performed by source inspection against official API documentation rather than by compiling the snippets.
