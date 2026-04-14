# Validation Summary: How to Subscribe to a Dapr Topic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, subscriptions, routing rules)
- Python (FastAPI, Flask, Dapr Python SDK)
- Kubernetes (custom resources)
- CloudEvents specification

## Sources Consulted
- Dapr Pub/Sub How-To: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr Subscription Methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr Subscription Schema Reference: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Pub/Sub API Reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Message Routing: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr Python SDK Pub/Sub: https://docs.dapr.io/developing-applications/sdks/python/python-pubsub/
- CloudEvents Specification: https://github.com/cloudevents/spec

## Issues Found

1. **Deprecated API version in declarative subscription YAML** (both simple and routing examples): Changed `apiVersion: dapr.io/v1alpha1` to `apiVersion: dapr.io/v2alpha1`. The v1alpha1 API is deprecated in current Dapr versions.

2. **Incorrect field name for route in v2alpha1 declarative subscription**: Changed `spec.route: /orders/received` to `spec.routes.default: /orders/received`. The v2alpha1 schema uses a `routes` object with a `default` key, not a simple `route` string field.

3. **Routing rules example used deprecated apiVersion**: The routing rules example used `apiVersion: dapr.io/v1alpha1` but the `routes.rules` feature requires `dapr.io/v2alpha1`. Updated to v2alpha1.

4. **Programmatic subscription used deprecated `route` field**: Changed the `/dapr/subscribe` response from `"route": "/path"` (string) to `"routes": {"default": "/path"}` (object) to match the current documented API format.

5. **Incorrect description of DROP status**: The post claimed `DROP` sends messages to a dead-letter topic. In reality, `DROP` discards the message and logs a warning. Dead-letter topics are a separate feature configured via the `deadLetterTopic` field in the subscription spec, triggered after retry exhaustion — not by explicit `DROP` responses. Changed "Message dropped, sent to dead-letter topic" to "Message dropped, warning logged".

6. **Python SDK handler missing return value**: The `@app.subscribe` handler returned `None` instead of a `TopicEventResponse`. Added `from dapr.ext.grpc._response import TopicEventResponse` import and `return TopicEventResponse('success')` to match SDK conventions and ensure proper message acknowledgment.

## Review Notes
- The `import json` in the FastAPI example (line 3 of that code block) is unused but harmless. Left as-is since it does not affect correctness.
- The programmatic subscription example uses Flask while the message handler example uses FastAPI. This is fine for a tutorial showing different approaches, but readers should be aware they are separate applications.
- The Dapr Python SDK gRPC example uses `event.Data()` which returns bytes; `json.loads()` on bytes is valid in Python 3, so this is correct.
- Dead-letter topic configuration (via `deadLetterTopic` in subscription spec) is mentioned in the summary section's context but not demonstrated. This could be a useful addition in a future update.
