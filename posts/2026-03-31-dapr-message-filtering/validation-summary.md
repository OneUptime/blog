# Validation Summary: How to Implement Message Filtering with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Pub/Sub
- Dapr Subscription routing rules (CEL expressions)
- Apache Kafka (as pub/sub broker)
- Python / Flask (subscriber application)
- CloudEvents specification
- Dapr CLI / HTTP API

## Sources Consulted
- Dapr docs: How to route messages to different event handlers — https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr docs: Pub/Sub overview — https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/
- Dapr docs: Apache Kafka component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr docs: Subscription methods — https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr docs: Pub/Sub API reference (publish, subscribe, status codes)

## Issues Found

1. **Missing `int()` cast in declarative subscription match expression**: The declarative subscription YAML used `event.data.amount > 1000` for numeric comparison. Official Dapr docs consistently use `int()` to cast data fields for numeric comparisons (e.g., `int(event.data.amount) > 10000`). Fixed to `int(event.data.amount) > 1000`.

2. **Incorrect CloudEvent data access in handler code**: The `/large-payments` handler accessed `event.get('amount')` and the `/failed-payments` handler accessed `event.get('paymentId')` directly from the top-level request JSON. However, Dapr delivers the full CloudEvent envelope to subscribers by default, so the payload data is nested under the `data` field. Fixed both handlers to first extract `data = event.get('data', {})` and then access fields from the `data` dict.

## Review Notes
- The declarative subscription YAML omits a `default` route under `routes`, while the programmatic subscription includes one (`/ignored`). This is valid — Dapr simply won't deliver unmatched messages if no default is specified — but the inconsistency between the two examples could confuse readers.
- Dapr's `event.data.*` access in CEL expressions only works when the data payload is actual nested JSON, not a JSON-escaped string. The blog does not mention this limitation. This is a minor omission, not an error.
- The `DROP` status, `SUCCESS`/`RETRY` statuses, Subscription CRD API version (`dapr.io/v2alpha1`), Kafka component metadata fields (`brokers`, `consumerGroup`), publish endpoint, and CloudEvents content type are all correct per official documentation.
