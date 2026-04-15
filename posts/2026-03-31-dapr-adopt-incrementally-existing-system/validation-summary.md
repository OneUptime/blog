# Validation Summary: How to Adopt Dapr Incrementally in an Existing System

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar, state management, components)
- Kubernetes (annotations, deployments, kubectl)
- Python (Dapr Python SDK)
- Redis (state store backend)

## Sources Consulted
- Dapr Python SDK source code (dapr/python-sdk on GitHub) — `DaprClient.save_state()` signature and `StateResponse.data` type
- Dapr Kubernetes annotations documentation (dapr.io/docs)
- Dapr component spec for `state.redis` (dapr.io/docs)

## Issues Found

1. **Missing `import json` in Step 3 code example**: The Python code used `json.loads()` and `json.dumps()` but did not import the `json` module. Added `import json` to the import block.

2. **`save_state` passed a `dict` instead of a serialized string**: In Step 3, `d.save_state('usercache', f'user-{user_id}', user)` passes a Python `dict` directly as the value. The Dapr Python SDK's `save_state()` method accepts only `Union[bytes, str]` and raises `ValueError` for other types. Changed to `d.save_state('usercache', f'user-{user_id}', json.dumps(user))`.

## Review Notes
- The `StateResponse.data` property returns `bytes`. The existing `json.loads(result.data)` calls work correctly since `json.loads()` accepts `bytes`. An alternative would be `result.json()` which the SDK also provides, but the current approach is fine.
- The canary rollout in Step 4 introduces a `use_dapr()` function that is not wired into the Step 3 code. This is a pedagogical choice (showing concepts incrementally) rather than a technical error — readers will need to integrate the two patterns themselves.
- The Dapr component YAML, Kubernetes annotations, and kubectl commands are all correct.
