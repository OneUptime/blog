# Validation Summary: How to Implement Workflow Activities in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (.NET SDK / `Dapr.Workflow` NuGet package)
- C# / .NET 6+
- ASP.NET Core dependency injection
- Moq (unit testing)
- xUnit (unit testing)

## Sources Consulted
- Dapr .NET SDK workflow documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-workflow/
- Dapr workflow activities concept docs: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-features-concepts/#workflow-activities
- Dapr .NET SDK GitHub repository (`Dapr.Workflow` package): https://github.com/dapr/dotnet-sdk
- Durable Task Framework retry semantics (underlying engine for Dapr workflows): https://github.com/Azure/durabletask
- Cross-referenced with other validated Dapr workflow posts in this blog (dapr-retry-workflow, dapr-how-to-handle-workflow-failures-and-retries-in-dapr, dapr-how-to-build-dapr-workflows-with-net-sdk)

## Issues Found

### 1. Incorrect claim about ApplicationException preventing retries
- **What was wrong:** The error handling section contained the comment `// Permanent failure - wrap to prevent retries` above the `throw new ApplicationException(...)` line. The summary also stated "distinguish retryable (throw) from permanent (wrap in non-retryable exception) failures." This is incorrect: Dapr's `WorkflowRetryPolicy` retries ALL thrown exceptions regardless of exception type. There is no built-in exception-type filtering mechanism in the Dapr .NET SDK's retry policy.
- **What was changed:** Updated the comment to `// Permanent failure - wrap with context for clearer error diagnostics` with an additional note that Dapr retries all thrown exceptions regardless of type. Updated the summary paragraph to remove the incorrect claim about non-retryable exception wrapping.
- **Why:** Readers following this pattern would incorrectly believe that wrapping in `ApplicationException` prevents retries, when in fact the activity would still be retried up to `maxNumberOfAttempts` times. The correct approach for truly non-retryable failures is to return an error result from the activity instead of throwing.

## Review Notes
- The `app.MapSubscribeHandler()` call in the registration example is for Dapr pub/sub subscription discovery, not specifically required for workflows. It is not incorrect to include it (many Dapr apps use multiple building blocks), but readers should know it is not a workflow requirement.
- All other API usage is correct: `WorkflowActivity<TInput, TOutput>`, `Workflow<TInput, TOutput>`, `CallActivityAsync`, `WorkflowTaskOptions`, `WorkflowRetryPolicy` constructor parameters, `AddDaprWorkflow` registration, and the unit testing approach with mocked `WorkflowActivityContext`.
- The DI registration patterns (constructor injection into activities, `AddDaprWorkflow` with `RegisterActivity`) are accurate for the current Dapr .NET SDK.
