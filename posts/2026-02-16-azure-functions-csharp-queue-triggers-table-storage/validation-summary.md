# Validation Summary: How to Create Azure Functions in C# with Queue Triggers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Functions
- C# and .NET isolated worker model
- Azure Storage Queue triggers and output bindings
- Azure Table Storage input and output bindings
- Azure Functions Core Tools
- Azure CLI
- Azurite
- Application Insights for Azure Functions

## Sources Consulted
- Microsoft Learn: Guide for running C# Azure Functions in the isolated worker model - https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide
- Microsoft Learn: Develop Azure Functions locally by using Core Tools - https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local
- Microsoft Learn: Azure Queue storage trigger for Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue-trigger
- Microsoft Learn: Azure Queue storage output binding for Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue-output
- Microsoft Learn: Azure Queue storage trigger and bindings overview - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue
- Microsoft Learn: Azure Tables output bindings for Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-table-output
- Microsoft Learn: Azure Functions HTTP output bindings - https://learn.microsoft.com/en-ie/azure/azure-functions/functions-bindings-http-webhook-output
- Microsoft Learn: Azure CLI az storage message reference - https://learn.microsoft.com/en-us/cli/azure/storage/message
- Microsoft Learn: Azure CLI az storage queue reference - https://learn.microsoft.com/en-us/cli/azure/storage/queue
- Microsoft Learn: Azure CLI az functionapp reference - https://learn.microsoft.com/en-us/cli/azure/functionapp

## Issues Found
- The project creation command used `func init QueueFunctions --dotnet-isolated`, which is not the documented Core Tools syntax. Changed it to `func init QueueFunctions --worker-runtime dotnet-isolated --target-framework net8.0`.
- The package list omitted the Application Insights packages required by the later `AddApplicationInsightsTelemetryWorkerService()` and `ConfigureFunctionsApplicationInsights()` calls. Added `Microsoft.ApplicationInsights.WorkerService` and `Microsoft.Azure.Functions.Worker.ApplicationInsights`.
- The HTTP receiver used `.Result` on `ReadFromJsonAsync()` and did not await `WriteAsJsonAsync()`. Changed the function to `async Task<OrderReceiverOutput>`, awaited JSON body reading, and awaited the response write.
- The HTTP lookup function wrote JSON asynchronously without awaiting it. Changed the function to `async Task<HttpResponseData>` and awaited `WriteAsJsonAsync()`.
- The multi-output HTTP response property used `[HttpResult]`, which is not required for the documented `HttpResponseData` isolated-worker pattern shown in the official storage output binding guide. Removed the attribute.
- The poison message handler snippet omitted required `using` directives for `ITableEntity`, Azure Functions attributes, and `ILogger`. Added the missing imports.
- The local test command tried to put a message into the queue without first creating the queue. Added `az storage queue create`.
- The local development command block implied follow-up commands could run after `func start` in the same terminal, even though `func start` keeps running. Clarified that the queue test commands should be run in another terminal.
- The local test message was raw JSON, but the Azure Functions queue extension defaults to base64 message encoding. Changed the command to base64-encode the JSON before calling `az storage message put`.
- The Azure Function App creation command targeted `dotnet-isolated` but did not specify the .NET runtime version. Added `--runtime-version 8` to align the deployed app with the `net8.0` project.

## Review Notes
The post is technically relevant and current for Azure Functions v4 and .NET 8 isolated worker. I could not run `dotnet`, `func`, or `az` locally because those tools are not installed in this environment, so command and API validation was performed against official Microsoft documentation rather than local execution.
