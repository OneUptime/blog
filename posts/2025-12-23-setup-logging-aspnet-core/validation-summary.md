# Validation Summary: How to Set Up Logging in ASP.NET Core

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- C#
- ASP.NET Core logging
- Microsoft.Extensions.Logging
- Console logging configuration
- LoggerMessage source-generated logging
- Serilog.AspNetCore
- Serilog sinks and enrichers

## Sources Consulted
- Microsoft Learn: Logging in .NET and ASP.NET Core: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/logging/
- Microsoft Learn: Console log formatting: https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/console-log-formatter
- Microsoft Learn: Compile-time logging source generation: https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/source-generation
- Microsoft Learn: High-performance logging in .NET: https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/high-performance-logging
- Serilog.AspNetCore README / NuGet documentation: https://github.com/serilog/serilog-aspnetcore and https://www.nuget.org/packages/Serilog.AspNetCore
- Serilog.Settings.Configuration README: https://github.com/serilog/serilog-settings-configuration
- Serilog.Enrichers.Environment README: https://github.com/serilog/serilog-enrichers-environment
- Serilog.Enrichers.Thread README: https://github.com/serilog/serilog-enrichers-thread
- Serilog.Sinks.Async README: https://github.com/serilog/serilog-sinks-async

## Issues Found
- The Serilog installation commands omitted packages required by later examples. The code uses `.Enrich.WithMachineName()`, `.Enrich.WithThreadId()`, and `.WriteTo.Async(...)`, which require `Serilog.Enrichers.Environment`, `Serilog.Enrichers.Thread`, and `Serilog.Sinks.Async`. Added those package installation commands.
- The Serilog appsettings example used `WithMachineName` and `WithThreadId` but did not list the corresponding enricher assemblies in the `Using` array. Added `Serilog.Enrichers.Environment` and `Serilog.Enrichers.Thread`.
- The Serilog ASP.NET Core setup used `builder.Host.UseSerilog()`, while the current Serilog.AspNetCore documentation shows `builder.Services.AddSerilog()` for `WebApplicationBuilder` applications. Updated the sample to use `builder.Services.AddSerilog()`.
- The high-performance logging section described source-generated logging as "zero-allocation." Microsoft documents it as eliminating boxing and temporary allocations in key paths while reducing allocations overall, so the claim was softened to "low-allocation, high-performance logging."
- The source-generated logging example declared a readonly `ILogger<OrderService>` field but did not initialize it. Added a constructor that accepts and assigns `ILogger<OrderService>`.

## Review Notes
- The local environment does not have the `dotnet` CLI installed, so snippets were not compiled locally. Review was performed against official Microsoft Learn documentation and Serilog package documentation.
- Several code snippets are intentionally illustrative and omit surrounding application types, namespaces, or dependency fields such as repositories and domain models.
