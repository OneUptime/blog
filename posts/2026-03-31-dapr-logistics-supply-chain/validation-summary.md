# Validation Summary: How to Use Dapr for Logistics and Supply Chain Systems

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (`dapr-ext-workflow`, `dapr.clients`)
- Dapr Workflow API (DaprWorkflowContext, WorkflowRuntime, activities)
- Dapr State Management (save_state)
- Dapr Pub/Sub (publish_event)
- Dapr Service Invocation (invoke_method)
- Dapr Input Bindings (bindings.http)
- Python / Flask
- YAML (Dapr component configuration)

## Sources Consulted
- Dapr Python SDK workflow documentation (dapr.ext.workflow module API)
- Dapr workflow external event and timer patterns from validated blog posts in this repository
- Dapr component spec for bindings.http
- Dapr Python SDK DaprClient API (save_state, publish_event, raise_workflow_event, invoke_method)

## Issues Found

### 1. Invalid workflow and activity decorators
**What was wrong:** The post used `@wf.workflow` and `@wf.activity` as module-level decorators directly on the `dapr.ext.workflow` module. These do not exist as module-level decorators.
**What was changed:** Added `wf_runtime = wf.WorkflowRuntime()` and changed decorators to `@wf_runtime.workflow(name='shipment_workflow')` and `@wf_runtime.activity(name='book_carrier')`. Also added proper type annotations (`ctx: wf.DaprWorkflowContext` for workflow, `ctx: wf.WorkflowActivityContext` for activity).

### 2. Invalid `timeout_in_seconds` parameter on `wait_for_external_event`
**What was wrong:** `ctx.wait_for_external_event("pick-confirmed", timeout_in_seconds=14400)` — the `timeout_in_seconds` parameter does not exist on this method. The same issue occurred for the carrier handoff event.
**What was changed:** Replaced with the correct timer + `when_any` pattern:
```python
pick_event = ctx.wait_for_external_event("pick-confirmed")
pick_timeout = ctx.create_timer(timedelta(hours=4))
winner = yield wf.when_any([pick_event, pick_timeout])
```

### 3. Invalid `try/except TimeoutError` pattern for workflow timeouts
**What was wrong:** The post wrapped `wait_for_external_event` in a `try/except TimeoutError` block. Dapr workflow timeouts do not raise `TimeoutError`; instead, you race the event against a timer and check which task completed first.
**What was changed:** Replaced with `if winner == pick_timeout:` check after `wf.when_any()`.

### 4. Missing `import json` in tracking service code block
**What was wrong:** The tracking service code block used `json.dumps()` but did not include `import json` in its imports.
**What was changed:** Added `import json` to the imports section of the tracking service code block.

## Review Notes
- The post uses `DaprClient.raise_workflow_event()` with `workflow_component` and `event_data` parameters. This is the older API style. The newer `DaprWorkflowClient` has a simpler signature without `workflow_component` and uses `data=` instead of `event_data=`. Both work, but the newer client is recommended for new code.
- The warehouse service code snippet (picks.py) uses `json.dumps()` without showing an import, but since it's clearly a partial snippet (no imports section shown), this is acceptable.
- The `bindings.http` component YAML is correctly structured for a Dapr v1alpha1 component spec.
- The `invoke_method` calls correctly use `http_verb`, `data` (as encoded bytes), and access the response via `.data` — all consistent with the DaprClient API.
