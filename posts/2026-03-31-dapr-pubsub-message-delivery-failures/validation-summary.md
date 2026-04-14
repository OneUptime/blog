# Validation Summary: How to Fix Dapr Pub/Sub Message Delivery Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (pub/sub building block)
- Redis Streams, Kafka, Azure Service Bus (as broker examples)
- Python (Flask) for subscriber code examples
- Kubernetes (kubectl for log inspection)
- Dapr declarative subscriptions (v2alpha1 API)
- Dead letter topics

## Sources Consulted
- Dapr Pub/Sub API Reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Pub/Sub How-To Guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr Subscription Methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr Dead Letter Topics: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/

## Issues Found

1. **HTTP 404 incorrectly described as causing retry.** The blog grouped 404 with 500 as both causing Dapr to retry. Per Dapr docs, HTTP 404 causes the message to be **dropped** (with an error log), not retried. Only 500 and other non-2xx/non-404 status codes cause retry. Fixed by separating 404 and 500 into distinct bullet points with correct behavior.

2. **DROP status shown with HTTP 204 instead of 200.** The blog stated `{"status": "DROP"}` should be returned with HTTP `204`. Per Dapr docs, all subscriber status responses (`SUCCESS`, `RETRY`, `DROP`) are communicated via an HTTP 2xx response with a JSON body — Dapr only reads the JSON status field on 2xx responses. Changed to HTTP `200`.

3. **RETRY status shown with HTTP 500 instead of 200.** The handler example returned `{"status": "RETRY"}` with HTTP 500. Dapr ignores the JSON body on non-2xx responses; a 500 triggers retry based on the HTTP status code alone, not the JSON body. The correct way to explicitly signal retry is `{"status": "RETRY"}` with HTTP 200. Changed the example to return 200.

4. **Dead letter topic behavior described as "repeatedly fail."** The blog said messages "repeatedly fail delivery" before going to dead letter. Per Dapr docs, the default behavior is immediate dead-lettering on first failure — retries before dead-lettering only happen if a resiliency policy with `maxRetries` is configured. Added clarification about this default behavior.

## Review Notes
- The publish endpoint (`POST /v1.0/publish/{pubsubname}/{topic}`) and 204 success response are correct.
- The programmatic subscription via `GET /dapr/subscribe` is correctly shown.
- The declarative subscription YAML uses the correct `apiVersion: dapr.io/v2alpha1`, and `deadLetterTopic` and `scopes` fields are valid.
- The `kubectl logs` commands for debugging are reasonable and correct.
- A future improvement could mention Dapr resiliency policies in more detail, as they control retry behavior before dead-lettering.
