# Validation Summary: Dapr vs Temporal: Workflow Orchestration Comparison

## Status
validated

## Post Type
Comparison / Reference

## Technologies Covered
- Dapr Workflow (dapr-ext-workflow Python SDK)
- Temporal (temporalio Python SDK)
- Durable Task Framework
- Event sourcing and replay-based workflow orchestration

## Sources Consulted
- Dapr Python SDK source (`dapr-ext-workflow` package) — `WorkflowRuntime`, `DaprWorkflowContext`, workflow/activity registration APIs
- Temporal Python SDK documentation and source (`temporalio` package) — `workflow.defn`, `workflow.run`, `workflow.execute_activity` APIs
- Dapr Workflow documentation: https://docs.dapr.io/developing-applications/building-blocks/workflow/
- Temporal Python SDK documentation: https://docs.temporal.io/develop/python

## Issues Found

### 1. Dapr Workflow example used non-existent `@wf.defn` decorator
- **What was wrong:** The code used `@wf.defn(name="OrderWorkflow")` as a module-level decorator after `import dapr.ext.workflow as wf`. This decorator does not exist in the Dapr Python workflow SDK. It appears to have been confused with Temporal's `@workflow.defn`.
- **What was changed:** Replaced the import with `from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext`, added `wfr = WorkflowRuntime()` instantiation, and changed the decorator to `@wfr.workflow(name="OrderWorkflow")` — which is the correct API for registering workflows in the Dapr Python SDK.
- **Why:** The `@wf.defn` decorator would cause an `AttributeError` at runtime. Dapr workflows are registered via `WorkflowRuntime` instance methods (`@wfr.workflow` or `wfr.register_workflow()`).

### 2. Dapr Workflow example used dot-access on dict result
- **What was wrong:** The code used `result.valid` to access the activity result, but activity results returned as dicts should use bracket notation.
- **What was changed:** Changed `result.valid` to `result["valid"]` to be consistent with dict access (matching the Temporal example's pattern).
- **Why:** If the activity returns a dict (the common case), dot-access would raise an `AttributeError`.

### 3. Temporal example missing `timedelta` import
- **What was wrong:** The code used `timedelta(seconds=10)` and `timedelta(seconds=30)` without importing `timedelta` from the `datetime` module.
- **What was changed:** Added `from datetime import timedelta` at the top of the Temporal code block.
- **Why:** The missing import would cause a `NameError` at runtime.

### 4. Temporal example had unused `activity` import
- **What was wrong:** `from temporalio import workflow, activity` imported `activity` but it was never used in the snippet.
- **What was changed:** Simplified to `from temporalio import workflow`.
- **Why:** Unused import is misleading in example code — readers might think `activity` is needed for `workflow.execute_activity`.

## Review Notes
- The comparison table and prose explanations of Dapr vs Temporal trade-offs are accurate and well-balanced.
- The claim that Dapr Workflow is "built on top of the Durable Task Framework" is correct.
- The claim that Temporal replays "the entire event history" is a simplification — Temporal uses sticky execution caching to avoid full replay in many cases — but is not incorrect as a description of the underlying model.
- The operational comparison (Dapr reuses existing infrastructure vs. Temporal requires a dedicated cluster) is accurate.
