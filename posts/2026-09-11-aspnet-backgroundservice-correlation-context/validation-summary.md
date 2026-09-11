# Validation Summary: Propagate Correlation Context into ASP.NET Core Background Work

## Status
validated

## Post Type
Technical implementation guide with C# examples.

## Technologies Covered
- ASP.NET Core minimal APIs and BackgroundService
- C# records, primary constructors, async/await, and using declarations
- System.Threading.Channels bounded queues
- Microsoft.Extensions.Logging JSON console output and logging scopes
- System.Diagnostics ActivitySource, ActivityContext, and distributed tracing
- OpenTelemetry tracing, propagation, and span links
- Dependency injection scopes and cancellation tokens

## Sources Consulted
- Microsoft: Background tasks with hosted services — https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services?view=aspnetcore-10.0
- Microsoft: Distributed tracing concepts — https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-concepts
- Microsoft: ActivitySource.StartActivity overloads — https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activitysource.startactivity?view=net-10.0
- Microsoft: Channels — https://learn.microsoft.com/en-us/dotnet/core/extensions/channels
- Microsoft: Console log formatting — https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/console-log-formatter
- Microsoft: Minimal API parameter binding — https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/parameter-binding?view=aspnetcore-10.0
- Microsoft: Results.Accepted — https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.results.accepted?view=aspnetcore-10.0
- Microsoft: Use HttpContext in ASP.NET Core — https://learn.microsoft.com/en-us/aspnet/core/fundamentals/use-http-context?view=aspnetcore-10.0
- Microsoft: C# primary constructors — https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/tutorials/primary-constructors
- OpenTelemetry: .NET instrumentation — https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry: Tracing API and span links — https://opentelemetry.io/docs/specs/otel/trace/api/#link

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. Reviewed both code examples and the implementation claims against official documentation. There are no terminal commands or standalone configuration files in the post.
- The complete example assumes a modern ASP.NET Core Web SDK project with implicit usings. The Worker primary constructor requires C# 12 or later, available with .NET 8 and later; it is compatible with the linked .NET 10 documentation. The introductory WorkItem declaration is repeated in the complete example and should not be pasted into that example a second time.
- Confirmed singleton channel registration and implicit service binding in the route handler, bounded-channel backpressure, the optional value argument to Results.Accepted, and JSON console scope inclusion.
- The envelope transfers identifiers rather than request-owned objects. Explicit parent context supports processing after the request activity ends. ActivitySource registration and listener-dependent activity creation are described correctly; exporter and sampling configuration govern actual recording and export.
- Activity and logging scope using declarations are inside the loop body, so disposal occurs per item, including exception paths. Shutdown cancellation is rethrown; other processing exceptions are logged and allow subsequent items to run.
- The example uses the request cancellation token only for enqueueing and the service token for processing. It does not implement a job deadline, retry policy, durable storage, or guaranteed shutdown draining, and the prose correctly leaves those policies to the application.
- The scope-creation advice correctly separates hosted-service lifetime from scoped dependencies. Correlation identifiers do not establish authorization or tenant membership.
- All three official documentation links in the article resolve to the intended resources. No deprecated API usage was identified.
- Validation was based on documentation and static code review. Local SDK inspection found only .NET 6.0.200 and 6.0.201, which cannot compile the sample's C# 12 primary constructor. No compilation, runtime concurrency, failure-injection, backpressure, or shutdown tests were performed.
