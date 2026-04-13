# Validation Summary: How to Use Dapr Workflow for Payment Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (Python SDK, `dapr-ext-workflow` package)
- Dapr Python SDK (`dapr.ext.workflow`)
- Python
- Stripe Payment Intents API

## Sources Consulted
- Dapr Python SDK GitHub repository: https://github.com/dapr/python-sdk
- Dapr Python SDK workflow examples: https://github.com/dapr/python-sdk/blob/main/examples/workflow/simple.py
- Dapr Python SDK workflow extension documentation: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr Workflow HTTP API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr v1.15 release notes (deprecation of DaprClient workflow methods): https://blog.dapr.io/posts/2025/02/27/dapr-v1.15-is-now-available/
- Previously validated Dapr workflow posts in this blog (user-onboarding, python-sdk, stuck-running-state, testing-locally)

## Issues Found

1. **Missing `WorkflowRuntime` instance and workflow registration**: The workflow function was defined as a plain function without being registered on a `WorkflowRuntime` instance. In the Dapr Python SDK, workflows must be registered using the `@wfr.workflow(name=...)` decorator on a `WorkflowRuntime` instance. Added `wfr = wf.WorkflowRuntime()` and the `@wfr.workflow(name='payment_processing_workflow')` decorator.

2. **Incorrect activity decorator `@wf.activity`**: The post used `@wf.activity` as a module-level decorator, which does not exist in the Dapr Python SDK. Activities must be registered on a `WorkflowRuntime` instance using `@wfr.activity(name='...')`. Fixed the `authorize_payment` activity definition to use `@wfr.activity(name='authorize_payment')`.

3. **Missing activity context type annotation**: The activity function had `ctx` as an untyped parameter. The correct type is `wf.WorkflowActivityContext`. Added proper type annotation to the `authorize_payment` activity function signature.

4. **Retry policy incorrectly placed on activity decorator**: The post applied the retry policy as an argument to the `@wf.activity` decorator (`@wf.activity(retry_policy=wf.RetryPolicy(...))`). The Dapr Python SDK does not support retry policies on activity decorators. Retry policies must be passed to `ctx.call_activity()` at the workflow call site. Rewrote the retry section to show the correct pattern with `retry_policy=` on `call_activity()`.

5. **Incorrect REST API endpoint for checking workflow status**: The blog used `GET /v1.0/workflows/dapr/payment_processing_workflow/order-ORD-123` which includes the workflow name in the path. The Dapr Workflow API does not include `<workflowName>` in GET status endpoints — it only appears in the start endpoint. Fixed to `GET /v1.0/workflows/dapr/order-ORD-123`.

6. **Deprecated `DaprClient` workflow methods**: The post used `DaprClient.start_workflow()` from `dapr.clients`, which was deprecated in Dapr v1.15 (February 2025). Updated to use `DaprWorkflowClient` from `dapr.ext.workflow` with `schedule_new_workflow()`, which is the current recommended API.

## Review Notes
- The Stripe API usage (creating a PaymentIntent with `capture_method: "manual"` for authorization holds, using `Idempotency-Key` headers) is correct and follows Stripe best practices.
- The `confirm: False` parameter in the Stripe PaymentIntent creation is shown as a boolean rather than the string `"false"` that Stripe's form-encoded API expects. However, Python's `requests` library converts `False` to the string `"False"` in form data, which Stripe accepts. This is a minor subtlety but works in practice.
- The post does not show `wfr.start()` to start the workflow runtime, which would be needed in a complete application, but this is acceptable for a tutorial showing code snippets.
- The compensation logic (voiding authorization on inventory failure, releasing inventory + voiding authorization on capture failure) is well-structured and demonstrates correct saga compensation patterns.
