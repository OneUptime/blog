# Validation Summary: How to Configure Pub/Sub Message Batching in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub building block (bulk publish and bulk subscribe)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Apache Kafka (as pub/sub component)
- Go (programming language)

## Sources Consulted
- Dapr Bulk Publish and Subscribe documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Subscription methods documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr Go SDK source code: https://github.com/dapr/go-sdk (client/pubsub.go)

## Issues Found

### 1. Bulk Publish API endpoint used alpha version prefix
- **What was wrong:** The curl example used `v1.0-alpha1` in the API URL (`/v1.0-alpha1/publish/bulk/...`). The bulk publish API has graduated from alpha to stable.
- **What was changed:** Updated to `v1.0` (`/v1.0/publish/bulk/...`).
- **Why:** The stable API is the correct endpoint for current Dapr versions.

### 2. Response format included nonexistent `invalidEntries` field
- **What was wrong:** The bulk publish response example included `"invalidEntries": []`, which is not part of the Dapr bulk publish API response.
- **What was changed:** Removed the `invalidEntries` field from the response example.
- **Why:** The Dapr API only returns `failedEntries` in the response body. The `invalidEntries` field does not exist.

### 3. Go SDK used incorrect type and method names
- **What was wrong:** The Go code used `dapr.BulkPublishEventEntry` (struct), `Event` (field), `client.BulkPublishEvents()` (method), and `result.FailedEntries` (response field) -- none of which exist in the current Go SDK.
- **What was changed:** Updated to the correct current API: `dapr.PublishEventsEvent` (struct), `Data` (field, type `[]byte`), `client.PublishEvents()` (method), and `result.FailedEvents` (response field). Also added `encoding/json` import and JSON marshaling for the `Data` field since it expects `[]byte`, not a raw struct.
- **Why:** The blog used names that don't match any version of the Go SDK. The current stable API uses the `PublishEvents*` naming convention.

## Review Notes
- A fully successful bulk publish returns HTTP 204 No Content (empty body). The JSON response with `failedEntries` only appears on partial failure. The blog's text ("The response includes per-entry status") could be more precise, but is not strictly wrong since partial failure is the interesting case.
- The bulk subscribe handler response supports three status values: `SUCCESS`, `RETRY`, and `DROP`. The blog example only uses `SUCCESS` and `RETRY`, which is fine for a tutorial but readers should know `DROP` is also available for messages that should be discarded.
- The subscription YAML uses `apiVersion: dapr.io/v2alpha1` which is correct for declarative subscriptions with bulk subscribe support.
- The tuning table values (maxMessagesCount: 10/500, maxAwaitDurationMs: 100/5000) are reasonable example configurations. The Dapr defaults are maxMessagesCount=100 and maxAwaitDurationMs=1000.
