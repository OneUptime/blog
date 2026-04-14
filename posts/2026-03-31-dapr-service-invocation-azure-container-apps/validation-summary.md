# Validation Summary: How to Use Dapr Service Invocation on Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation API)
- Azure Container Apps (ACA)
- Azure CLI (`az containerapp`)
- Python / Flask
- Dapr .NET SDK (`Dapr.Client`)

## Sources Consulted
- Azure CLI containerapp reference: https://learn.microsoft.com/en-us/cli/azure/containerapp?view=azure-cli-latest
- Azure CLI containerapp logs reference: https://learn.microsoft.com/en-us/cli/azure/containerapp/logs?view=azure-cli-latest
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr .NET SDK DaprClient source: https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Client/DaprClient.cs
- Dapr .NET SDK client docs: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Azure Container Apps Dapr overview: https://learn.microsoft.com/en-us/azure/container-apps/dapr-overview
- View log streams in Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/log-streaming

## Issues Found
No technical issues found.

## Review Notes
- The Dapr .NET SDK's `InvokeMethodAsync` method used in Step 4 is marked as obsolete in the current SDK. The recommended replacement is `DaprClient.CreateInvokeHttpClient()` or `InvocationHandler`. The code still compiles and works, but future SDK versions may remove it. This is worth updating in a future revision.
- The Flask `app.run(port=8080)` calls bind to `127.0.0.1` by default. This works for Dapr sidecar communication (same network namespace in ACA), but readers adapting the code for non-Dapr HTTP access should use `host='0.0.0.0'`.
- The Flask examples omit the `if __name__ == '__main__':` guard, which is standard for tutorial code but not production practice.
