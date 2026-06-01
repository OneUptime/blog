# Validation Summary: How to Implement Function Chaining in Azure Durable Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Durable Functions
- Durable Task Framework
- .NET isolated worker model
- C#
- Azure Functions activity and orchestration triggers

## Sources Consulted
- Microsoft Learn: Function chaining in Durable Functions - https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-sequence
- Microsoft Learn: Durable Functions overview - https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview
- Microsoft Learn: Overview of Durable Functions in the .NET isolated worker - https://learn.microsoft.com/en-us/azure/azure-functions/durable-functions/durable-functions-dotnet-isolated-overview
- Microsoft Learn: Durable Functions in-process to isolated worker API mapping - https://learn.microsoft.com/en-us/azure/azure-functions/durable-functions/durable-functions-isolated-api-mapping
- Microsoft Learn: Handle errors and retries in Durable Functions - https://learn.microsoft.com/en-us/azure/durable-task/common/durable-task-error-handling
- Microsoft Learn: Durable orchestrator code constraints - https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-code-constraints
- Microsoft Learn: Bindings for Durable Functions - https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-bindings
- Microsoft Learn API reference: Microsoft.DurableTask.TaskOptions - https://learn.microsoft.com/en-us/dotnet/api/microsoft.durabletask.taskoptions
- Microsoft Learn API reference: Microsoft.DurableTask.TaskRetryOptions - https://learn.microsoft.com/en-us/dotnet/api/microsoft.durabletask.taskretryoptions

## Issues Found
- The orchestrator snippets used unqualified `nameof(ValidateOrder)`, `nameof(CheckInventory)`, `nameof(ProcessPayment)`, `nameof(FulfillOrder)`, and `nameof(SendConfirmation)` calls even though the activities are shown in a separate `OrderActivities` class. Updated these to `nameof(OrderActivities.ValidateOrder)` and equivalent names so the snippets compile as shown while still resolving to the correct function names.
- The post implied activity retries were automatic in general. Durable Functions supports automatic retries when a retry policy is supplied. Updated the wording to say "automatic retry policies" and "configured retry policies."

## Review Notes
- The post uses the current .NET isolated worker APIs: `[Function]`, `[OrchestrationTrigger]`, `TaskOrchestrationContext`, `[ActivityTrigger]`, `FunctionContext`, `TaskOptions`, `TaskRetryOptions`, and `RetryPolicy`.
- The determinism guidance is correct: orchestrators should avoid nondeterministic time, random value generation, and direct I/O. The examples keep those operations inside activity functions.
