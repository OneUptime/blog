# Validation Summary: How to Use Dapr for Healthcare System Integration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (`dapr-client`, `dapr-ext-workflow`)
- Dapr Cryptography API
- Dapr Pub/Sub building block
- Dapr State Management building block
- Dapr Service Invocation building block
- Dapr Workflow extension
- Flask (Python web framework)
- FHIR (Fast Healthcare Interoperability Resources)
- HL7
- Azure Key Vault (as crypto component)

## Sources Consulted
- Dapr Python SDK source code: https://github.com/dapr/python-sdk
- Dapr Cryptography API reference: https://docs.dapr.io/reference/api/cryptography_api/
- Dapr Cryptography how-to guide: https://docs.dapr.io/developing-applications/building-blocks/cryptography/howto-cryptography/
- Dapr Workflow Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr Python Client documentation: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/

## Issues Found

### 1. Incorrect `encrypt()` API usage (Patient Data Service)
**What was wrong:** The `encrypt()` call passed a plain dictionary for the `options` parameter with camelCase keys (`componentName`, `keyName`, `algorithm`). The Dapr Python SDK requires an `EncryptOptions` object with snake_case parameter names (`component_name`, `key_name`, `key_wrap_algorithm`). Additionally, `"A256GCM"` was used as the algorithm value, but A256GCM is a data encryption cipher, not a key wrap algorithm. A valid key wrap algorithm (e.g., `"RSA"`) is required.
**What was changed:** Added import of `EncryptOptions` from `dapr.clients.grpc._crypto`, created an `EncryptOptions` object with correct parameter names and `key_wrap_algorithm="RSA"`, and passed it to `client.encrypt()`.

### 2. Incorrect access of encrypted result (Patient Data Service)
**What was wrong:** The code used `encrypted.data` to access the encrypted bytes. The `encrypt()` method returns a readable stream, not an object with a `.data` attribute.
**What was changed:** Changed `encrypted.data` to `encrypted.read()` to correctly consume the stream and obtain the encrypted bytes.

### 3. Invalid workflow decorator usage (Clinical Workflow Orchestration)
**What was wrong:** The code used `@wf.workflow` as a module-level decorator. The Dapr Python SDK does not expose a `workflow` decorator directly on the `dapr.ext.workflow` module. Instead, you must create a `WorkflowRuntime` instance and use its `.workflow()` method as the decorator.
**What was changed:** Added `wf_runtime = wf.WorkflowRuntime()` and changed the decorator to `@wf_runtime.workflow(name='lab_order_workflow')`. Also added the `DaprWorkflowContext` type annotation to the `ctx` parameter for clarity.

### 4. Non-existent `timeout_in_seconds` parameter on `wait_for_external_event` (Clinical Workflow Orchestration)
**What was wrong:** The code used `ctx.wait_for_external_event("lab-results-received", timeout_in_seconds=86400)`. The `wait_for_external_event()` method does not accept a timeout parameter.
**What was changed:** Replaced with the correct timeout pattern: create separate event and timer tasks, then use `wf.when_any()` to race them. Added `from datetime import timedelta` import and timeout handling logic.

## Review Notes
- The `datetime.datetime.utcnow()` call in the HIPAA audit logging section is deprecated as of Python 3.12 in favor of `datetime.datetime.now(datetime.timezone.utc)`. This is not yet broken but may trigger deprecation warnings on newer Python versions.
- The FHIR adapter section header says "Handle FHIR resources via Dapr bindings" but the code actually uses Dapr service invocation (`invoke_method`), not Dapr bindings. This is a minor descriptive inaccuracy but does not affect the code's correctness.
- The `save_state`, `publish_event`, and `invoke_method` APIs are used correctly.
- The FHIR-to-internal transformation logic is reasonable and syntactically correct.
- The HIPAA audit logging decorator pattern is well-structured and functional.
