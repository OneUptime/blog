# Validation Summary: How to Monitor .NET Orleans Grain Calls with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Orleans
- OpenTelemetry for .NET
- ASP.NET Core
- .NET Activity and ActivitySource tracing
- Orleans grains, grain call filters, and streams
- OTLP exporter

## Sources Consulted
- Microsoft Learn: Orleans observability and distributed tracing, https://learn.microsoft.com/en-us/dotnet/orleans/host/monitoring/
- Microsoft Learn: Orleans migration guide OpenTelemetry tracing example, https://learn.microsoft.com/en-us/dotnet/orleans/migration-guide
- Microsoft Learn: Orleans grain call filters, https://learn.microsoft.com/en-us/dotnet/orleans/grains/interceptors
- Microsoft Learn: IIncomingGrainCallContext API, https://learn.microsoft.com/en-us/dotnet/api/orleans.iincominggraincallcontext
- Microsoft Learn: AddActivityPropagation for Orleans silo/client builders, https://learn.microsoft.com/en-us/dotnet/api/orleans.hosting.corehostingextensions.addactivitypropagation and https://learn.microsoft.com/en-us/dotnet/api/orleans.hosting.clientbuilderextensions.addactivitypropagation
- Microsoft Learn: Orleans stream provider GetStream API, https://learn.microsoft.com/en-us/dotnet/api/orleans.streams.istreamprovider.getstream
- Microsoft Learn: Orleans stream provider extension GetStream API, https://learn.microsoft.com/en-us/dotnet/api/orleans.streams.streamproviderextensions.getstream
- Microsoft Learn: Orleans SubscribeAsync stream API, https://learn.microsoft.com/en-us/dotnet/api/orleans.streams.asyncobservableextensions.subscribeasync
- Microsoft Learn: Grain OnDeactivateAsync API, https://learn.microsoft.com/en-us/dotnet/api/orleans.grain.ondeactivateasync
- OpenTelemetry .NET instrumentation guide, https://opentelemetry.io/docs/languages/dotnet/instrumentation/
- OpenTelemetry .NET sampling guide, https://opentelemetry.io/docs/languages/dotnet/sampling/
- NuGet package reference for OpenTelemetry.Exporter.OpenTelemetryProtocol, https://www.nuget.org/packages/OpenTelemetry.Exporter.OpenTelemetryProtocol/

## Issues Found
- The package list used `AddHttpClientInstrumentation()` but did not include the `OpenTelemetry.Instrumentation.Http` package. Added the missing package command.
- The "Monitoring Grain Lifecycle Events" section described a grain call filter as tracking activation/deactivation lifecycle events. Orleans call filters wrap grain method invocations, not activation lifecycle hooks, so the heading and intro sentence were corrected to refer to grain call events.
- The stream sample called `_subscription?.UnsubscribeAsync()` during deactivation without awaiting the returned task. Changed `OnDeactivateAsync` to `async`, awaited `UnsubscribeAsync()`, and then awaited the base deactivation method.

## Review Notes
The main Orleans tracing setup aligns with official Orleans documentation: listen to `Microsoft.Orleans.Runtime` and `Microsoft.Orleans.Application`, configure an OpenTelemetry exporter, and call `AddActivityPropagation()` on silo and client builders. The local environment does not have the .NET SDK installed, so syntax was reviewed against official API documentation rather than by compiling the snippets.
