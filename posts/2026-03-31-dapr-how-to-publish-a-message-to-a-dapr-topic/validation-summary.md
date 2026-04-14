# Validation Summary: How to Publish a Message to a Dapr Topic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub building block
- Dapr HTTP API
- Dapr Python SDK (`dapr-client`)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Redis Streams (as pub/sub broker)
- Kubernetes
- Python (`requests` library)
- Go

## Sources Consulted
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Python SDK client documentation: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr Go SDK client documentation: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr Pub/Sub component spec (Redis): https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr Bulk Publish API reference: https://docs.dapr.io/reference/api/pubsub_api/#bulk-publish-messages

## Issues Found

1. **Python SDK `publish_event` data type was incorrect**: The `data` parameter was passed as a Python `dict` (`{"orderId": "123", "item": "book"}`). The Dapr Python SDK `publish_event` method expects `data` to be `str` or `bytes`, not a `dict`. Fixed by wrapping the dict with `json.dumps()` and adding the `import json` statement.

2. **Metadata passed as HTTP headers instead of query parameters**: Both the curl and Python examples in the "Publishing with Metadata" section incorrectly passed `metadata.partitionKey` and `metadata.ttlInSeconds` as HTTP headers. According to the Dapr publish API reference, metadata must be passed as URL query parameters (e.g., `?metadata.partitionKey=user-456&metadata.ttlInSeconds=3600`). Fixed both the curl command and the Python `requests` example (moved metadata from `headers` to `params`).

3. **Bulk publish API used outdated alpha endpoint**: The bulk publish example used the path `v1.0-alpha1/publish/bulk/pubsub/orders`. The bulk publish API was promoted to stable in Dapr 1.12, and the correct endpoint is now `v1.0/publish/bulk/pubsub/orders`. Updated the path from `v1.0-alpha1` to `v1.0`.

## Review Notes
- The Redis pub/sub component YAML configuration is correct and follows current Dapr component spec conventions.
- The HTTP publish API endpoint, expected 204 status code, and error handling guidance are all accurate.
- The Go SDK example correctly marshals the struct to JSON bytes before passing to `PublishEvent`, which is the documented approach.
- The post does not specify a minimum Dapr version. All examples are now compatible with Dapr 1.12+.
