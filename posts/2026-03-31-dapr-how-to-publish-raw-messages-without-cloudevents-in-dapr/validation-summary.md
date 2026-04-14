# Validation Summary: How to Publish Raw Messages Without CloudEvents in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- CloudEvents specification
- Apache Kafka (as example broker)
- Python (requests, Flask, FastAPI)
- Kubernetes (kubectl for verification)

## Sources Consulted
- Dapr official documentation — Raw pub/sub: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-raw/
- Dapr official documentation — Pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/

## Issues Found

1. **Declarative subscription apiVersion was outdated**: The post used `apiVersion: dapr.io/v1alpha1` with `route` field. The current Dapr documentation shows `apiVersion: dapr.io/v2alpha1` with `routes.default` format. Updated the YAML to match current docs.

2. **Declarative subscription metadata key was incorrect**: The post used `rawPayload: "true"` in the declarative subscription metadata. The official docs use `isRawPayload: "true"` for declarative subscriptions (while programmatic subscriptions use `rawPayload`). Updated to `isRawPayload`.

3. **Subscriber handler code was fundamentally incorrect (critical)**: The post claimed that with raw mode, the subscriber receives the raw payload directly without CloudEvent wrapping. Per the official Dapr documentation: "the subscribing Dapr process still wraps these raw messages in a CloudEvent before delivering them to the subscribing application." The raw payload is base64-encoded in the `data_base64` field with content type `application/octet-stream`. Fixed all three subscriber handler code examples to correctly decode from the CloudEvent envelope.

4. **Misleading CloudEvent comparison**: The original "Compare to CloudEvent mode" note implied raw mode removes the need to extract from a CloudEvent. Since Dapr still delivers a CloudEvent in both modes, updated the comparison to accurately describe the difference (base64 `data_base64` in raw mode vs. direct `data` field in CloudEvent mode).

5. **Mixing raw/CloudEvent explanation was inaccurate**: The post claimed that a raw message received by a CloudEvent subscription would have the payload "nested inside the CloudEvent data field as a string." In practice, a non-raw subscription may fail to correctly parse a raw broker message since it expects CloudEvent format. Updated the explanation.

6. **Summary paragraph was misleading**: The summary stated subscribers "receive the payload directly without CloudEvent unpacking." Updated to accurately note that Dapr still delivers a CloudEvent envelope to the app, with the raw data base64-encoded.

## Review Notes
- The publish-side API (`metadata.rawPayload=true` as a query parameter) is correct and unchanged.
- The programmatic subscription example correctly uses `rawPayload` (matching Dapr docs for programmatic subscriptions), while the declarative subscription now uses `isRawPayload` (matching Dapr docs for declarative subscriptions). This inconsistency exists in the official Dapr documentation itself.
- The Dapr runtime accepts both `rawPayload` and `isRawPayload` as metadata keys, but the blog now matches the official documentation examples for each subscription type.
