# Validation Summary: How to Profile .NET Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET / ASP.NET Core
- OpenTelemetry .NET tracing
- OpenTelemetry Collector
- Grafana Tempo
- Grafana Pyroscope
- Pyroscope .NET profiler
- Pyroscope.OpenTelemetry span profile linking

## Sources Consulted
- Grafana Pyroscope .NET documentation: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/dotnet/
- Grafana Pyroscope span profiles for .NET documentation: https://grafana.com/docs/pyroscope/latest/configure-client/trace-span-profiles/dotnet-span-profiles/
- Grafana Pyroscope .NET source for `PyroscopeSpanProcessor`: https://github.com/grafana/pyroscope-dotnet/blob/main/Pyroscope/Pyroscope.OpenTelemetry/PyroscopeSpanProcessor.cs
- OpenTelemetry .NET ASP.NET Core tracing documentation: https://opentelemetry.io/docs/languages/dotnet/traces/getting-started-aspnetcore/
- OpenTelemetry profiles signal documentation: https://opentelemetry.io/docs/concepts/signals/profiles/
- OpenTelemetry Collector profiling status blog: https://opentelemetry.io/blog/2024/state-profiling/
- Microsoft .NET EventPipe documentation: https://learn.microsoft.com/dotnet/core/diagnostics/eventpipe
- Microsoft .NET runtime events documentation: https://learn.microsoft.com/dotnet/fundamentals/diagnostics/runtime-events
- NuGet package page for OpenTelemetry.Instrumentation.SqlClient: https://www.nuget.org/packages/OpenTelemetry.Instrumentation.SqlClient/

## Issues Found
- The post described an "OpenTelemetry .NET profiling integration" that captures .NET CPU and allocation profiles through EventPipe and exports them as OpenTelemetry profiles. I changed this to describe Pyroscope's .NET profiler and `Pyroscope.OpenTelemetry` separately, because the current Pyroscope .NET profiler is configured as a native CLR profiler and the OpenTelemetry profiles signal remains experimental.
- The package installation snippet omitted packages required by the shown APIs, including `OpenTelemetry.Extensions.Hosting`, ASP.NET Core, HTTP, and SQL Client instrumentation packages, and the `Pyroscope` package. I added the missing packages.
- The C# configuration used non-existent `Pyroscope.Profiler.Instance.Configure` and `Pyroscope.ProfilerConfiguration` APIs. I removed that block and replaced it with the documented environment-variable configuration for the Pyroscope .NET profiler.
- The span-linking explanation said the processor tags profiling sessions with trace ID and span ID for all samples. I corrected this to match `PyroscopeSpanProcessor`, which sets an active profile ID from the root span ID and adds the `pyroscope.profile.id` span tag.
- The post implied allocation and contention profiles are span-linked in the .NET integration. I added the current caveat from Grafana docs that .NET span profiles currently support CPU profiling, while allocation and contention remain useful service-level profiles.
- The Collector configuration incorrectly routed profiles through an `otlphttp/pyroscope` profile pipeline for this .NET setup. I changed the collector snippet to traces only, because the Pyroscope .NET profiler sends profiles directly to Pyroscope using `PYROSCOPE_SERVER_ADDRESS`.
- The contention section described lock contention profiling as unique to .NET and as a direct thread pool starvation diagnostic. I changed this to a narrower and accurate statement about lock-related latency under load.
- The Grafana viewing steps referred to a specific "Profiles" tab. I generalized this to the linked profile view to match current Grafana Explore / Traces Drilldown wording.

## Review Notes
- The OpenTelemetry profiles signal is still marked Development/experimental, so future collector-based profile examples may need another review as the signal and collector support stabilize.
- Grafana's current Pyroscope .NET documentation lists Linux amd64 and .NET 6+ compatibility for the profiler; the post does not include a platform compatibility section.
