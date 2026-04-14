# Validation Summary: How to Use Dapr for Telecommunications Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (`dapr-client`)
- Flask (Python web framework)
- Dapr Pub/Sub (bulk subscribe)
- Dapr State Management (with ETag optimistic concurrency)
- Dapr Service Invocation

## Sources Consulted
- Dapr Bulk Subscribe documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Python SDK source code (`dapr.clients.grpc.client`): `publish_event`, `get_state`, `save_state`, `invoke_method` signatures
- Dapr runtime source code (`pkg/runtime/pubsub/bulksubscribe_events.go`) for bulk subscribe envelope format

## Issues Found

### 1. `publish_event` called with `dict` instead of `str`/`bytes`
- **What was wrong:** Two calls to `client.publish_event()` passed a Python `dict` as the `data` argument (in the CDR processor and network alarm handler). The Dapr Python SDK's `publish_event` method only accepts `str` or `bytes` for `data` and raises a `ValueError` for any other type.
- **What was changed:** Wrapped both dict arguments with `json.dumps()` to serialize them to JSON strings before passing to `publish_event`.
- **Why:** The SDK explicitly validates: `if not isinstance(data, bytes) and not isinstance(data, str): raise ValueError(...)`.

### 2. Bulk subscribe message handling assumed wrong payload structure
- **What was wrong:** The handler treated `request.json` as either a plain list of CloudEvents or a single CloudEvent (`if isinstance(cloud_events, list)`). In reality, Dapr delivers bulk subscribe messages as an envelope object with an `entries` array, where each entry contains `entryId`, `event`, `metadata`, and `contentType`.
- **What was changed:** Updated the handler to parse the bulk envelope correctly: `entries = envelope.get('entries', [])` and extract CDR data from `entry['event'].get('data', {})`.
- **Why:** The previous code would fail at runtime because `request.json` is a dict (the envelope), not a list.

### 3. Bulk subscribe response missing per-entry statuses
- **What was wrong:** The handler returned `{'status': 'SUCCESS', 'processed': len(cdrs)}`. Dapr bulk subscribe requires the app to return per-entry statuses in the format `{'statuses': [{'entryId': '...', 'status': 'SUCCESS'}, ...]}`.
- **What was changed:** Updated the return value to produce the required per-entry status response with each entry's `entryId` and status.
- **Why:** Without per-entry statuses, Dapr cannot determine which messages were successfully processed and which should be retried.

## Review Notes
- The `state.data` fallback logic (`state.data or '{"voice_minutes": 0, ...}'`) works because `json.loads()` accepts both `str` and `bytes` in Python 3, and empty bytes `b''` is falsy. This is functional but slightly fragile — a more explicit check like `state.data if state.data else b'...'` would be clearer, but this is a style preference rather than a bug.
- The `enrich_cdr` function calls `calculate_cost(cdr)` which is not defined in the snippet. This is acceptable for a tutorial (implied helper function) but readers should be aware they need to implement it.
- The `get_billing_period()` and `check_plan_limits()` functions are similarly undefined but implied as helpers.
- The `invoke_method` calls correctly use `.encode()` on the JSON string to pass bytes, and `result.data` returns bytes which `json.loads()` handles correctly in Python 3.
