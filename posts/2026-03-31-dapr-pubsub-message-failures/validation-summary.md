# Validation Summary: How to Handle Message Processing Failures in Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — Pub/Sub building block
- Dapr Resiliency policies (retry, timeout)
- Dapr Dead Letter Topics
- Dapr programmatic and declarative subscriptions
- Express.js (Node.js)
- Kubernetes (kubectl)
- Prometheus / Grafana (observability)

## Sources Consulted
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr subscription methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr dead letter topics: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr resiliency overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr resiliency retry policies: https://docs.dapr.io/operations/resiliency/policies/
- Dapr observability / metrics: https://docs.dapr.io/operations/observability/metrics/

## Issues Found

### Issue 1: Incorrect 404 status code behavior
- **What was wrong:** The post stated that HTTP `404` causes Dapr to retry the message. According to the Dapr API reference, a `404` response causes the message to be **dropped** (error is logged, message is discarded). Only other non-2xx status codes (e.g., `500`) trigger retries.
- **What was changed:** Updated the status code list to correctly state that `404` drops the message, and clarified that other non-success codes (e.g., `500`) trigger retries.
- **Why:** This is a significant behavioral difference — incorrectly returning 404 would silently lose messages instead of retrying them, which could cause data loss in production.

### Issue 2: Incorrect Prometheus metric names
- **What was wrong:** The post referenced `dapr_pubsub_incoming_messages_total` with labels `result="fail"`, `result="retry"`, and `result="drop"`. This metric name does not exist in Dapr's documented metrics. The actual documented metric for pub/sub ingress is `dapr_component_pubsub_ingress_count`.
- **What was changed:** Updated the metric names to `dapr_component_pubsub_ingress_count` with `status` label values (`success`, `drop`, `retry`).
- **Why:** Using non-existent metric names would cause empty Prometheus queries, making the monitoring section non-functional.

## Review Notes
- The programmatic subscription example uses `route` (singular string) rather than the newer `routes` (object with `default` key). The singular `route` format is still supported by Dapr for backward compatibility, but the `routes` object format is the currently documented recommendation. This is not incorrect but could be updated in a future revision.
- The Resiliency YAML uses `duration: 1s` with `policy: exponential`, which is valid — `duration` serves as the initial backoff interval for exponential retry policies.
- The dead letter subscription YAML correctly uses `apiVersion: dapr.io/v2alpha1` and places `deadLetterTopic` under `spec` and `scopes` at the top level, matching the official docs.
- All JavaScript/Express code examples are syntactically correct and demonstrate proper patterns for Dapr pub/sub handlers.
