# Validation Summary: How to Use Dapr with Azure Storage Queues

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (bindings API)
- Azure Storage Queues
- Azure CLI
- Python (Flask, requests)
- Kubernetes (for secret management)
- YAML (Dapr component configuration)

## Sources Consulted
- Dapr Azure Storage Queues binding specification: https://docs.dapr.io/reference/components-reference/supported-bindings/storagequeues/
- Dapr supported pub/sub component list: https://docs.dapr.io/reference/components-reference/supported-pubsub/
- Dapr bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr input bindings documentation: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-triggers/
- Azure Storage Queues documentation: https://learn.microsoft.com/en-us/azure/storage/queues/
- Azure Service Bus tiers and quotas: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-quotas

## Issues Found

1. **CRITICAL — Wrong Dapr component type (pub/sub vs. binding):** The post used `pubsub.azure.storagequeues` as the component type and framed everything around the Dapr pub/sub API. Azure Storage Queues is **not** a Dapr pub/sub component — it is only available as an input/output **binding** (`bindings.azure.storagequeues`). Changed the component type, all API endpoints, and the post framing from pub/sub to bindings.

2. **CRITICAL — Incorrect pub/sub API usage:** The publish code used `/v1.0/publish/storagequeuepubsub/order-events` (pub/sub endpoint). Changed to `/v1.0/bindings/orderqueue` with the correct binding request format (`{"operation": "create", "data": ...}`).

3. **CRITICAL — Incorrect subscribe pattern:** The subscriber code used the `/dapr/subscribe` endpoint with pub/sub subscription config and CloudEvent-style `event.get('data')` unwrapping. Changed to the input binding pattern where Dapr invokes a route matching the binding component name (`/orderqueue`), and the request body is the message data directly. Changed response pattern from `{"status": "SUCCESS"}`/`{"status": "RETRY"}` (pub/sub) to HTTP status codes (200 for success, 500 for retry).

4. **HIGH — Wrong metadata field names:** `storageAccount` → `accountName`, `storageAccessKey` → `accountKey`, `queueEndpointUrl` → `endpoint`. These are the correct field names per the Dapr binding spec.

5. **HIGH — Fabricated metadata fields:** Removed `storageConnectionString` and `maxRetriableErrorsPerSecond` which do not exist in the Dapr Azure Storage Queues binding specification.

6. **HIGH — Missing required field:** Added `queueName: order-events` to the component metadata, which is required for the binding.

7. **MEDIUM — Wrong TTL mechanism:** The post used an HTTP header `dapr-ttlinseconds` for per-message TTL. Changed to use the binding metadata field `ttlInSeconds` within the binding invocation request body.

8. **LOW — Inaccurate retention claims:** Updated Storage Queues retention from "Up to 7 days" to "Default 7 days (configurable up to indefinite)" since API version 2017-07-29 supports unlimited TTL. Updated Service Bus retention from "Up to 14 days" to "Up to 14 days (Basic), unlimited (Standard/Premium)".

9. **LOW — Tags and description:** Changed tag "Pub/Sub" to "Bindings" and updated the description to reference bindings instead of pub/sub, matching the corrected content.

## Review Notes
- The component name was changed from `storagequeuepubsub` to `orderqueue` to reflect that this is a binding, not pub/sub. The binding name also determines the input route, so a shorter, clearer name is more practical.
- The `visibilityTimeout` value format `"30s"` is correct — Dapr accepts Go-style duration strings for this field.
- The Azure CLI commands for creating a storage account and queue are correct.
- If a reader wants pub/sub semantics (topic fan-out, subscription routing), they should use Azure Service Bus with `pubsub.azure.servicebus.queues` or `pubsub.azure.servicebus.topics` instead.
- The binding abstraction is not as seamless for backend swapping as pub/sub — switching from a binding to pub/sub would require API changes in application code. The summary was adjusted accordingly.
