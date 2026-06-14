# Validation Summary: How to Implement Logging with Serilog in .NET

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- C#
- .NET
- ASP.NET Core
- Microsoft.Extensions.Logging
- Serilog
- Serilog.AspNetCore
- Serilog.Settings.Configuration
- Serilog sinks: Console, File, Seq, Elasticsearch, Application Insights
- Serilog enrichers and LogContext

## Sources Consulted
- Serilog official site: https://serilog.net/
- Serilog.AspNetCore README: https://github.com/serilog/serilog-aspnetcore
- Serilog.Settings.Configuration README: https://github.com/serilog/serilog-settings-configuration
- Serilog structured data documentation: https://github.com/serilog/serilog/wiki/structured-data
- Serilog enrichment documentation: https://github.com/serilog/serilog/wiki/Enrichment
- Serilog.Enrichers.Environment README: https://github.com/serilog/serilog-enrichers-environment
- Serilog.Enrichers.Thread README: https://github.com/serilog/serilog-enrichers-thread
- Serilog.Enrichers.Process README: https://github.com/serilog/serilog-enrichers-process
- Serilog.Sinks.File README: https://github.com/serilog/serilog-sinks-file
- Datalust Seq Serilog documentation: https://datalust.co/docs/using-serilog
- Microsoft Learn, compile-time logging source generation: https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/source-generation
- Microsoft Learn, .NET CLI package add command: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Elastic ECS logging .NET Serilog sink guidance: https://www.elastic.co/guide/en/ecs-logging/dotnet/master/serilog-data-shipper.html

## Issues Found
- The post used `WithMachineName()`, `WithEnvironmentName()`, `WithThreadId()`, and `WithProcessId()` without installing the corresponding enricher packages. Added `Serilog.Enrichers.Environment`, `Serilog.Enrichers.Thread`, and `Serilog.Enrichers.Process` to the package installation commands.
- The `appsettings.json` sample used `WithMachineName` and `WithThreadId` but only listed console and file sink assemblies in `Using`. Added the environment and thread enricher assemblies so configuration binding can locate those extension methods reliably.
- The section titled "Built-in Enrichers" implied all shown enrichers were built into Serilog. Renamed it to "Common Enrichers" because these APIs are provided by separate NuGet packages except for `FromLogContext`.
- Removed `.Enrich.WithCorrelationId()` from the common enricher code sample because it is not provided by Serilog core or the packages installed in the article.
- The custom enricher sample registered `TenantEnricher` as scoped and resolved it during root logger configuration, which can fail scope validation in ASP.NET Core. Changed the registration to `AddSingleton<ILogEventEnricher, TenantEnricher>()` and used `.ReadFrom.Services(services)`, matching the Serilog.AspNetCore service integration pattern.

## Review Notes
- I could not compile the code locally because the `dotnet` CLI is not installed in this environment.
- The Elasticsearch example uses `Serilog.Sinks.Elasticsearch` with an ESv7 template version. This remains valid for Elasticsearch 7-compatible deployments, but Elastic's current documentation recommends `Elastic.Serilog.Sinks` for newer Elasticsearch data-stream-oriented setups.
