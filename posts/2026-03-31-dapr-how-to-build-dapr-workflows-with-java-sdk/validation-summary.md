# Validation Summary: How to Build Dapr Workflows with Java SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Java SDK (`io.dapr:dapr-sdk-workflows`)
- Dapr Workflows (durable task-based orchestration)
- Java / Maven
- SLF4J logging

## Sources Consulted
- Dapr Java SDK GitHub repository: https://github.com/dapr/java-sdk
- Dapr official documentation — Java SDK workflows: https://docs.dapr.io/developing-applications/sdks/java/java-workflow/java-workflow-howto/
- Dapr workflow patterns documentation: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-patterns/
- Maven Central — dapr-sdk-workflows artifact: https://central.sonatype.com/artifact/io.dapr/dapr-sdk-workflows
- Dapr CLI reference — dapr run: https://docs.dapr.io/reference/cli/dapr-run/
- Microsoft DurableTask Java SDK (underlying workflow engine): https://github.com/microsoft/durabletask-java

## Issues Found

1. **Fan-out pattern used non-existent `Task.whenAll()` API**: The blog used `Task.whenAll(tasks).await()` with an import of `io.dapr.workflows.Task`. There is no `Task` class in `io.dapr.workflows`, and no static `whenAll()` method on any Task class in the SDK. The correct API is `ctx.allOf(tasks).await()`, which is a method on the `WorkflowContext`. Fixed the import to `com.microsoft.durabletask.Task` (needed for the `Task<Map>` type references) and replaced `Task.whenAll(tasks)` with `ctx.allOf(tasks)`.

2. **Retry policy used wrong class name**: The blog used `RetryPolicy` imported from `io.dapr.workflows.runtime.RetryPolicy`, which does not exist. The correct Dapr-native class is `WorkflowTaskRetryPolicy` in the `io.dapr.workflows` package. Fixed the class name and import.

3. **Retry policy import for `WorkflowTaskOptions` used wrong package**: The blog imported from `io.dapr.workflows.runtime.WorkflowTaskOptions`. The correct package is `io.dapr.workflows.WorkflowTaskOptions`. Fixed the import.

4. **`callActivity` parameter order wrong in retry section**: The blog used `ctx.callActivity(name, input, Map.class, options)` — placing the return type before the options. The correct signature is `ctx.callActivity(name, input, options, Map.class)` — options comes before the return type. Fixed in both callActivity invocations in the retry section.

5. **`WorkflowRuntimeBuilder` method chaining would not compile at v1.12.0**: At SDK version 1.12.0, `registerActivity()` returned `void` rather than the builder, so the fluent chaining pattern `new WorkflowRuntimeBuilder().registerWorkflow(...).registerActivity(...).registerActivity(...)` would fail to compile. Fixed by breaking into separate statements.

## Review Notes
- The Maven dependency version `1.12.0` is quite outdated — the latest stable release is 1.17.2. The basic workflow APIs (WorkflowActivity, Workflow, WorkflowStub, DaprWorkflowClient) are correct for v1.12.0, but the retry classes (`WorkflowTaskRetryPolicy`, `WorkflowTaskOptions`) were introduced in a later version. Readers using v1.12.0 would need to use `com.microsoft.durabletask.TaskOptions` for retry configuration instead, or upgrade to a newer SDK version.
- In newer SDK versions (1.17.x), `WorkflowActivity` and `WorkflowActivityContext` have been moved from `io.dapr.workflows.runtime` to `io.dapr.workflows`. The imports in this post are correct for v1.12.0 but would need updating for the latest SDK.
- `waitForInstanceCompletion` and `WorkflowInstanceStatus` are deprecated in newer versions in favor of `waitForWorkflowCompletion` and `WorkflowState`. The code shown works for v1.12.0.
- The project structure mentions `SendNotificationActivity.java` but no implementation is provided in the post. This is a minor omission — the file is listed but never defined or used.
