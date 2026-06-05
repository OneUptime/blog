# Validation Summary: How to Instrument Hangfire Background Jobs with OpenTelemetry in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- ASP.NET Core
- Hangfire
- Hangfire.SqlServer
- OpenTelemetry .NET
- OpenTelemetry tracing and metrics
- OTLP exporter

## Sources Consulted
- Hangfire documentation: Using Job Filters - https://docs.hangfire.io/en/latest/extensibility/using-job-filters.html
- Hangfire documentation: Calling Methods in Background - https://docs.hangfire.io/en/latest/background-methods/calling-methods-in-background.html
- Hangfire documentation: Performing Recurrent Tasks - https://docs.hangfire.io/en/latest/background-methods/performing-recurrent-tasks.html
- Hangfire documentation: Passing Arguments - https://docs.hangfire.io/en/latest/background-methods/passing-arguments.html
- Hangfire documentation: Using SQL Server - https://docs.hangfire.io/en/latest/configuration/using-sql-server.html
- Hangfire documentation: Configuring Job Queues - https://docs.hangfire.io/en/latest/background-processing/configuring-queues.html
- Hangfire API/source reference: AutomaticRetryAttribute - https://raw.githubusercontent.com/HangfireIO/Hangfire/master/src/Hangfire.Core/AutomaticRetryAttribute.cs
- Hangfire API/source reference: Job - https://raw.githubusercontent.com/HangfireIO/Hangfire/master/src/Hangfire.Core/Common/Job.cs
- Hangfire API/source reference: PerformContext - https://raw.githubusercontent.com/HangfireIO/Hangfire/master/src/Hangfire.Core/Server/PerformContext.cs
- OpenTelemetry .NET documentation: Instrumentation - https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET documentation: Reporting exceptions - https://opentelemetry.io/docs/languages/dotnet/traces/reporting-exceptions/
- NuGet package documentation: OpenTelemetry.Instrumentation.Http - https://www.nuget.org/packages/OpenTelemetry.Instrumentation.Http
- NuGet package documentation: OpenTelemetry.Instrumentation.SqlClient - https://www.nuget.org/packages/OpenTelemetry.Instrumentation.SqlClient
- Microsoft Learn: Adding distributed tracing instrumentation - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs
- Microsoft Learn: Creating metrics - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation

## Issues Found
- The package list omitted `OpenTelemetry.Instrumentation.Http` and `OpenTelemetry.Instrumentation.SqlClient`, but the configuration uses `AddHttpClientInstrumentation()` and `AddSqlClientInstrumentation()`. Added both package install commands.
- The job filter snippet used `RecordException()` without importing the OpenTelemetry trace extension namespace. Added `using OpenTelemetry.Trace;` to snippets that call `RecordException()`.
- The enqueue span tagged `context.InitialState.Name` as `job.queue`, which records state names like `Enqueued` or `Scheduled`, not the Hangfire queue. Changed it to use `EnqueuedState.Queue` or the job/default queue.
- The retry instrumentation manually incremented Hangfire's `RetryCount` in `OnStateApplied`, which conflicts with Hangfire's `AutomaticRetryAttribute` handling. Changed it to read Hangfire's existing retry count when a retry `ScheduledState` is applied.
- The setup snippet enqueued jobs via `IOrderProcessingJobs` but did not register the interface implementation in ASP.NET Core dependency injection. Added `builder.Services.AddScoped<IOrderProcessingJobs, OrderProcessingJobs>();`.
- The recurring job used `DateTime.UtcNow.AddMonths(-1)` directly in the recurring job expression, which would serialize the evaluated value at registration time. Added `GeneratePreviousMonthReportAsync()` so the previous month is computed when the job runs.

## Review Notes
The post is technically valid after the corrections. The examples still assume the reader will provide concrete implementations for repository, email, report, database connection, and OTLP collector configuration.
