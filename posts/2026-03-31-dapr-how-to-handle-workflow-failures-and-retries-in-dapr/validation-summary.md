# Validation Summary: How to Handle Workflow Failures and Retries in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow
- Dapr .NET SDK (`Dapr.Workflow` package)
- Dapr Python SDK (`dapr-ext-workflow` package)
- Dapr CLI
- C# / .NET
- Python

## Sources Consulted
- Dapr Workflow features and concepts documentation: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-features-concepts/
- Dapr Workflow management how-to: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflows/
- Dapr Python SDK Workflow documentation: https://docs.dapr.io/developing-applications/sdks/python/python-workflow/
- Dapr CLI workflow reference: https://docs.dapr.io/reference/cli/dapr-workflow/
- Dapr .NET SDK source code (`WorkflowTaskOptions.cs`, `WorkflowRetryPolicy.cs`, `WorkflowContext.cs`, `WorkflowTaskFailedException.cs`, `WorkflowTaskFailureDetails.cs`)
- Dapr Python SDK source code (`retry_policy.py`, `dapr_workflow_context.py`)

## Issues Found

### 1. Incorrect property name on `WorkflowTaskFailureDetails` (.NET)
- **What was wrong:** The blog used `ex.FailureDetails.Message` in two places in the .NET retry policy example. The actual property on `WorkflowTaskFailureDetails` is `ErrorMessage`, not `Message`.
- **What was changed:** Replaced `ex.FailureDetails.Message` with `ex.FailureDetails.ErrorMessage` in both occurrences (the `SetCustomStatus` call and the error return).
- **Why:** Using the wrong property name would cause a compilation error. The `WorkflowTaskFailureDetails` class exposes `ErrorMessage` for the failure message string.

### 2. Incorrect Python retry policy API (dict instead of RetryPolicy object)
- **What was wrong:** The Python example defined the retry policy as a plain dict with camelCase keys (`'maxNumberOfAttempts'`, `'firstRetryInterval'`, etc.). The Dapr Python SDK requires a `RetryPolicy` object with snake_case parameter names.
- **What was changed:** Replaced the dict with a `RetryPolicy(...)` constructor call using correct snake_case parameters (`first_retry_interval`, `max_number_of_attempts`, `backoff_coefficient`, `max_retry_interval`). Added `RetryPolicy` to the import statement.
- **Why:** Passing a dict would cause a runtime error since `call_activity` expects a `RetryPolicy` instance. The camelCase parameter names would also be invalid Python keyword arguments.

## Review Notes
- The `WorkflowTaskOptions` is instantiated with object-initializer syntax (`new WorkflowTaskOptions { RetryPolicy = ... }`). Since `WorkflowTaskOptions` is a C# record, this works (records support init-only properties), though constructor syntax is more idiomatic. Left as-is since it compiles correctly.
- The `dapr workflow history` CLI command syntax is plausible per the Dapr CLI docs but the exact positional argument format could not be fully confirmed from documentation alone. The command structure follows the same pattern as other `dapr workflow` subcommands.
- The example output for the CLI command is illustrative and may not exactly match real Dapr CLI output formatting, but conveys the correct information.
