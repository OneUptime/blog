# Validation Summary: How to Implement Distributed Transactions with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management, pub/sub, service invocation, workflows)
- Dapr Python SDK (`dapr-client`, `dapr-ext-workflow`)
- Dapr CLI
- Python / Flask
- Saga pattern (choreography and orchestration)
- Distributed transactions

## Sources Consulted
- Dapr Python SDK source code (dapr/python-sdk on GitHub) — `dapr/clients/grpc/_request.py` for `TransactionalStateOperation` and `TransactionOperationType`
- Dapr Python SDK — `dapr/clients/grpc/client.py` for `publish_event` and `invoke_method` signatures
- Dapr Python SDK — `dapr/ext/workflow/workflow_runtime.py` for `WorkflowRuntime.workflow()` and `WorkflowRuntime.activity()` decorators
- Dapr Python SDK — `dapr/ext/workflow/__init__.py` for exported class names (`WorkflowActivityContext`, `DaprWorkflowClient`)
- Dapr Python SDK — `examples/` directory for official usage patterns
- Dapr CLI source code (dapr/cli on GitHub) — `cmd/workflow/` for CLI command syntax

## Issues Found

1. **Wrong import path for state transaction classes**: `from dapr.clients.grpc._state import ...` was incorrect. The correct module is `dapr.clients.grpc._request`. Fixed the import to `from dapr.clients.grpc._request import TransactionalStateOperation, TransactionOperationType`.

2. **`publish_event` passed dict instead of serialized string**: The `publish_event` method only accepts `bytes` or `str` for the `data` parameter, and raises `ValueError` for other types. The two calls passing raw dicts were wrapped with `json.dumps()`.

3. **Workflow decorators used on module instead of WorkflowRuntime instance**: `@wf.activity` and `@wf.workflow` do not exist as module-level decorators. The correct pattern is to instantiate `wfr = WorkflowRuntime()` and use `@wfr.activity` / `@wfr.workflow`. Added the `WorkflowRuntime` instantiation and changed all decorator references.

4. **Wrong class name `ActivityContext`**: The Dapr Python SDK exports `WorkflowActivityContext`, not `ActivityContext`. Fixed the import and all type annotations.

5. **`DaprClient.start_workflow()` does not exist**: The general-purpose `DaprClient` has no workflow methods. The correct approach is to use `DaprWorkflowClient` from `dapr.ext.workflow` and call `schedule_new_workflow(workflow=..., input=...)`. Fixed the import, client class, and method call.

6. **CLI command syntax error**: `dapr workflow history --workflow-id <instance-id>` uses a non-existent flag. The instance ID is a positional argument. Fixed to `dapr workflow history <instance-id> --app-id order-service`.

## Review Notes
- The `invoke_method` calls use `.encode()` on the data which is unnecessary (the method accepts `str` directly), but it is not incorrect — `bytes` is also a valid type.
- The `json.loads(result.data)` calls work but could use the more idiomatic `result.json()` convenience method. Not changed since the current form is technically correct.
- The state store transaction example reads two keys and writes them back without using ETags for optimistic concurrency control. In production, this could lead to lost updates under concurrent access. This is a design consideration rather than a code error.
- The `WorkflowRuntime` instance (`wfr`) would also need to be started with `wfr.start()` and shut down with `wfr.shutdown()` in a real application, but this is runtime lifecycle code outside the scope of the code snippets shown.
