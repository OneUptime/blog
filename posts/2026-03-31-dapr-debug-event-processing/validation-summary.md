# Validation Summary: How to Debug Event Processing Issues in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar, pub/sub, metadata API, dashboard)
- Kubernetes (kubectl, annotations, deployments, network policies)
- Apache Kafka (console consumer, dead-letter topics)
- RabbitMQ (rabbitmqadmin CLI)
- Python (requests library, Dapr HTTP API)
- W3C Trace Context (traceparent header)
- Jaeger / Zipkin (distributed tracing)
- CloudEvents specification

## Sources Consulted
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/
- Dapr Dashboard CLI reference: https://docs.dapr.io/reference/cli/dapr-dashboard/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- CloudEvents specification: https://cloudevents.io/

## Issues Found

### 1. Incorrect metadata API expected output format
**What was wrong:** The expected output of `jq '.subscriptions'` was shown wrapped in an object `{"subscriptions": [...]}`. Since `jq '.subscriptions'` extracts the field value, the output should be the array directly. Additionally, the subscription entry used the field name `routes` with a `default` key, but current Dapr versions use `rules` (an array of objects with `path` fields).
**What was changed:** Replaced the object-wrapped output with a bare JSON array and changed `routes: { default: "/orders/placed" }` to `rules: [{ path: "/orders/placed" }]`.
**Why:** The `jq` command extracts the value at the key, returning just the array. The `rules` field name and structure matches the current Dapr metadata API response format.

### 2. Invalid hex characters in W3C traceparent trace-id
**What was wrong:** The trace-id `debugtraceid12345678901234567890` contains characters `g` and `t`, which are not valid hexadecimal characters (only 0-9 and a-f are allowed per the W3C Trace Context specification). A Dapr sidecar or tracing backend would reject or ignore this malformed traceparent.
**What was changed:** Replaced with `abcd1234abcd1234abcd1234abcd1234`, which is 32 valid hex characters and still recognizable as a debug trace ID.
**Why:** The W3C Trace Context specification requires trace-id to be exactly 32 lowercase hexadecimal characters.

### 3. Incorrect use of `publish_metadata` for W3C trace context
**What was wrong:** The Python example used the Dapr Python SDK's `publish_metadata` parameter to pass a `traceparent` header. The `publish_metadata` parameter maps to component-level metadata (e.g., Kafka partition keys, TTL values) and is not the mechanism for W3C trace context propagation. The traceparent header must be passed at the transport level (HTTP header or gRPC metadata).
**What was changed:** Replaced the Dapr Python SDK example with a `requests`-based HTTP call to the Dapr publish API, passing `traceparent` as a proper HTTP header. This correctly propagates the W3C trace context through Dapr's HTTP API.
**Why:** The Dapr HTTP API properly handles W3C trace context via the `traceparent` HTTP header, making this the most reliable approach for debugging with a known trace ID.

## Review Notes
- The dead-letter queue section shows how to inspect dead-letter topics but does not show how to configure dead-letter topics in Dapr (via the `deadLetterTopic` field in subscription metadata). Users may need to consult the Dapr docs for setup.
- The Kafka component YAML shown does not include dead-letter configuration, which could be confusing since the next code block inspects a dead-letter topic.
- The CloudEvents test payload in the "Test Subscription Endpoint Directly" section is a simplified envelope. A real Dapr-delivered event would include additional fields like `datacontenttype`, `pubsubname`, `topic`, and `traceid`, but the simplified version is sufficient for endpoint testing.
- All kubectl commands, Dapr CLI commands, Kafka consumer commands, and RabbitMQ admin commands are syntactically correct.
