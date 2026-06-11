# Validation Summary: How to Build Custom Channels with System.Threading.Channels

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C#
- .NET
- System.Threading.Channels
- System.Diagnostics.Metrics
- OpenTelemetry .NET
- ASP.NET Core dependency injection and minimal APIs
- Asynchronous producer-consumer patterns

## Sources Consulted
- Microsoft Learn: Channels in .NET - https://learn.microsoft.com/en-us/dotnet/core/extensions/channels
- Microsoft Learn: System.Threading.Channels namespace - https://learn.microsoft.com/en-us/dotnet/api/system.threading.channels
- Microsoft Learn: BoundedChannelFullMode enum - https://learn.microsoft.com/en-us/dotnet/api/system.threading.channels.boundedchannelfullmode
- Microsoft Learn: Creating metrics with System.Diagnostics.Metrics - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation
- Microsoft Learn: System.Diagnostics.Metrics namespace - https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.metrics
- OpenTelemetry .NET exporters documentation - https://opentelemetry.io/docs/languages/dotnet/exporters/
- OpenTelemetry .NET metrics SDK customization documentation - https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/metrics/customizing-the-sdk/README.md

## Issues Found
- The channel creation section described the examples as "three main channel types." .NET exposes bounded and unbounded channels; `DropOldest` is a bounded full-mode behavior, not a separate channel type. Updated the wording to "three common channel configurations."
- The `DropOldest` comment said the channel "drops items" when full. Updated it to specify that `BoundedChannelFullMode.DropOldest` drops the oldest buffered item to make room for the new write.
- The priority channel description said it wrapped the standard channel interfaces, but the sample does not expose `ChannelReader<T>` or `ChannelWriter<T>`. Updated the description to say it exposes channel-like read and write methods.
- The priority channel used delay polling for capacity and could leave writers or readers blocked after completion. Replaced the capacity polling with a `_spaceAvailable` semaphore, released capacity after reads, and made `Complete()` idempotent while waking blocked readers and writers.
- The metrics channel updated queue depth after `WriteAsync` completed, which allowed a fast reader to decrement before the writer incremented. Updated `WriteAsync` and `TryWrite` so depth is incremented before a successful `TryWrite` can expose the item to readers, with rollback on failed writes.
- The Prometheus exporter setup called `AddPrometheusExporter()` but did not register the ASP.NET Core scraping endpoint. Added `app.UseOpenTelemetryPrometheusScrapingEndpoint();` after `builder.Build()`.

## Review Notes
The APIs used in the post are current and non-deprecated based on the consulted .NET and OpenTelemetry documentation. I could not compile the snippets locally because the `dotnet` CLI is not installed in this environment.
