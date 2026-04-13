# Validation Summary: How to Use Dapr Workflow with Timers and Delays

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow SDK (Python)
- Durable Task Framework (underlying engine for Dapr workflows)
- Python datetime and timedelta

## Sources Consulted
- Dapr Workflow Python SDK documentation: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr Workflow timers documentation: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-features-concepts/#timers-and-reminders
- Dapr Python SDK source (dapr-ext-workflow): https://github.com/dapr/python-sdk/tree/master/ext/dapr-ext-workflow
- Durable Task Framework for Python (durabletask-python): https://github.com/microsoft/durabletask-python
- Cross-referenced with other Dapr workflow blog posts in this repository (dapr-workflow-external-events, dapr-how-to-build-dapr-workflows-with-python-sdk)

## Issues Found
1. **`ctx.task_any()` is not a valid API** (line 101): The blog used `ctx.task_any([approval_event, timeout])`, but `DaprWorkflowContext` does not have a `task_any()` method. The correct API is the module-level `when_any()` function exported from `dapr.ext.workflow`. Fixed by adding `from dapr.ext.workflow import when_any` and changing the call to `when_any([approval_event, timeout])`.

2. **Exponential backoff comment overstated delay values** (line 80): The inline comment said "2, 4, 8, 16, 32 seconds" but the 32-second delay is never actually created. With `max_retries = 5` and the guard `if attempt < max_retries - 1`, timers are only created for attempts 0-3, producing delays of 2, 4, 8, and 16 seconds. Attempt 4 (the final retry) falls through to the failure return without creating a timer. Fixed the comment to "2, 4, 8, 16 seconds".

## Review Notes
- The post correctly emphasizes using `ctx.current_utc_datetime` instead of `datetime.utcnow()` for replay-safe time in orchestrators. This is an important best practice.
- The `create_timer()` API is used correctly throughout, accepting a `datetime` object representing the fire-at time.
- The `wait_for_external_event()` and `call_activity()` APIs are used correctly.
- The generator-based orchestrator pattern using `yield` is correct for the Dapr Python SDK.
- The `approval_event.get_result()` pattern on line 107 may vary between SDK versions; some versions use a `.result` property instead. This is worth monitoring as the SDK evolves.
