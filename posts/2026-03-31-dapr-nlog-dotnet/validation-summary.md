# Validation Summary: How to Use Dapr with NLog in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- NLog (.NET logging framework)
- NLog.Web.AspNetCore (ASP.NET Core integration for NLog)
- ASP.NET Core / .NET minimal hosting
- Dapr .NET SDK (Dapr.AspNetCore)

## Sources Consulted
- NLog official documentation — MappedDiagnosticsContext vs MappedDiagnosticsLogicalContext API differences (https://github.com/NLog/NLog/wiki/Mdc-Layout-Renderer, https://github.com/NLog/NLog/wiki/Mdlc-Layout-Renderer)
- NLog.Web.AspNetCore layout renderers documentation (https://github.com/NLog/NLog.Web/wiki/Layout-Renderers)
- NLog ScopeContext documentation (https://github.com/NLog/NLog/wiki/ScopeContext)
- Dapr .NET SDK documentation for DaprClient, AddDapr(), and MapSubscribeHandler()
- NLog XML configuration schema and target/rule syntax

## Issues Found

### 1. Incorrect use of MappedDiagnosticsContext in async middleware
- **What was wrong:** The middleware code used `NLog.MappedDiagnosticsContext.SetScoped(...)`. `MappedDiagnosticsContext` (MDC) does not have a `SetScoped` method. Additionally, MDC is thread-local (`[ThreadStatic]`) and does not flow across `await` boundaries, making it unsuitable for async middleware.
- **What was changed:** Replaced `NLog.MappedDiagnosticsContext.SetScoped` with `NLog.MappedDiagnosticsLogicalContext.SetScoped`, which is async-safe (uses `AsyncLocal<T>`) and does have the `SetScoped` method returning `IDisposable`. Updated the section heading and code comment from "MDC" to "MDLC" accordingly.
- **Why:** Using a non-existent method would cause a compile error. Even if it existed, MDC values would be lost when async continuations resume on different threads, causing missing context in log entries.

### 2. Multi-line XML attribute in console target layout
- **What was wrong:** The `layout` attribute for the console target was split across two lines in the XML with indentation whitespace. Since XML preserves whitespace in attribute values, the literal newline and leading spaces would appear in every log output line.
- **What was changed:** Consolidated the layout value onto a single line within the attribute.
- **Why:** Prevents unwanted whitespace characters from appearing in log output.

## Review Notes
- In NLog 5.x, `ScopeContext.PushProperty()` is the recommended unified replacement for both MDC and MDLC. The post uses MDLC which works from NLog 4.6+ and remains valid, but authors may wish to mention `ScopeContext` as the modern alternative.
- The MDLC properties (`DaprAppId`, `TraceParent`) are set in the middleware but are not referenced in the nlog.config layout strings. To actually render them in logs, layout renderers like `${mdlc:DaprAppId}` would need to be added to the target layouts. This is not incorrect (the middleware section demonstrates the pattern), but readers may expect the values to appear in output without this additional step.
- The `LoadConfigurationFromAppSettings()` call in Program.cs loads config from `appsettings.json`, but NLog auto-discovers `nlog.config` from the application root, so the setup still works correctly. Using `LoadConfigurationFromFile("nlog.config")` would be more explicit if the intent is solely to load from the XML config file.
