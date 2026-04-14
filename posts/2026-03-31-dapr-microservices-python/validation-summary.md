# Validation Summary: How to Build Microservices with Dapr and Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Python
- Flask
- Dapr Python SDK (`dapr-client`)
- Pub/Sub messaging (CloudEvents)
- Dapr State Store
- Kubernetes (deployment annotations)

## Sources Consulted
- Dapr CloudEvents documentation (https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/)
- Dapr Python SDK client documentation (https://docs.dapr.io/developing-applications/sdks/python/python-client/)
- Dapr Pub/Sub API reference (https://docs.dapr.io/reference/api/pubsub_api/)
- Dapr subscription methods documentation (https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/)
- Dapr Python SDK source code (`DaprClient.save_state`, `publish_event`, `get_state` signatures)

## Issues Found
- **Bug in inventory service CloudEvent data handling**: The subscriber's `handle_order` endpoint used `json.loads(body.get("data", "{}"))` to extract the order from the incoming CloudEvent. When Dapr delivers a pub/sub message with `datacontenttype: application/json`, the `data` field in the CloudEvent body is already a parsed JSON object (dict), not a JSON string. Calling `json.loads()` on a dict raises a `TypeError`. Fixed to `body.get("data", {})`, which correctly handles the already-parsed dict.

## Review Notes
- The introduction and description mention "service invocation" as a covered topic, but the code only demonstrates pub/sub messaging and state management. Service invocation (i.e., calling one service from another via Dapr's invoke API) is not shown. This is a content gap but not a code error.
- The programmatic subscription endpoint uses the `route` field (v1alpha1 format), which is the older but still supported format. The newer v2alpha1 format uses `routes` with `default` and `rules` sub-fields. Both work, but future readers may want to use the newer format.
- The Kubernetes deployment YAML is intentionally minimal, showing only the Dapr-relevant annotations. This is appropriate for a blog snippet.
- The `import json` in `inventory-service/app.py` is no longer needed after the fix (it was only used for the removed `json.loads` call), but it is still used indirectly by Flask's `jsonify` and doesn't cause harm, so it was left in place.
