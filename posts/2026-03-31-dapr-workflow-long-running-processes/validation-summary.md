# Validation Summary: How to Use Dapr Workflow for Long-Running Processes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (Durable Task Framework)
- Dapr HTTP API (Workflow management endpoints)
- Dapr Go SDK (`github.com/dapr/go-sdk/workflow`)
- Dapr Python SDK (`dapr.ext.workflow`)
- Redis (as state store backend)
- Dapr CLI

## Sources Consulted
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Workflow overview: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr Go SDK workflow docs: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr Python SDK workflow extension docs: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr v1.15 release announcement (Workflow GA): https://blog.dapr.io/posts/2025/02/27/dapr-v1.15-is-now-available/
- Dapr Go SDK examples: https://github.com/dapr/go-sdk/tree/main/examples/workflow

## Issues Found

1. **Unused Go import causes compilation error** (line ~99): The Go code example imported `"github.com/dapr/durabletask-go/task"` but never used it. In Go, unused imports are compilation errors. Removed the unused import.

2. **Incorrect Workflow GA version** (line ~62): The post stated "Workflow is GA in Dapr 1.12+" but Dapr 1.12 only promoted Workflow to beta. Workflow became stable/GA in Dapr 1.15 (February 2025). Changed to "Workflow is stable/GA in Dapr 1.15+".

3. **Incorrect GET workflow status response format** (lines ~223-232): The example response included a top-level `serializedOutput` field and `workflowName` field. Per the Dapr Workflow HTTP API reference, the actual response uses a `properties` map where the output is at `properties["dapr.workflow.output"]`, and `workflowName` is not a documented top-level field. Fixed to match the official API response format.

## Review Notes
- The Go SDK import path `github.com/dapr/go-sdk/workflow` matches the documented API, though some older examples use `github.com/dapr/durabletask-go/workflow` directly. The blog's approach using the Dapr SDK wrapper is the recommended path.
- The Python SDK example correctly uses the generator-based `yield ctx.call_activity()` pattern, which is the current documented approach.
- The Mermaid diagrams are well-constructed and accurately represent workflow execution and state persistence.
- The state store configuration correctly includes `actorStateStore: "true"`, which is required since Dapr Workflow uses the actor subsystem internally.
