# Validation Summary: How to Use CloudEvents with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, subscription routing)
- CloudEvents specification (v1.0)
- Python (FastAPI, requests library)
- Dapr Python SDK (`dapr-client`)
- YAML declarative subscriptions with CEL routing rules

## Sources Consulted
- Dapr official documentation: CloudEvents and pub/sub — https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr Pub/Sub API reference — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr message routing documentation — https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr Python SDK source code (`dapr/clients/grpc/client.py`) — `publish_event` method signature accepts `Union[bytes, str]` for `data`
- Dapr components-contrib source code — `DefaultCloudEventType = "com.dapr.event.sent"`, `DefaultCloudEventSource = "Dapr"`
- CloudEvents specification v1.0 — https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md

## Issues Found

### 1. Incorrect default CloudEvent `source` value
- **What was wrong:** The auto-wrapped CloudEvent example showed `"source": "order-service"`, implying Dapr uses the app/service name as the source. The actual default source value Dapr uses is the literal string `"Dapr"`.
- **What was changed:** Updated `"source": "order-service"` to `"source": "Dapr"` in the CloudEvent envelope example.
- **Why:** The Dapr source code defines `DefaultCloudEventSource = "Dapr"`. Showing an incorrect default could confuse readers who try to match on the source field and find it doesn't equal their app ID.

### 2. Incorrect Dapr Python SDK CloudEvent publishing example
- **What was wrong:** The example imported `from cloudevents.http import CloudEvent` and passed a `CloudEvent` object directly to `client.publish_event(data=ce)`. The Dapr Python SDK's `publish_event` method only accepts `Union[bytes, str]` for the `data` parameter, not a `CloudEvent` object. This code would raise a `ValueError` at runtime.
- **What was changed:** Replaced the example with one that constructs the CloudEvent as a plain Python dictionary and serializes it with `json.dumps()` before passing to `publish_event`. Removed the incorrect `cloudevents.http` import and added the necessary `json` and `uuid` imports.
- **Why:** The Dapr Python SDK does not integrate with the `cloudevents` Python package. CloudEvents must be serialized to a JSON string before publishing.

## Review Notes
- The `cloudevents` Python package (`cloudevents-sdk`) is a separate library not required by or integrated with the Dapr Python SDK. If a future Dapr SDK version adds native CloudEvent object support, this section may need updating.
- The routing rule CEL expressions (`event.type == "..."`) are correct per current Dapr documentation.
- CloudEvent custom extension attribute naming follows the spec (lowercase a-z, digits 0-9, max 20 chars recommended).
- The debug endpoint example imports `json` but doesn't show the import statement; this is a minor style issue, not a technical error.
