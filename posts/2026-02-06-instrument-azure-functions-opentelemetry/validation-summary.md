# Validation Summary: How to Instrument Azure Functions with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Functions
- OpenTelemetry
- Python Azure Functions v2 programming model
- Node.js Azure Functions v4 programming model
- .NET isolated Azure Functions
- OTLP exporters
- Azure CLI application settings

## Sources Consulted
- Microsoft Learn: Python developer reference for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python
- Microsoft Learn: Node.js developer reference and v4 programming model for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
- Microsoft Learn: Migrate to v4 of the Node.js model for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-node-upgrade-v4
- Microsoft Learn: Use OpenTelemetry with Azure Functions: https://learn.microsoft.com/en-sg/azure/azure-functions/opentelemetry-howto
- Microsoft Learn: Guide for running C# Azure Functions in an isolated worker process: https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python requests instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/requests/requests.html
- OpenTelemetry Python urllib3 instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/urllib3/urllib3.html
- OpenTelemetry JavaScript resources docs: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript API reference for resources: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry .NET exporter docs: https://opentelemetry.io/docs/languages/dotnet/exporters/

## Issues Found
- The Python example installed `opentelemetry-instrumentation-requests` and `opentelemetry-instrumentation-urllib3` but did not activate those instrumentations. Added `RequestsInstrumentor().instrument()` and `URLLib3Instrumentor().instrument()` in the shared telemetry setup.
- The Python exception handler used `trace.StatusCode.ERROR` directly with `span.set_status(...)`. Updated it to import `Status` and `StatusCode` and call `span.set_status(Status(StatusCode.ERROR, str(e)))`, matching the OpenTelemetry Python API examples.
- The Node.js example used `new Resource(...)` from `@opentelemetry/resources`, which is not the current documented way to create resources. Updated it to use `resourceFromAttributes(...)`.
- The Node.js dependencies omitted direct dependencies used by the sample code. Added `@azure/functions` and `@opentelemetry/api` to the install command.
- The Node.js setup file was described as a preload file but the sample did not show how functions would be registered after telemetry initialization. Changed the setup file to `src/index.js`, required the function module after SDK startup, and added a `package.json` `main` snippet pointing to that entry point.
- The .NET example used generic `AddAspNetCoreInstrumentation()` for incoming function triggers. Microsoft documentation recommends the Functions worker OpenTelemetry package and `UseFunctionsWorkerDefaults()` for .NET isolated Azure Functions. Updated the package list and `Program.cs` sample to use `Microsoft.Azure.Functions.Worker.OpenTelemetry`, `Microsoft.Azure.Functions.Worker.Extensions.Http.AspNetCore`, `UseFunctionsWorkerDefaults()`, and `UseOtlpExporter()`.

## Review Notes
- The post is technically relevant and the corrected examples now align with current official Azure Functions and OpenTelemetry guidance.
- Azure Functions host-level OpenTelemetry export can also be enabled with `"telemetryMode": "OpenTelemetry"` in `host.json`; the post focuses mainly on application-code instrumentation and OTLP exporter settings.
