# Validation Summary: How to Use Dapr with Azure Functions Extension

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Azure Functions (in-process and isolated worker models)
- Azure Functions Python v2 programming model
- Dapr pub/sub building block
- Dapr service invocation building block
- Dapr state management building block
- Kubernetes (Dapr sidecar injection)
- .NET / C#
- Python

## Sources Consulted
- Dapr Extension for Azure Functions overview — https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-dapr
- Dapr Topic trigger binding — https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-dapr-trigger-topic
- Dapr Invoke output binding — https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-dapr-output-invoke
- Dapr State input binding — https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-dapr-input-state
- Dapr State output binding — https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-dapr-output-state
- Dapr Publish output binding — https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-dapr-output-publish
- Azure/azure-functions-dapr-extension GitHub repo — https://github.com/Azure/azure-functions-dapr-extension
- Dapr arguments and annotations overview — https://docs.dapr.io/reference/arguments-annotations-overview/
- NuGet: Microsoft.Azure.WebJobs.Extensions.Dapr — https://www.nuget.org/packages/Microsoft.Azure.WebJobs.Extensions.Dapr
- NuGet: Microsoft.Azure.Functions.Worker.Extensions.Dapr — https://www.nuget.org/packages/Microsoft.Azure.Functions.Worker.Extensions.Dapr
- Azure Functions Python developer guide (v2 model) — https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python
- Dapr Python SDK extensions — https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/

## Issues Found

1. **Non-existent Python package `dapr-ext-func`**: The post listed `dapr-ext-func` in a `requirements.txt` snippet as if it were a pip package needed for Dapr Azure Functions support in Python. This package does not exist on PyPI. The Dapr Python SDK extensions that exist are `dapr-ext-grpc`, `dapr-ext-fastapi`, `dapr-ext-workflow`, and `dapr-ext-flask` — none for Azure Functions. The correct approach for Python Azure Functions is to configure the Dapr extension bundle in `host.json` with `Microsoft.Azure.Functions.ExtensionBundle` version `[4.0.0, 5.0.0)`. Fixed by replacing the `requirements.txt` snippet with the correct `host.json` extension bundle configuration.

2. **Incorrect Python decorator `@app.http_trigger()`**: The `Publish Events from a Function` section used `@app.http_trigger(arg_name="req", route="orders", methods=["POST"])`, but there is no `http_trigger` decorator in the Azure Functions Python v2 programming model. The correct decorator is `@app.route()`. Fixed by replacing `@app.http_trigger(arg_name="req", route="orders", methods=["POST"])` with `@app.route(route="orders", methods=["POST"])`.

## Review Notes
- The NuGet package versions specified (1.0.0) are valid stable releases, though 1.0.1 is the latest available. Since 1.0.0 is still correct and functional, this was not changed.
- The C# `DaprInvoke` output binding example uses `out InvokeMethodParameters` which is an acceptable Azure Functions output binding pattern, though official Microsoft docs tend to show `IAsyncCollector<InvokeMethodParameters>`. Both patterns work; the `out` pattern is simpler for single-invocation scenarios.
- The Kubernetes deployment YAML is a partial snippet (missing `spec.template.spec.containers`) which is appropriate for a focused example showing just the Dapr annotations, but readers should be aware it is not a complete deployment manifest.
- Port 7071 is the correct default for Azure Functions HTTP triggers running locally. When deploying to a container, the default changes to port 80, which is worth noting for production deployments.
