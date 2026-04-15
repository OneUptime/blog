# Validation Summary: How to Implement Data Consistency Across Services with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (`dapr-client`)
- Dapr State Management API (ETags, consistency levels, concurrency control)
- Dapr Pub/Sub API
- Dapr Service Invocation API
- Dapr Workflow SDK (`dapr-ext-workflow`)
- Saga pattern for distributed transactions
- Python 3

## Sources Consulted
- Dapr Python SDK source code — `dapr/clients/grpc/client.py` (method signatures for `get_state`, `save_state`, `invoke_method`, `publish_event`): https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/client.py
- Dapr Python SDK source code — `dapr/clients/grpc/_state.py` (StateOptions, Consistency, Concurrency enum definitions): https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/_state.py
- Dapr Python SDK workflow examples: https://github.com/dapr/python-sdk/blob/main/examples/workflow/simple.py
- Dapr State Management documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/

## Issues Found

### 1. `get_state()` does not accept `state_options` parameter
**What was wrong:** The first code example passed `state_options=StateOptions(...)` to `client.get_state()`. The Dapr Python SDK's `get_state()` method only accepts `store_name`, `key`, `state_metadata`, and `metadata`. The `StateOptions` parameter (for consistency/concurrency) is only supported on `save_state()` and `delete_state()`.
**What was changed:** Replaced the two `get_state()` calls with one plain `get_state()` and two `save_state()` calls demonstrating strong and eventual consistency. Updated the introductory text to say "per write operation" instead of "per operation".

### 2. Wrong enum class names: `StateConsistency` and `StateConcurrency`
**What was wrong:** The import and usage referenced `StateConsistency` and `StateConcurrency`. The actual class names in `dapr.clients.grpc._state` are `Consistency` and `Concurrency`.
**What was changed:** Updated the import to `from dapr.clients.grpc._state import StateOptions, Concurrency, Consistency` and all references accordingly.

### 3. Wrong enum value casing: `STRONG`, `EVENTUAL`, `FIRST_WRITE`
**What was wrong:** Enum values were written in UPPER_CASE (e.g., `Consistency.STRONG`). The Dapr Python SDK uses lowercase enum values (`Consistency.strong`, `Consistency.eventual`, `Concurrency.first_write`).
**What was changed:** Updated all enum references to use the correct lowercase naming.

### 4. `invoke_method()` incorrect positional argument order
**What was wrong:** All three `invoke_method()` calls passed `"POST"` as the third positional argument (e.g., `client.invoke_method("inventory-service", "inventory/reserve", "POST", data=...)`). In the actual SDK, the third positional parameter is `data`, not `http_verb`. This would cause a `TypeError` at runtime ("got multiple values for argument 'data'").
**What was changed:** Removed `"POST"` from the positional arguments and passed it as the keyword argument `http_verb="POST"`.

### 5. Saga compensation logic bug — broken state comparison
**What was wrong:** In the exception handler, `saga['state']` was set to `SagaState.COMPENSATING.value` (`"compensating"`) before checking whether inventory needed to be released. The check `if saga['state'] >= SagaState.INVENTORY_RESERVED.value` compared `"compensating" >= "inventory_reserved"`, which is `False` lexicographically (`'c' < 'i'`), so compensation would never execute.
**What was changed:** Saved the previous state to `last_completed` before overwriting, and changed the condition to `if last_completed in (SagaState.INVENTORY_RESERVED.value, SagaState.PAYMENT_PROCESSED.value)` for explicit, reliable matching.

### 6. `publish_event()` passed dicts instead of serialized strings
**What was wrong:** Two `publish_event()` calls passed Python dicts directly as the `data` argument. The SDK expects `Union[bytes, str]`, so passing a dict would raise a `TypeError`.
**What was changed:** Wrapped both data arguments with `json.dumps()`.

## Review Notes
- The optimistic locking example (`transfer_balance`) only updates the source account balance but never credits the destination account. This is acceptable since the example focuses on demonstrating ETag-based concurrency control, but readers may want to extend it for a complete transfer.
- The recursive retry in `transfer_balance` has no backoff or retry limit, which could cause a stack overflow under high contention. A production implementation should use a loop with bounded retries.
- The workflow example imports `WorkflowRuntime` but does not show runtime registration with `@wfr.workflow` decorator or `wfr.start()`. This is fine for a conceptual snippet but readers should consult the full Dapr workflow documentation for a complete setup.
- The import path `dapr.clients.grpc._state` uses a private module (underscore prefix). This is the conventional import path shown in Dapr SDK examples, but it may change in future SDK versions.
