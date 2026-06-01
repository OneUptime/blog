# Validation Summary: How to Orchestrate Long-Running Workflows with Power Automate

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Power Automate cloud flows
- Azure Durable Functions
- Azure Functions Core Tools
- C# Azure Functions in-process worker model
- Durable Functions HTTP management API
- Durable Functions external events, timers, custom status, and retry policies

## Sources Consulted
- Microsoft Learn: Limits and configuration information for Power Automate - https://learn.microsoft.com/en-us/power-automate/limits-and-config
- Microsoft Learn: Durable Functions overview - https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview
- Microsoft Learn: Durable Functions HTTP API - https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-http-api
- Microsoft Learn: Durable Functions orchestrator code constraints - https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-code-constraints
- Microsoft Learn: Durable Functions external events - https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-external-events
- Microsoft Learn: Durable Functions custom orchestration status - https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-custom-orchestration-status
- Microsoft Learn: Azure Functions Core Tools reference - https://learn.microsoft.com/en-us/azure/azure-functions/functions-core-tools-reference
- Microsoft Learn: Durable Functions error handling and retry policies - https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-error-handling

## Issues Found
- The project initialization command used `func init LongRunningWorkflow --dotnet`, which is not the current documented Core Tools form. Changed it to `func init LongRunningWorkflow --worker-runtime dotnet`.
- The HTTP starter snippet omitted required namespaces for `HttpResponseMessage`, `StreamReader`, and `JsonSerializer`. Added `System.Net.Http`, `System.IO`, and `System.Text.Json`.
- The orchestrator snippet used `TimeSpan`-related Durable Functions patterns and `CancellationTokenSource` without the required namespaces. Added `System` and `System.Threading`.
- The activity functions snippet showed method declarations outside a class and omitted common required namespaces. Wrapped the snippet in `WorkflowActivities` and added the needed `using` directives.
- The Power Automate approval flow expected `customStatus` to indicate `WaitingForApproval`, but the orchestrator never set that status. Added `context.SetCustomStatus` before `WaitForExternalEvent`.
- The polling instructions treated `customStatus` as a string while the custom status example used an object. Updated the instructions to check `customStatus.Step`.
- The post did not explicitly say to resume polling after sending the approval external event. Added a sentence to continue polling until a terminal orchestration status.

## Review Notes
- The examples use the C# in-process Azure Functions programming model with `Microsoft.Azure.WebJobs.Extensions.DurableTask`. This model remains relevant to the post, but Microsoft recommends the isolated worker model for new .NET apps and has announced an in-process support end date of November 10, 2026.
- The sample still assumes placeholder domain types such as `WorkflowInput`, `WorkflowResult`, `DataBatch`, and helper methods such as `ProcessRecord`; that is acceptable for a tutorial snippet, but a production-ready sample would need to define them.
