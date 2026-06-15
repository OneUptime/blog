# Validation Summary: How to Build a Load Balancer with YARP in .NET

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- .NET
- C#
- ASP.NET Core
- YARP / Yarp.ReverseProxy
- Reverse proxy load balancing
- YARP health checks
- YARP session affinity
- YARP transforms
- prometheus-net metrics

## Sources Consulted
- Microsoft Learn: Get started with YARP - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/getting-started
- Microsoft Learn: YARP load balancing - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/load-balancing
- Microsoft Learn: YARP destination health checks - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/dests-health-checks
- Microsoft Learn: YARP session affinity - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/session-affinity
- Microsoft Learn: YARP configuration providers - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/config-providers
- Microsoft Learn: YARP request and response transforms - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/extensibility-transforms
- Microsoft Learn: YARP request transforms - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/transforms-request
- Microsoft Learn: YARP middleware - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/middleware
- Microsoft Learn API reference: TransformBuilderContext - https://learn.microsoft.com/en-us/dotnet/api/yarp.reverseproxy.transforms.builder.transformbuildercontext
- Microsoft Learn API reference: ResponseTransformContext - https://learn.microsoft.com/en-us/dotnet/api/yarp.reverseproxy.transforms.responsetransformcontext
- Microsoft Learn API reference: IProxyConfigProvider - https://learn.microsoft.com/en-us/dotnet/api/yarp.reverseproxy.configuration.iproxyconfigprovider
- dotnet/yarp source: InMemoryConfigProvider - https://github.com/dotnet/yarp/blob/main/src/ReverseProxy/Configuration/InMemoryConfigProvider.cs
- Microsoft Learn: dotnet package add command - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add

## Issues Found
- The custom load balancing registration chained `.AddConfigFilter<CustomConfigFilter>()`, but no such filter was defined or needed for registering an `ILoadBalancingPolicy`. Removed the undefined filter from the snippet.
- The active health check example configured destination `Health` URLs that already included `/health` while also setting active health check `Path` to `/health`. YARP appends the active path to the destination health endpoint, so this would probe a duplicated path. Removed the per-destination `Health` URLs and let YARP use `Address` plus `Path`.
- The custom active health check policy assigned `destination.Health.Active` directly. YARP custom active health policies should report states through `IDestinationHealthUpdater.SetActive`. Updated the example to inject `IDestinationHealthUpdater`, build `NewActiveDestinationHealth` values, and call `SetActive`.
- The custom health check policy snippet did not show DI registration. Added `builder.Services.AddSingleton<IActiveHealthCheckPolicy, CustomHealthCheckPolicy>();`.
- The session affinity policy list omitted `ArrCookie`, which is a built-in YARP session affinity policy. Added it to the list.
- The code-based configuration example used an `InMemoryConfig` type and `SignalChange()` pattern that mirrors YARP internals rather than the public API. Reworked the snippet to use public `LoadFromMemory(routes, clusters)` and update via `InMemoryConfigProvider.Update(...)`.
- The code-based active health check config omitted the required active health check `Policy`. Added `Policy = "ConsecutiveFailures"`.
- The transform snippet used `AddOriginalHostHeader()`, which is not the current YARP extension method. Replaced it with `AddOriginalHost(true)`.
- The transform snippet used `AddRequestHeader` with `Guid.NewGuid().ToString()`, which would create one static value when transforms are built rather than a per-request ID. Replaced it with a per-request `AddRequestTransform`.
- The response transform referenced `transformContext.DestinationPrefix`, which does not exist on `ResponseTransformContext`. Replaced it with a valid static response header example.
- The complete example used `context.GetProxyFeature()`, but the documented YARP middleware API is `context.GetReverseProxyFeature()`. Updated the snippet.
- The summary table said `LeastRequests` is for servers with different capacities, but YARP's policy chooses the destination with the least assigned requests and does not encode capacity weighting. Changed the use case to uneven request durations.

## Review Notes
- The examples are illustrative snippets and omit full `using` directives and package references for Prometheus metrics. Those omissions are acceptable for a blog tutorial, but a future revision could include a complete compilable sample project.
- The `dotnet add package` command remains broadly familiar and valid for .NET 9 SDK and earlier; Microsoft Learn now documents the noun-first `dotnet package add` form for .NET 10 SDK and later.
