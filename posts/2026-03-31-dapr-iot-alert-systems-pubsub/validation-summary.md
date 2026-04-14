# Validation Summary: How to Build IoT Alert Systems with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub messaging, state management)
- Dapr Python SDK (`dapr-client`)
- Python / Flask
- IoT telemetry and alert systems
- CloudEvents message format

## Sources Consulted
- Dapr Python SDK source and API reference: `DaprClient.publish_event()` method signature expects `Union[str, bytes]` for the `data` parameter, not raw Python dicts
- Dapr Python SDK `save_state()` method signature: confirms `state_metadata` parameter for TTL metadata
- Dapr Python SDK `get_state()` return type: `StateResponse` where `.data` is bytes (empty `b""` when key not found, which is falsy)
- Dapr pub/sub CloudEvents specification: subscriber handlers receive payload under `event['data']`
- Dapr state management TTL documentation: `ttlInSeconds` metadata key for state entry expiration

## Issues Found

### 1. `publish_event()` calls passed raw dicts instead of serialized JSON (4 occurrences)
- **What was wrong:** All four `publish_event()` calls across the Alert Evaluator, Deduplication, Notification Router, and Dashboard Feed code blocks passed Python `dict` objects directly as the `data` argument. The Dapr Python SDK `publish_event()` method expects `str` or `bytes`, not `dict`.
- **What was changed:** Wrapped all `data` arguments with `json.dumps()` and added `data_content_type='application/json'` to each call.
- **Why:** Without serialization, the SDK may raise a TypeError or produce unexpected behavior. Specifying `data_content_type` ensures subscribers correctly interpret the payload format.

### 2. Missing `import json` in Notification Router and Dashboard Feed snippets
- **What was wrong:** After adding `json.dumps()` calls to the Notification Router and Dashboard Feed code blocks, these snippets needed the `json` import to be complete and runnable.
- **What was changed:** Added `import json` to both code blocks.
- **Why:** Ensures each code snippet is self-contained and won't cause `NameError` if copied directly.

## Review Notes
- The `get_state().data or '[]'` pattern works correctly because `.data` returns `b""` (falsy) when a key doesn't exist, and `json.loads()` accepts both `str` and `bytes`.
- The `state_metadata={"ttlInSeconds": "900"}` parameter usage for TTL-based deduplication is correct.
- The CloudEvents access pattern `event['data']` is correct for Dapr pub/sub subscriptions.
- The architecture diagram accurately represents the pub/sub topology described in the code.
- The alert deduplication and notification router patterns are sound and follow Dapr best practices.
