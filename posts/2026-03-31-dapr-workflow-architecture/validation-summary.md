# Validation Summary: How to Understand Dapr Workflow Architecture

## Status
validated

## Post Type
Technical deep-dive / Architecture guide

## Technologies Covered
- Dapr Workflow
- Durable Task Framework (durabletask-go)
- Dapr Actors
- Dapr Scheduler Service
- Python Dapr SDK (dapr-ext-workflow)
- Redis (as state store)
- Kubernetes

## Sources Consulted
- Dapr Workflow Overview: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr Workflow Architecture: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-architecture/
- Dapr Workflow How-to (Author workflows): https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Dapr Scheduler Service: https://docs.dapr.io/concepts/dapr-services/scheduler/
- Dapr CLI Workflow reference: https://docs.dapr.io/reference/cli/dapr-workflow/
- Dapr Python SDK (durabletask-python) source for DaprWorkflowContext and WorkflowActivityContext

## Issues Found

### 1. Incorrect workflow backend component configuration
**What was wrong:** The post showed a Dapr component YAML with `type: workflowbackend.actor` and `name: actorbackend`. This component type does not exist in Dapr. Workflows use the standard actor state store — any state store that supports actors implicitly supports Dapr Workflow.
**What was changed:** Replaced with a standard Redis state store component with `actorStateStore: "true"` metadata, and updated the explanatory text to reflect that no special workflow backend component is needed.

### 2. Inaccurate description of the Dapr Scheduler service
**What was wrong:** The post stated the Scheduler service is Kubernetes-specific ("In Kubernetes, the Dapr Scheduler service routes workflow scheduling operations") and implied it routes/dispatches activities across pods. The Scheduler actually manages actor reminders used internally by workflows and runs in both Kubernetes and self-hosted environments. Activity distribution is handled by the actor placement service.
**What was changed:** Corrected the description to accurately describe the Scheduler's role (managing actor reminders for workflow scheduling/timers), noted it runs in all environments, and clarified that the actor placement service handles distribution.

### 3. Incorrect Redis key pattern for workflow actors
**What was wrong:** The post showed `redis-cli KEYS "workflowactors||*"` for inspecting workflow state. The actual internal actor type naming convention is `dapr.internal.{namespace}.{appID}.workflow`, not `workflowactors`.
**What was changed:** Updated the Redis KEYS pattern to `"*dapr.internal*workflow*"` to match the actual internal actor naming convention.

## Review Notes
- The Python code examples use `yield ctx.call_activity()` which is correct for the generator-based workflow pattern in the Python SDK.
- The post simplifies Dapr's two internal actor types (workflow actor and activity actor) into a single "Workflow Actor" concept. This is an acceptable simplification for an architecture overview but could be expanded in a future revision.
- The `dapr workflow history` CLI command is confirmed valid per official CLI documentation.
- The diagram on line 21 uses `json` as the code fence language for ASCII art — `text` would be more appropriate, but this is a stylistic issue, not a technical error.
