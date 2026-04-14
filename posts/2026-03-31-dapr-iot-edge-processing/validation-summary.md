# Validation Summary: How to Build IoT Edge Processing with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (bindings, pub/sub, sidecar)
- MQTT v3 (via Dapr `bindings.mqtt3` and `pubsub.mqtt3` components)
- Python / Flask (edge processing service)
- Go (cloud aggregator subscriber)
- Kubernetes (DaemonSet deployment with Dapr annotations)

## Sources Consulted
- Dapr MQTT3 Binding reference: https://docs.dapr.io/reference/components-reference/supported-bindings/mqtt3/
- Dapr MQTT3 Pub/Sub reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-mqtt3/
- Dapr Publish API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Pub/Sub CloudEvents documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr Input Bindings documentation: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-triggers/

## Issues Found
1. **Go subscriber did not handle CloudEvent envelope (fixed):** The `alertHandler` in the Go cloud aggregator was decoding the HTTP request body directly into an `Alert` struct. However, Dapr pub/sub delivers messages wrapped in a CloudEvent envelope by default, with the actual payload inside the `data` field. The original code would have produced an `Alert` with all zero/empty values. Fixed by adding a `CloudEvent` wrapper struct and extracting `event.Data` to get the alert.

## Review Notes
- The Python code imports `json` at the top level but never uses it (Flask's `request.get_json()` and `jsonify` handle JSON). This is dead code but does not cause runtime errors.
- The Python code imports `requests` inside the handler function rather than at the top of the file. This works but is unconventional; in a production service the import should be at module level.
- All Dapr component types (`bindings.mqtt3`, `pubsub.mqtt3`), metadata fields (`url`, `topic`, `consumerID`), API endpoints, and Kubernetes annotations are correct and current.
- The programmatic subscription format in the Go code correctly uses `pubsubname`, `topic`, and `route` fields.
- The DaemonSet Kubernetes manifest with Dapr sidecar annotations is valid.
