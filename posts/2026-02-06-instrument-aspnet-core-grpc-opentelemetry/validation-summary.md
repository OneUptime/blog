# Validation Summary: How to Instrument ASP.NET Core gRPC Services with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry .NET
- ASP.NET Core gRPC
- Grpc.Net.Client
- Protocol Buffers
- .NET tracing with ActivitySource
- .NET metrics with System.Diagnostics.Metrics
- C#

## Sources Consulted
- Microsoft Learn: gRPC services with ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/grpc/aspnetcore
- Microsoft Learn: gRPC services with C# - https://learn.microsoft.com/en-us/aspnet/core/grpc/basics
- Microsoft Learn: Call gRPC services with the .NET client - https://learn.microsoft.com/en-us/aspnet/core/grpc/client
- Microsoft Learn: System.Diagnostics.Metrics namespace - https://learn.microsoft.com/dotnet/api/system.diagnostics.metrics
- OpenTelemetry .NET: ASP.NET Core instrumentation README - https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.AspNetCore/README.md
- OpenTelemetry .NET: Grpc.Net.Client instrumentation README - https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.GrpcNetClient/README.md
- OpenTelemetry .NET: custom tracing and ActivitySource docs - https://github.com/open-telemetry/opentelemetry-dotnet/blob/main/docs/trace/customizing-the-sdk/README.md
- OpenTelemetry semantic conventions for gRPC - https://opentelemetry.io/docs/specs/semconv/rpc/grpc/

## Issues Found
- The gRPC client instrumentation package is currently prerelease. Updated the install command to use `dotnet add package OpenTelemetry.Instrumentation.GrpcNetClient --prerelease`.
- The post incorrectly described `GrpcNetClient` as the instrumentation package. Clarified that `OpenTelemetry.Instrumentation.GrpcNetClient` instruments gRPC clients and `Grpc.Net.Client` provides the client implementation.
- ASP.NET Core gRPC server tracing requires the OpenTelemetry experimental gRPC instrumentation flag. Added `OTEL_DOTNET_EXPERIMENTAL_ASPNETCORE_ENABLE_GRPC_INSTRUMENTATION` configuration to the Program.cs example and softened the surrounding automatic-instrumentation wording.
- The Program.cs snippet referenced `OrderService` without importing the service namespace. Added `using GrpcObservabilityDemo.Services;`.
- The Program.cs snippet attempted to read `grpc-status` from request headers and used the older/nonstandard `grpc.status_code` attribute name. Replaced that request-header logic with a safe gRPC content-type enrichment and updated status-code examples to `rpc.grpc.status_code`.
- The gRPC client instrumentation options included `RecordException`, which is not present in the current `GrpcClientTraceInstrumentationOptions` API. Removed that option from the example.
- The current Grpc.Net.Client instrumentation docs recommend HttpClient instrumentation for proper propagation because Grpc.Net.Client uses HttpClient underneath. Added `OpenTelemetry.Instrumentation.Http` and `.AddHttpClientInstrumentation()`.
- The service sample used an instance `Dictionary<string, Order>` for shared order state, which is unsafe for concurrent RPCs and unreliable as sample state. Changed it to a static `ConcurrentDictionary<string, Order>`.
- The client snippet was in a child namespace and referenced generated gRPC types without importing the generated namespace. Added `using GrpcObservabilityDemo;`.
- The bidirectional streaming sample used an invalid generated C# server signature by returning `Task<BidirectionalStreamResponse>` while also using `IServerStreamWriter<StreamResponse>`. Updated it to return `Task`, matching bidirectional streaming server method shape.

## Review Notes
The workspace does not have the `dotnet` CLI installed, so I could not compile the sample locally. The review was performed against current Microsoft Learn documentation and official OpenTelemetry .NET repository documentation.
