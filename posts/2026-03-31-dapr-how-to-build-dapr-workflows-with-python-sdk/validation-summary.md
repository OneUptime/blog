# Validation Summary: How to Build Dapr Workflows with Python SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (`dapr` package)
- Dapr Workflow Extension (`dapr-ext-workflow` package)
- Python
- Dapr CLI

## Sources Consulted
- Dapr Python SDK Workflow Extension documentation: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr Python SDK source code on GitHub: https://github.com/dapr/python-sdk/tree/main/ext/dapr-ext-workflow
- Dapr Quickstarts - Workflow Python SDK examples: https://github.com/dapr/quickstarts/tree/master/workflows/python/sdk
- Dapr Workflow Patterns documentation: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-patterns/
- dapr-ext-workflow on PyPI: https://pypi.org/project/dapr-ext-workflow/
- Dapr CLI reference (dapr run): https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

1. **Incorrect description of activity registration (text/code mismatch)**: The text stated activities are "decorated with `@wf.activity`" but the code examples showed plain functions registered imperatively via `register_activity()`. Fixed the text to say "plain Python function that gets registered with the workflow runtime" to match the code.

2. **Wrong activity context type name**: All three activity functions used `wf.ActivityContext` as the context parameter type, but the correct type exported from `dapr.ext.workflow` is `WorkflowActivityContext`. Changed all three occurrences of `wf.ActivityContext` to `wf.WorkflowActivityContext`.

3. **Unused import**: The main application code example imported `time` but never used it. Removed the unused import.

## Review Notes
- The post uses imperative registration (`register_workflow()`, `register_activity()`) rather than the more idiomatic decorator-based approach (`@wfr.workflow()`, `@wfr.activity()`). Both are valid; the decorator approach is more common in official examples but the imperative approach works correctly.
- The `dapr run` command could optionally include `--resources-path` to point to custom component definitions if the default path doesn't apply, but the command as written is valid for the default setup.
- All other APIs verified correct: `WorkflowRuntime`, `DaprWorkflowClient`, `schedule_new_workflow`, `wait_for_workflow_completion`, `raise_workflow_event`, `when_all`, `when_any`, `wait_for_external_event`, `create_timer`, and the `winner == timeout_event` comparison pattern.
