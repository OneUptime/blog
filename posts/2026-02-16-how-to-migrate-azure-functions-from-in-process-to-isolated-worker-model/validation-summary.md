# Validation Summary: How to Migrate Azure Functions from In-Process to Isolated Worker Model

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Azure Functions
- .NET isolated worker model
- .NET in-process Azure Functions
- C#
- Azure Functions Core Tools
- Azure Functions bindings and triggers
- ASP.NET Core integration for Azure Functions HTTP triggers
- Application Insights
- Newtonsoft.Json and System.Text.Json serialization

## Sources Consulted
- Microsoft Learn: Migrate C# apps from the in-process model to the isolated worker model: https://learn.microsoft.com/en-ca/azure/azure-functions/migrate-dotnet-to-isolated-model
- Microsoft Learn: Guide for running C# Azure Functions in the isolated worker model: https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide
- Microsoft Learn: Compare Azure Functions runtime versions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-versions

## Issues Found
- The in-process .NET 8 project example used `Microsoft.NET.Sdk.Functions` version `4.2.0`. Microsoft documentation requires at least `4.4.0` for .NET 8 in-process apps, so the package version was updated to `4.4.0`.
- The isolated-worker project example omitted the `Microsoft.AspNetCore.App` framework reference used by current Microsoft guidance for .NET 8 isolated worker apps with ASP.NET Core integration, so it was added.
- The isolated-worker project example omitted `Microsoft.Azure.Functions.Worker.ApplicationInsights`, which is needed for `ConfigureFunctionsApplicationInsights()`. The package reference was added.
- The isolated-worker SDK package version was updated from `1.16.4` to `1.17.2` to match the current .NET 8 migration example in Microsoft documentation.
- The logging pitfall said constructor injection with `ILogger<T>` is mandatory. In the isolated model, `FunctionContext.GetLogger` is also supported, so the text was corrected.
- The Newtonsoft.Json snippet used `JsonObjectSerializer` with `Newtonsoft.Json.JsonSerializerSettings`, which is not the correct serializer type. It was changed to use `NewtonsoftJsonObjectSerializer` from the `Microsoft.Azure.Core.NewtonsoftJson` package.
- The deployment section referred to `handler.exe`. Current deployment guidance describes the payload as containing the project executable, generated metadata, `worker.config.json`, and supporting files, so the wording was corrected.

## Review Notes
The article is technically relevant and current after the fixes. The examples use the `HostBuilder` style, which remains supported, although Microsoft documentation now also shows `FunctionsApplication.CreateBuilder` for newer isolated-worker projects.
