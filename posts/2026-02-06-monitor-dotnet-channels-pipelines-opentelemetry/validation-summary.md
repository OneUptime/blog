# Validation Summary: How to Monitor .NET Channels and Pipelines with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry .NET
- ASP.NET Core
- System.Diagnostics ActivitySource and Activity
- System.Diagnostics.Metrics Meter instruments
- System.Threading.Channels
- System.IO.Pipelines
- C#
- .NET CLI

## Sources Consulted
- Microsoft Learn: Channels in .NET - https://learn.microsoft.com/en-us/dotnet/core/extensions/channels
- Microsoft Learn: System.Threading.Channels namespace - https://learn.microsoft.com/en-us/dotnet/api/system.threading.channels
- Microsoft Learn: ChannelWriter<T>.TryWrite - https://learn.microsoft.com/en-us/dotnet/api/system.threading.channels.channelwriter-1.trywrite
- Microsoft Learn: System.IO.Pipelines in .NET - https://learn.microsoft.com/en-us/dotnet/standard/io/pipelines
- Microsoft Learn: PipeReader API - https://learn.microsoft.com/en-us/dotnet/api/system.io.pipelines.pipereader
- OpenTelemetry .NET instrumentation docs - https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET exporter docs - https://opentelemetry.io/docs/languages/dotnet/exporters/
- OpenTelemetry .NET exception reporting docs - https://opentelemetry.io/docs/languages/dotnet/traces/reporting-exceptions/
- Microsoft Learn: .NET observability with OpenTelemetry - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel

## Issues Found
- The channel wrapper called `WaitToWriteAsync` and then made one unchecked `TryWrite` call. Official channel guidance notes that `TryWrite` can still fail after waiting when multiple producers race for capacity. Changed the write path to loop until `TryWrite` succeeds or `WaitToWriteAsync` reports the channel is closed.
- The channel read path called `WaitToReadAsync` and then returned failure after a single unsuccessful `TryRead`. With multiple consumers, another consumer can win the race after the wait completes. Changed the read path to loop until an item is read or the channel is completed.
- The ingestion example ignored the `WriteAsync` result and always added a `DataIngested` event, even when the channel was closed. Changed it to tag the write result and add the event only when the item was written.
- The data processing stages did not complete downstream channels when upstream input ended, which could leave later stages waiting indefinitely. Added `finally` blocks to complete the next channel after each producer stage exits.
- The pipeline writer copied a byte array into `Memory<byte>` with `bytes.CopyTo(memory)`, which is not the correct target type for this snippet. Changed it to copy into `memory.Span`.
- The pipeline line parser attempted to decode a `ReadOnlySequence<byte>` directly with `Encoding.UTF8.GetString(lineBuffer)`. Changed it to decode `lineBuffer.ToArray()` so the snippet matches available encoding APIs.
- The network stream pipeline snippet used `SequenceReader<T>`, `ReadOnlySequence<T>`, and `SequencePosition` without importing `System.Buffers`. Added the missing using directive.
- The network stream processor parsed messages but advanced the `PipeReader` with `AdvanceTo(result.Buffer.Start, result.Buffer.End)`, consuming none of the processed data. This would retain and later reprocess parsed lines. Changed it to advance to the parsed position returned by `ProcessBuffer`.
- The introduction described channels as producer-consumer patterns "without locks," which is stronger than the official documentation's abstraction-level description. Changed it to "low-overhead async producer-consumer patterns."

## Review Notes
The .NET SDK is not installed in the review environment (`dotnet: command not found`), so I could not compile the examples locally. The reviewed code now aligns with the documented ChannelWriter/ChannelReader and PipeReader/PipeWriter usage patterns. For .NET Core 3.0 and later, `System.Threading.Channels` is included in the shared framework, and Microsoft documentation notes that `System.IO.Pipelines` is included in the shared framework for newer .NET versions, so the package install commands are valid but may be unnecessary for a current ASP.NET Core project.
