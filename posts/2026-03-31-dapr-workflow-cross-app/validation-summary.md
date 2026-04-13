# Validation Summary: How to Execute Workflows Across Multiple Dapr Applications

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr Workflow building block
- Dapr Python SDK (`dapr-client`, `dapr-ext-workflow`, `dapr-ext-grpc`)
- Dapr Service Invocation
- Dapr Pub/Sub
- Dapr Access Control Configuration (Kubernetes)

## Sources Consulted
- Installed Dapr Python SDK v1.16.2 source code (`dapr/clients/grpc/client.py`, `dapr/ext/workflow/dapr_workflow_context.py`, `dapr/ext/workflow/dapr_workflow_client.py`, `dapr/clients/grpc/_response.py`)
- Dapr Workflow SDK API signatures for `call_child_workflow`, `invoke_method`, `publish_event`, and `raise_workflow_event`
- Dapr Configuration CRD schema for access control policies

## Issues Found

1. **Approach 1 - `call_child_workflow` missing `app_id` and using function references**: The section describes cross-application child workflows, but the code passed workflow functions (e.g., `workflow=payment_workflow`) without the `app_id` parameter. Cross-app child workflows require passing the workflow name as a string and specifying `app_id`. Fixed by changing to string workflow names (e.g., `workflow="payment_workflow"`) and adding `app_id="payment-service"` / `app_id="shipping-service"`. Also removed the misleading comment "Must be registered in the same app".

2. **Approach 2 - `invoke_method` `data` parameter type mismatch**: The `data` parameter of `DaprClient.invoke_method()` accepts `Union[bytes, str, GrpcMessage]`, not `dict`. Passing a dict directly raises a `ValueError`. Fixed by wrapping the dict with `json.dumps()` and adding `import json`.

3. **Approach 3 - `publish_event` `data` parameter type mismatch**: The `data` parameter of `DaprClient.publish_event()` accepts `Union[bytes, str]`, not `dict`. The SDK has an explicit runtime check that raises `ValueError` for non-bytes/str types. Fixed by wrapping the dict with `json.dumps()` and adding `import json`.

4. **Approach 3 - `raise_workflow_event` positional argument error**: The `data` parameter of `DaprWorkflowClient.raise_workflow_event()` is keyword-only (defined as `*, data: Optional[Any] = None`). The code passed it positionally, which would raise a `TypeError`. Fixed by changing to `data=data`.

5. **Cross-namespace code block language tag**: The first code block in the cross-namespace section contained Python code but was tagged as `yaml`. Fixed by changing the language tag to `python`.

## Review Notes
- The `invoke_method` API used in Approach 2 emits a `DeprecationWarning` in the current SDK: "invoke_method with protocol gRPC is deprecated. Use gRPC proxying instead." This is not incorrect for the blog post's purposes but may warrant a note in a future update.
- The `InvokeMethodResponse.json()` method used in Approach 2 was verified to exist and work correctly in the SDK (it calls `json.loads(to_str(self.data))`).
- The cross-app `call_child_workflow` with `app_id` parameter is supported at the SDK level but depends on the underlying durabletask-dapr runtime also supporting the feature. The blog post should be monitored for any runtime-level changes.
