# Validation Summary: How to Use Dapr Pub/Sub Bulk Subscribe

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Pub/Sub building block, bulk subscribe and bulk publish APIs)
- Python (Flask)
- Node.js (Express)
- YAML declarative subscriptions

## Sources Consulted
- Dapr official docs: Pub/Sub bulk subscribe how-to (https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-bulk-subscribe/)
- Dapr official docs: Pub/Sub bulk publish and subscribe overview (https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/)
- Dapr Pub/Sub API reference (https://docs.dapr.io/reference/api/pubsub_api/)
- Dapr proto definitions (`appcallback.proto` — `TopicEventBulkRequest`, `TopicEventBulkResponse`)
- Dapr Java and .NET SDK source code for bulk subscribe models

## Issues Found
1. **Declarative subscription apiVersion was incorrect**: The YAML snippet used `apiVersion: dapr.io/v1alpha1` but Dapr's declarative subscriptions with bulk subscribe support use `apiVersion: dapr.io/v2alpha1`. Changed to `dapr.io/v2alpha1`.

2. **Bulk publish API endpoint was outdated**: The curl example used the alpha endpoint `v1.0-alpha1/publish/bulk/...`. The bulk publish API was promoted to stable in Dapr 1.17, so the endpoint should be `v1.0/publish/bulk/...`. Updated to `v1.0`.

3. **Bulk publish request body format was incorrect**: The curl example wrapped the entries in an `{"entries": [...]}` object. The official Dapr bulk publish API expects a bare JSON array `[{...}, {...}]` as the request body. Removed the wrapping object.

4. **Bulk message envelope field name casing was incorrect**: The example envelope JSON used `"pubsubname"` (all lowercase) for the top-level field. Per proto3 JSON serialization rules, the proto field `pubsub_name` serializes to `"pubsubName"` (camelCase). Changed to `"pubsubName"`.

## Review Notes
- The programmatic subscription format, bulk subscribe configuration fields (`maxMessagesCount`, `maxAwaitDurationMs`), response format (`statuses` array with `SUCCESS`/`RETRY`/`DROP`), and the bulk message entry structure are all correct.
- The Python and Node.js code examples are syntactically correct and follow the expected patterns for Dapr HTTP callback-based subscriptions.
- The prerequisite of Dapr 1.10 or later is accurate for when bulk subscribe was first introduced (in alpha).
