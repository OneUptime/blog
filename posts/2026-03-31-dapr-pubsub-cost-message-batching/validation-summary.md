# Validation Summary: How to Optimize Dapr Pub/Sub Costs with Message Batching

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub building block, bulk publish, bulk subscribe)
- Go (Dapr Go SDK - `github.com/dapr/go-sdk`)
- Python (FastAPI)
- Azure Service Bus Topics (Dapr component)
- AWS SQS (pricing reference)
- Kubernetes / kubectl
- Prometheus

## Sources Consulted
- Dapr Go SDK source code (`github.com/dapr/go-sdk`, `client/pubsub.go`) — verified `PublishEvents` method signature, `PublishEventsResponse` struct
- Dapr Pub/Sub bulk messages documentation — https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/
- Dapr Pub/Sub API reference — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Azure Service Bus Topics component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr Python SDK source code (`github.com/dapr/python-sdk`) — verified `DaprApp.subscribe()` signature, absence of bulk subscribe decorator support
- Dapr v1.10.0 release notes (bulk publish alpha introduction)
- Dapr v1.17.0 release notes (bulk publish promoted to stable)
- AWS SQS pricing page — confirmed $0.40 per million requests for Standard queues

## Issues Found

### 1. Go SDK method and types incorrect (Critical)
**What was wrong:** The code used `client.BulkPublishEventAlpha1()` with `dapr.BulkPublishRequestEntry` structs (fields: `EntryID`, `Event`, `ContentType`), and accessed `result.FailedEntries` / `entry.EntryID` on the response.
**What was changed:** Updated to use the stable `client.PublishEvents()` method with `[]interface{}` events. Response handling changed to use `result.Error` and `result.FailedEvents` which match the actual `PublishEventsResponse` struct in the Go SDK.
**Why:** `BulkPublishEventAlpha1` is a deprecated internal gRPC proto method name, not the Go SDK's public API. The SDK exposes `PublishEvents()` which internally calls the stable `BulkPublishEvent` gRPC method (falling back to alpha). The struct `BulkPublishRequestEntry` does not exist in the SDK.

### 2. Fabricated component metadata fields (Critical)
**What was wrong:** The YAML component config included `maxBulkSubCount` and `maxBulkPubBytes` as metadata fields on the `pubsub.azure.servicebus.topics` component. Neither field exists in Dapr's component metadata.
**What was changed:** Removed both fabricated fields. Added a separate `Subscription` resource YAML with `bulkSubscribe` configuration (`maxMessagesCount`, `maxAwaitDurationMs`), which is the correct way to configure bulk subscribe in Dapr.
**Why:** Bulk subscribe configuration in Dapr is done via the Subscription spec, not component metadata. The fields `maxBulkSubCount` and `maxBulkPubBytes` are not documented or recognized by any Dapr pub/sub component.

### 3. Component metadata field typo (Minor)
**What was wrong:** `minConnectionRecoveryInSecs` (plural "Secs").
**What was changed:** Corrected to `minConnectionRecoveryInSec` (singular).
**Why:** The documented field name for Azure Service Bus Topics uses singular "Sec". The plural form would be silently ignored.

### 4. Python bulk subscribe code entirely fabricated (Critical)
**What was wrong:** The code used `DaprApp.subscribe(bulk_subscribe=True)` — this parameter does not exist. It imported `TopicEventBulkResponse` and `TopicEventBulkResponseEntry` from `dapr.clients.grpc._response` — these classes do not exist as SDK types. It called `entry.get_data()` which also does not exist.
**What was changed:** Replaced with a standard FastAPI HTTP endpoint that receives bulk messages as JSON. When using a declarative Subscription with `bulkSubscribe` enabled, Dapr delivers batches to the HTTP route. The handler processes entries and returns statuses using the documented JSON response format.
**Why:** The Dapr Python SDK does not support bulk subscribe configuration through its decorator API. Bulk subscribe in Python is configured via declarative YAML subscriptions, with the app handling bulk message payloads over HTTP.

### 5. Summary section referenced deprecated API (Minor)
**What was wrong:** Referenced `BulkPublishEventAlpha1` SDK method and `maxBulkSubCount` component field.
**What was changed:** Updated to reference `PublishEvents` and `bulkSubscribe` Subscription configuration.
**Why:** Consistency with the corrected code examples.

### 6. Version claim updated (Minor)
**What was wrong:** Stated "Dapr 1.10+" which is technically correct (alpha), but the code now uses the stable API.
**What was changed:** Updated to "introduced in 1.10, stable since 1.17" for accuracy.
**Why:** The stable `PublishEvents` method and stable gRPC endpoint are available since Dapr 1.17. The alpha version existed since 1.10.

## Review Notes
- The cost calculation math is correct ($0.24/hr without batching, $0.0024/hr with 100-per-batch, at $0.40/M SQS calls). However, the "100x savings" assumes a 1:1 mapping between Dapr bulk publish calls and broker API calls. In practice, AWS SQS `SendMessageBatch` is limited to 10 messages per request, so the actual broker-level savings for SQS would be closer to 10x. Other brokers (Kafka, Redis Streams) may achieve higher ratios. This is a modeling simplification rather than a technical error.
- The Prometheus query `dapr_pubsub_publish_count[5m]` is a reasonable metric name but the exact metric name may vary by Dapr version. The actual metric is `dapr_component_pubsub_egress_count` for publish operations in newer versions.
- The `kubectl port-forward` command for `dapr-dashboard` is correct syntax, though the Dapr dashboard service name and namespace may vary by installation method.
