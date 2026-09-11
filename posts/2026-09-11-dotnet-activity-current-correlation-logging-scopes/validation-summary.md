# Validation Summary: Use Activity.Current and Logging Scopes for .NET Correlation

## Status

validated

## Post Type

Technical guide with an ASP.NET Core minimal application and a scoped logging example.

## Technologies Covered

- C# 12 primary constructors, async/await, and disposable scopes
- .NET and ASP.NET Core minimal APIs, middleware, and dependency injection
- Microsoft.Extensions.Logging, JSON console logging, and activity tracking
- System.Diagnostics.Activity and ActivitySource
- ExecutionContext, cancellation, and background service lifetimes
- Distributed tracing and application correlation IDs

## Sources Consulted

- [.NET distributed tracing concepts](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-concepts)
- [Logging in C# and .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/overview)
- [Console log formatting](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/console-log-formatter)
- [LoggerFactoryOptions.ActivityTrackingOptions](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.loggerfactoryoptions.activitytrackingoptions)
- [.NET 10 LoggerFactoryScopeProvider implementation](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/Microsoft.Extensions.Logging/src/LoggerFactoryScopeProvider.cs)
- [.NET 10 JsonConsoleFormatter implementation](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/Microsoft.Extensions.Logging.Console/src/JsonConsoleFormatter.cs)
- [Distributed tracing instrumentation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-instrumentation-walkthroughs)
- [C# primary constructors](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/tutorials/primary-constructors)
- [C# using statement and declaration](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/using)
- [Minimal API parameter binding](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/parameter-binding?view=aspnetcore-10.0)
- [Writing ASP.NET Core middleware](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/write?view=aspnetcore-10.0)
- [dotnet new](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-new)
- [dotnet run](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-run)
- [ExecutionContext.SuppressFlow](https://learn.microsoft.com/en-us/dotnet/api/system.threading.executioncontext.suppressflow?view=net-10.0)
- [ASP.NET Core hosted services](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services?view=aspnetcore-10.0)
- [ASP.NET Core best practices](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices?view=aspnetcore-10.0)
- [.NET metrics instrumentation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation)

## Issues Found

- The run instructions omitted the project setup and language requirement. Added an ASP.NET Core project prerequisite using .NET 8 or later, implicit usings, and C# 12, plus instructions to create the web project and replace Program.cs. This makes the existing code and dotnet run instruction reproducible without changing the example.
- The trace/span ID explanation was unqualified. Specified the default W3C ID format because the legacy hierarchical format does not provide the same TraceId/SpanId semantics.
- The statement about logs for each request could imply that every framework request log receives the custom scope. Restricted the expectation to InventoryService logs and clarified that framework logs outside the middleware scope do not receive it.

## Review Notes

- Reviewed both C# examples against current documentation and the .NET 10 logging source. No deprecated APIs or additional code defects were identified. The second snippet is intended inside an async method with logger and token in scope.
- Confirmed route and service binding, request cancellation-token binding, the middleware overload accepting next(context), JSON console scope configuration, and the activity tracking flags.
- The built-in scope provider uses AsyncLocal and reads Activity.Current during scope enumeration. The JSON formatter writes scopes as an array and preserves dictionary properties inside scope objects. This supports the async isolation and current-span guidance.
- The using declaration provides cleanup on normal return and exception propagation. Provider behavior remains relevant to the caution about returning tasks from prematurely disposed scopes; captured execution contexts can retain ambient values.
- ActivitySource can return null without interested listeners. Application correlation remains available through its logging scope independently of trace export. Activity tags are telemetry attributes and are not automatically serialized into queue messages.
- Background work must establish appropriate dependency scopes and propagate selected context explicitly. Keeping unique IDs out of metric dimensions avoids unbounded cardinality.
- The article's documentation links resolve to relevant Microsoft resources; the author link resolves to the matching GitHub profile. The logging overview documents scopes; the separate ActivityTrackingOptions reference and runtime implementation establish the activity-enrichment behavior.
- Validation was a documentation and source review. The installed SDK is .NET 6.0.201, which cannot compile the unchanged C# 12 example. No application build, concurrent request test, exception/cancellation test, or child-activity runtime test was performed; these are not claimed as passing.
