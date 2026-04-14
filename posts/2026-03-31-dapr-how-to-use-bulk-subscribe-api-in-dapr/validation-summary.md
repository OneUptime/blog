# Validation Summary: How to Use Bulk Subscribe API in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Pub/Sub building block, Bulk Subscribe API)
- Python (Flask)
- Node.js (Express)
- CloudEvents specification
- Declarative subscriptions (YAML, `dapr.io/v2alpha1`)

## Sources Consulted
- Dapr official documentation: How to bulk subscribe (https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-bulk-subscribe/)
- Dapr official documentation: Subscription methods (https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/)
- Dapr official documentation: Pub/Sub API reference (https://docs.dapr.io/reference/api/pubsub_api/)
- Dapr Go source code: `pkg/apis/subscriptions/v2alpha1/types.go` (BulkSubscribe struct definition)
- Dapr Java SDK source: `BulkSubscribeMessage.java`, `BulkSubscribeMessageEntry.java`, `BulkSubscribeAppResponse.java`, `BulkSubscribeAppResponseStatus.java`
- CloudEvents specification v1.0

## Issues Found

1. **Bulk message format missing top-level fields**: The JSON example for the incoming bulk message only showed the `entries` array. According to the Dapr documentation and SDK source code, the top-level bulk message also includes `topic` and `metadata` fields alongside `entries`. Added these fields to the example.

2. **CloudEvent examples missing `specversion` field**: The CloudEvent objects inside each entry's `event` field were missing the `specversion` attribute, which is a required field per the CloudEvents v1.0 specification and is included by Dapr. Added `"specversion": "1.0"` to both CloudEvent examples.

3. **Missing `DROP` status value**: The response format section only mentioned `SUCCESS` and `RETRY` as valid status values. Dapr actually supports three statuses: `SUCCESS`, `RETRY`, and `DROP`. The `DROP` status tells Dapr to discard the message (with a warning logged) without retrying it, which is important for handling poison messages. Added a complete list of valid status values with descriptions.

## Review Notes
- The Node.js response includes a custom `error` field in the status entries (line 173). This field is not part of the Dapr bulk subscribe API specification and will be ignored by Dapr. It is harmless but could mislead readers into thinking it is a recognized field. Not changed since it does not cause functional issues.
- The Python code has an unused `import json` (line 61, `from flask import ... jsonify` is used instead). Not changed as this is a minor style issue, not a technical error.
- Bulk subscribe is stable/GA as of Dapr v1.12+ and the `dapr.io/v2alpha1` API version for declarative subscriptions is correct.
- The blog correctly notes default values: `maxMessagesCount: 100` and `maxAwaitDurationMs: 1000`.
- Streaming subscriptions are not supported for bulk subscribe — the blog does not mention this, which is acceptable since it focuses on HTTP-based subscriptions.
