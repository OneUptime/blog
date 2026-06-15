# Validation Summary: How to Build a Reverse Proxy with YARP in .NET

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- .NET
- ASP.NET Core
- YARP (Yet Another Reverse Proxy)
- Reverse proxy routing and clusters
- Load balancing
- Request and response transforms
- Active and passive destination health checks
- Authentication and authorization
- ASP.NET Core rate limiting
- Dynamic YARP configuration
- OpenTelemetry

## Sources Consulted
- Microsoft Learn: YARP configuration files - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/config-files
- Microsoft Learn: YARP load balancing - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/load-balancing
- Microsoft Learn: YARP request and response transforms - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/transforms
- Microsoft Learn: YARP request transforms - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/transforms-request
- Microsoft Learn: YARP transform extensibility - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/extensibility-transforms
- Microsoft Learn: YARP destination health checks - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/dests-health-checks
- Microsoft Learn: YARP configuration providers - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/config-providers
- Microsoft Learn: YARP authentication and authorization - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp/authn-authz
- Microsoft Learn: ASP.NET Core rate limiting middleware - https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit
- GitHub source: YARP ReverseProxyServiceCollectionExtensions - https://github.com/microsoft/reverse-proxy/blob/main/src/ReverseProxy/Management/ReverseProxyServiceCollectionExtensions.cs

## Issues Found
- The built-in transform example used unsupported placeholder values (`{Host}` and `{Random}`) in static `RequestHeader` transforms. Replaced them with a valid static request header transform.
- The custom transform provider was registered with a bare `AddSingleton<ITransformProvider, ...>` example instead of the documented `AddTransforms<TProvider>()` registration flow. Updated the snippet to register the provider through `AddReverseProxy().AddTransforms<TenantTransformProvider>()`.
- The custom transform provider used `async` lambdas without awaits and returned `null` from a non-nullable method. Updated the lambdas to return `default` and changed the helper return type to `string?`.
- The health checks section described YARP as integrating with ASP.NET Core health checks. YARP destination health checks are YARP active/passive health checks, so the wording was corrected.
- The destination health-check config set both `Path: "/health"` and destination `Health: "https://server1:8080/health"`, which would cause YARP to append the path to the health URI. Removed the redundant destination `Health` override.
- The custom active health check policy directly assigned `result.Destination.Health.Active`. YARP documents `IDestinationHealthUpdater.SetActive` as the correct way to update active health state and rebuild available destinations. Updated the sample to inject `IDestinationHealthUpdater` and call `SetActive`.
- The authentication example defined an authorization policy but did not apply it through ASP.NET Core authorization. Replaced the custom identity check with `app.MapReverseProxy().RequireAuthorization("ApiAccess")`.
- The dynamic configuration example attempted to signal reloads by calling `oldConfig.ChangeToken.OnChange(...)`, which is not how YARP consumes change tokens. Replaced it with a simple `IProxyConfig` implementation backed by `CancellationChangeToken` and a `SignalChange()` method.

## Review Notes
The post remains a high-level tutorial and omits namespace/package setup for some advanced snippets. That is acceptable for the article style, but readers implementing the snippets will still need the appropriate `using` directives and NuGet packages for JWT bearer authentication, OpenTelemetry exporters, and ASP.NET Core rate limiting.
