# Validation Summary: How to Instrument Blazor Server Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Blazor Server
- ASP.NET Core SignalR
- OpenTelemetry .NET SDK
- OpenTelemetry ASP.NET Core, HTTP, SqlClient, Runtime, and OTLP instrumentation
- .NET `ActivitySource`, `Activity`, and `Meter`
- C# and Razor components

## Sources Consulted
- Microsoft Learn: ASP.NET Core Blazor SignalR guidance - https://learn.microsoft.com/en-us/aspnet/core/blazor/fundamentals/signalr
- Microsoft Learn: Host and deploy ASP.NET Core server-side Blazor apps - https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/server/
- Microsoft Learn: Use hub filters in ASP.NET Core SignalR - https://learn.microsoft.com/en-us/aspnet/core/signalr/hub-filters
- Microsoft Learn API reference: `CircuitHandler.CreateInboundActivityHandler` - https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.components.server.circuits.circuithandler.createinboundactivityhandler
- OpenTelemetry .NET documentation: Manual instrumentation and SDK setup - https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- NuGet Gallery: `OpenTelemetry.Instrumentation.AspNetCore` - https://www.nuget.org/packages/OpenTelemetry.Instrumentation.AspNetCore
- NuGet Gallery: `OpenTelemetry.Instrumentation.Http` - https://www.nuget.org/packages/OpenTelemetry.Instrumentation.Http
- NuGet Gallery: `OpenTelemetry.Instrumentation.SqlClient` - https://www.nuget.org/packages/OpenTelemetry.Instrumentation.SqlClient
- NuGet Gallery: `OpenTelemetry.Instrumentation.Runtime` - https://www.nuget.org/packages/OpenTelemetry.Instrumentation.Runtime

## Issues Found
- The dependency list used `.AddRuntimeInstrumentation()` but did not install `OpenTelemetry.Instrumentation.Runtime`. Added the missing package command.
- The tracing setup emitted custom activities from `BlazorServerApp.Services` and `BlazorServerApp.SignalR` but only registered the component and circuit activity sources. Added both missing `.AddSource(...)` calls so those spans are exported.
- The custom circuit metrics used a `Meter` named `BlazorServerApp.Circuits` but the OpenTelemetry metrics setup did not subscribe to it. Added `.AddMeter("BlazorServerApp.Circuits")`.
- The SqlClient snippet used `EnableConnectionLevelAttributes`, which is not present in the current `OpenTelemetry.Instrumentation.SqlClient` package. Removed that option and kept current supported options.
- The SignalR hub filter referenced `IHttpTransportFeature` without the required namespace import. Added `using Microsoft.AspNetCore.Http.Features;`.
- The Razor component declared a nested `WeatherForecast` type while the injected service returns the `BlazorServerApp.Data.WeatherForecast` type. Moved the model into the service namespace snippet and imported `BlazorServerApp.Data` and `BlazorServerApp.Services` in the component.

## Review Notes
The current machine does not have the .NET SDK installed, so the examples could not be compiled locally. The review was performed against official Microsoft, OpenTelemetry, and NuGet documentation current as of 2026-06-05.
