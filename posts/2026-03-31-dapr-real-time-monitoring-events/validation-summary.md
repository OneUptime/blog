# Validation Summary: How to Build Real-Time Monitoring with Dapr Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub, state management, service invocation)
- Dapr Python SDK (`dapr-client`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr declarative subscription YAML with content-based routing (CEL expressions)
- Python (`psutil`, Flask)
- Node.js

## Sources Consulted
- Dapr Pub/Sub documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/
- Dapr Python SDK client reference: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr Python SDK source (publish_event signature): https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/client.py
- Dapr JavaScript SDK server reference: https://docs.dapr.io/developing-applications/sdks/js/js-server/
- Dapr JavaScript SDK client reference: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr Subscription spec (routing rules): https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr content-based routing how-to: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr CloudEvents documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr State Management how-to: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/

## Issues Found

### 1. Incorrect CEL expression in subscription routing rules
**What was wrong:** The YAML subscription used `event.severity` in the `match` expressions for content-based routing. Since `severity` is a custom field in the message data payload (not a standard CloudEvents attribute like `type` or `source`), the correct CEL expression is `event.data.severity`.
**What was changed:** Updated `event.severity == "critical"` to `event.data.severity == "critical"` and `event.severity == "warning"` to `event.data.severity == "warning"`.
**Why:** Dapr wraps pub/sub messages in CloudEvents envelopes. Standard CloudEvents attributes (type, source, id, etc.) are accessed as `event.<attribute>`, but custom application data fields must be accessed via `event.data.<fieldname>`.

### 2. Python `publish_event` called with raw dict instead of string
**What was wrong:** In the "Real-Time Dashboard Feed" section, `client.publish_event()` was called with a Python dict as the `data` argument. The Dapr Python SDK's `publish_event` method expects `data` to be of type `str` or `bytes`, not `dict`.
**What was changed:** Wrapped the dict argument in `json.dumps()` to serialize it to a JSON string. Also added the missing `import json` and `from dapr.clients import DaprClient` imports to make the code snippet self-contained.
**Why:** Passing a dict directly would raise a TypeError at runtime. The first code example in the post correctly uses `json.dumps()`, so this was an inconsistency.

## Review Notes
- The Python SDK's `publish_event` does not specify `data_content_type='application/json'` in any of the examples. While the code will work without it (Dapr infers content type), explicitly setting it is a best practice for interoperability with subscribers expecting JSON CloudEvents.
- The `get_state` result's `.data` property returns bytes in the Python SDK. The code uses `json.loads(result.data or '...')` which works because `json.loads()` accepts both `bytes` and `str` in Python 3, and empty bytes (`b''`) is falsy so the `or` fallback triggers correctly.
- The JavaScript `DaprServer` subscribe callback actually receives `(data, headers)` but only using the first parameter (as `metrics`) is valid JavaScript and works correctly.
- The `__import__('time').time()` usage in the alert aggregation section is unconventional but technically correct. A standard `import time` at the top would be more readable.
