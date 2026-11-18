# Validation Summary: How to Diagnose Duplicate traceparent Headers Between Nginx and ASP.NET Core

## Status
validated

## Post Type
Technical troubleshooting guide with C#, curl commands, and Nginx configuration.

## Technologies Covered
- W3C Trace Context (`traceparent` and `tracestate`)
- OpenTelemetry and the official Nginx OTel module
- Nginx HTTP reverse proxy configuration
- ASP.NET Core minimal APIs and C#
- .NET `Activity`, `ActivityContext`, and `StringValues`
- curl

## Sources Consulted
- [W3C Trace Context](https://www.w3.org/TR/trace-context/): header grammar, valid identifiers, and parent relationships.
- [Nginx proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header): request-header forwarding defaults and directive inheritance.
- [Nginx OTel module](https://nginx.org/en/docs/ngx_otel_module.html): tracing directives, configuration contexts, and propagation modes.
- [Nginx command-line parameters](https://nginx.org/en/docs/switches.html): `-T` tests and dumps configuration files.
- [curl manual](https://curl.se/docs/manpage.html): `-H`, repeated headers, `-s`, and `-S`.
- [Microsoft ActivityContext.TryParse documentation](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activitycontext.tryparse?view=net-10.0): supported overloads.
- [Microsoft ActivityContext implementation](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Diagnostics.DiagnosticSource/src/System/Diagnostics/ActivityContext.cs): null-input handling and the default `isRemote` value.
- [ASP.NET Core minimal APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis?view=aspnetcore-10.0): application construction, routing, and JSON results.
- [Microsoft StringValues documentation](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.primitives.stringvalues): multiple-value representation, indexing, and conversion.
- [ASP.NET Core hosting diagnostics implementation](https://github.com/dotnet/aspnetcore/blob/main/src/Hosting/Hosting/src/Internal/HostingApplicationDiagnostics.cs): request activity initialization before endpoint execution and conditional activity creation.
- [Microsoft DistributedContextPropagator implementation](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Diagnostics.DiagnosticSource/src/System/Diagnostics/DistributedContextPropagator.cs) and [LegacyPropagator implementation](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Diagnostics.DiagnosticSource/src/System/Diagnostics/LegacyPropagator.cs): extraction contracts and implementation-dependent header handling.
- [Author profile](https://github.com/nawazdhandala): verified the author link redirects to the intended profile.

## Issues Found
1. The final test criteria required exactly one outgoing context without accounting for the no-header test through a pass-through proxy. Clarified that an absent context remains absent in pass-through mode; exactly one valid context is expected when forwarding valid input or creating and propagating a proxy span.
2. The parent-relationship paragraph generalized trace-ID preservation to any tracing Nginx proxy. Qualified this expectation with valid incoming context, enabled server tracing, and Nginx `propagate` mode. `inject` does not promise to preserve the incoming trace ID, and missing or invalid context cannot supply a valid parent to preserve.

## Review Notes
- The C# API usage and Nginx directives are consistent with official documentation; no code changes were needed. The endpoint assumes a standard ASP.NET Core web project with implicit usings enabled.
- `parsed` is a diagnostic parse result, not proof that the server selected that context. The three-argument overload defaults `IsRemote` to false; this does not affect the trace-ID comparison because the parsed context is not installed as a parent.
- `Activity.Current` can be null when activity creation is disabled. The endpoint already uses null-conditional access.
- The sample URLs assume the application listens on port 5000 and Nginx on port 8080. The location snippet deliberately depends on surrounding module-loading, exporter, and server configuration.
- The original .NET 6 API URL could not be fetched through the browsing tool. The equivalent current API documentation and official implementation were checked instead; this does not establish that the original link is broken.
- Nginx is not installed locally, so no Nginx configuration execution or end-to-end proxy test was performed. Duplicate-header behavior must still be checked against the actual deployed framework, module, and propagator versions.
- Attempted to build the unchanged endpoint in an isolated .NET 6 web project using the installed SDK. The build timed out after 60 seconds without compiler output, so compilation and HTTP runtime checks could not be completed. Validation is based on documentation and source review, not a successful local execution.
