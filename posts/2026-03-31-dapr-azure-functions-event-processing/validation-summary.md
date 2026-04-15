# Validation Summary: How to Use Dapr with Azure Functions for Event Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Azure Functions (in-process model)
- Dapr Extension for Azure Functions (`Microsoft.Azure.WebJobs.Extensions.Dapr`)
- Azure Container Apps
- C# / .NET
- Dapr Pub/Sub, State Management, and Service Invocation bindings

## Sources Consulted
- Dapr Azure Functions Extension GitHub repository (Azure/azure-functions-dapr-extension) - README, samples, and source code
- Microsoft Learn: Azure Functions Dapr extension documentation (https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-dapr)
- Microsoft Learn: Azure Container Apps CLI reference for `az containerapp create`
- Dapr official documentation for local development with `dapr run`
- NuGet package listings for `Microsoft.Azure.WebJobs.Extensions.Dapr`

## Issues Found

1. **Fabricated type `DaprTopicMessage<T>`**: The blog used `DaprTopicMessage<Order>` as the parameter type for `DaprTopicTrigger`, but this type does not exist in the Dapr Azure Functions extension. The correct type for the in-process model is `CloudEvent` from the `CloudNative.CloudEvents` namespace. Changed the parameter to `CloudEvent cloudEvent` and updated the function body to deserialize the order data from `cloudEvent.Data`. Added `using CloudNative.CloudEvents;` and `using Newtonsoft.Json;` imports.

2. **FUNCTIONS_WORKER_RUNTIME mismatch**: The `local.settings.json` specified `"dotnet-isolated"` but all code examples use the in-process model attributes (`[FunctionName]`, `[DaprState]`, `[DaprInvoke]`, `[DaprPublish]` from `Microsoft.Azure.WebJobs.Extensions.Dapr`). The isolated worker model uses different attribute names (e.g., `DaprStateOutput`, `DaprInvokeOutput`, `DaprPublishOutput`) and a different package (`Microsoft.Azure.Functions.Worker.Extensions.Dapr`). Changed to `"dotnet"` to match the in-process code.

3. **Incorrect Azure CLI flag `--dapr-enabled`**: The `az containerapp create` command used `--dapr-enabled`, but the correct flag is `--enable-dapr`. Changed to the correct flag name.

4. **Non-standard installation command**: The blog used `func extensions install --package Microsoft.Azure.WebJobs.Extensions.Dapr --version 1.x`, which is not the standard installation method for .NET projects. Changed to `dotnet add package Microsoft.Azure.WebJobs.Extensions.Dapr --prerelease`, which is the documented approach for the Dapr extension.

5. **DaprState output binding type**: Changed `out Order processedOrder` to `out string processedOrder` with explicit JSON serialization, as the state store output binding works with serialized string data. The function body was updated to use `JsonConvert.SerializeObject(order)`.

## Review Notes
- The entire Dapr Extension for Azure Functions has been deprecated by Microsoft. The GitHub repository (Azure/azure-functions-dapr-extension) has a prominent deprecation notice stating it is no longer actively maintained. Readers should be aware that this extension may not receive future updates or security patches.
- The Azure Functions in-process model (`"dotnet"` runtime) is itself being deprecated by Microsoft in favor of the isolated worker model. A future revision of this post could migrate all examples to the isolated worker model with the `Microsoft.Azure.Functions.Worker.Extensions.Dapr` package.
- The `Order` class defined in the first example lacks a `Total` property that is referenced in the `InvoiceGenerator` example. This is acceptable for a blog post showing separate examples but could confuse readers trying to use them together.
- The `Invoice` class used in the `InvoiceGenerator` example is not defined anywhere in the post. Again, acceptable for a tutorial but worth noting.
- The `{data.orderId}` binding expression in the `DaprState` key relies on Azure Functions binding expressions resolving from the CloudEvent data payload. This works but may require additional configuration depending on the runtime version.
