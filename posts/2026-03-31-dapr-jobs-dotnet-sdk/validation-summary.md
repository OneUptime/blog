# Validation Summary: How to Use Dapr Jobs with .NET SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (v1.14+ Jobs API)
- .NET / C#
- Dapr.Jobs NuGet package
- DaprJobsClient
- ASP.NET Core (WebApplication / minimal APIs)

## Sources Consulted
- Dapr Jobs .NET SDK documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-jobs/
- Dapr Jobs .NET SDK how-to guide: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-jobs/dotnet-jobs-howto/
- DaprJobsClient usage reference: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-jobs/dotnet-jobsclient-usage/
- Dapr Jobs API reference: https://docs.dapr.io/reference/api/jobs_api/
- NuGet Dapr.Jobs package: https://www.nuget.org/packages/Dapr.Jobs
- Dapr .NET SDK GitHub repository (PR #1384 for Jobs client): https://github.com/dapr/dotnet-sdk/pull/1384
- Dapr v1.14 release announcement: https://blog.dapr.io/posts/2024/08/14/dapr-v1.14-is-now-available/

## Issues Found

1. **Wrong NuGet package (Critical):** Post used `Dapr.Client` but the correct package for Jobs is `Dapr.Jobs`. Fixed the `dotnet add package` command and `using` directive.

2. **Wrong client class (Critical):** Post used `DaprClient` throughout. The correct client class for the Jobs API is `DaprJobsClient` from the `Dapr.Jobs` namespace. Fixed all occurrences.

3. **Wrong method names (Critical):** Post used `ScheduleJobAlpha1Async`, `GetJobAlpha1Async`, and `DeleteJobAlpha1Async`. The actual SDK method names are `ScheduleJobAsync`, `GetJobAsync`, and `DeleteJobAsync` (no Alpha1 suffix — the alpha designation is only in the HTTP API path, not the .NET SDK surface). Fixed all method calls.

4. **Wrong request class structure (Critical):** Post used a fabricated `Dapr.Client.ScheduleJobRequest` class with properties `DueTime`, `Data`, `Schedule`, and `Repeats`. The actual API uses individual parameters on `ScheduleJobAsync`: a `DaprJobSchedule` object for the schedule, `ReadOnlyMemory<byte>?` for payload, `int?` for repeats, etc. Rewrote all scheduling calls to use the correct parameter-based API with `DaprJobSchedule.FromDateTime()` and `DaprJobSchedule.FromExpression()`.

5. **Wrong payload/data handling (Critical):** Post used `Google.Protobuf.WellKnownTypes.Any.Pack(new StringValue { ... })` for payload serialization. The actual SDK uses `ReadOnlyMemory<byte>` payloads, typically created via `JsonSerializer.SerializeToUtf8Bytes()`. Removed the Protobuf dependency and fixed all payload serialization.

6. **Wrong response type (Critical):** Post used `Dapr.Client.GetJobResponse`. The actual return type from `GetJobAsync` is `DaprJobDetails` (a sealed record with properties `Schedule`, `DueTime`, `RepeatCount`, `Ttl`, `Payload`, etc.). Fixed the return type.

7. **Wrong callback handler implementation (Moderate):** Post used a manual `app.MapPost("/job/{jobName}", ...)` with raw `HttpContext` handling. While the `/job/{jobName}` path concept is correct, the .NET SDK provides a dedicated `MapDaprScheduledJobHandler` extension method that handles routing and deserialization. Rewrote the callback handler to use the SDK's built-in method with the correct `(string jobName, ReadOnlyMemory<byte> payload)` delegate signature.

8. **Missing DI registration (Moderate):** Post did not show how to register the Jobs client. Added `builder.Services.AddDaprJobsClient()` in the callback example.

9. **DateTime vs DateTimeOffset (Minor):** Post used `DateTime` for scheduling times. The SDK uses `DateTimeOffset` for `startingFrom` and in `DaprJobSchedule.FromDateTime()`. Changed `DateTime` parameters to `DateTimeOffset`.

## Review Notes
- The Dapr Jobs HTTP API path still uses the `v1.0-alpha1` prefix, indicating the API is still in alpha status. The .NET SDK abstracts this away, but users should be aware the underlying API may change.
- The dedicated `Dapr.Jobs` NuGet package first became available around SDK version 1.15+. Before that, .NET developers needed to use the Jobs HTTP API directly. The post's claim of "v1.14+" is correct for the runtime feature but the .NET SDK support came later.
- The post's overall structure and conceptual explanations (jobs surviving restarts, one-time vs recurring, callback mechanism) are accurate. The issues were entirely in the API surface details.
