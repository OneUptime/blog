# Validation Summary: How to Apply Resiliency Policies to Pub/Sub in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (resiliency policies, pub/sub building block)
- Kubernetes (kubectl for log inspection)
- Apache Kafka (as the pub/sub broker example)
- Node.js / Express (JavaScript subscriber example)
- Go (Go subscriber example)
- Prometheus (metrics monitoring)
- YAML (Dapr Resiliency and Subscription CRD configuration)

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency Targets: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Pub/Sub Overview: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/
- Dapr Pub/Sub API Reference (subscriber response statuses): https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Pub/Sub Dead Letter Topics: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr Subscription Spec (v2alpha1): https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr Metrics Reference: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr source code (retry fields): https://github.com/dapr/kit/blob/main/retry/retry.go

## Issues Found

1. **JavaScript RETRY response used HTTP 500 instead of 200** (Medium severity)
   - **What was wrong:** The JavaScript example used `res.status(500).send({ status: 'RETRY' })`. When Dapr receives a non-2xx HTTP response, it ignores the JSON body entirely and retries based solely on the HTTP status code. The `{"status": "RETRY"}` in the body was therefore not being honored — the retry happened only because of the 500 status. This is misleading because if someone changed the body to `{"status": "DROP"}` while keeping status 500, the message would still be retried, not dropped.
   - **What was changed:** Changed `res.status(500)` to `res.status(200)` so Dapr reads the JSON body and honors the `RETRY` status as intended.
   - **Why:** Dapr only inspects the response body (`status` field) when the HTTP status code is 2xx. The three valid body statuses (SUCCESS, RETRY, DROP) are only meaningful with a 200 response.

2. **Subscription used deprecated apiVersion v1alpha1** (Medium severity)
   - **What was wrong:** The dead-letter topic Subscription example used `apiVersion: dapr.io/v1alpha1`, which is deprecated.
   - **What was changed:** Updated to `apiVersion: dapr.io/v2alpha1`.
   - **Why:** `v2alpha1` is the current Subscription API version in Dapr.

3. **Subscription spec mixed v1alpha1 and v2alpha1 field conventions** (Medium severity)
   - **What was wrong:** The Subscription used `route: /orders` (a v1alpha1 field) alongside `deadLetterTopic` (v2alpha1 camelCase). In v2alpha1, routing uses the `routes` field with a nested `default` key.
   - **What was changed:** Changed `route: /orders` to `routes:\n    default: /orders` to match the v2alpha1 spec.
   - **Why:** Ensures internal consistency with the v2alpha1 apiVersion and follows current Dapr documentation conventions.

## Review Notes
- The circuit breaker `trip` expression uses `consecutiveFailures >= 5` while official Dapr docs use `consecutiveFailures > 5` as the example convention. Both are valid CEL expressions, but they have different trigger thresholds (5 vs 6 consecutive failures). Left as-is since it is technically correct and the author may have intentionally chosen `>= 5`.
- The exponential retry fields `initialInterval`, `multiplier`, and `randomizationFactor` used in the blog are valid (confirmed in Dapr source code) but are not fully documented in the official Dapr docs. The blog is actually more thorough than the official documentation in this regard.
- The Prometheus metric prefix `dapr_component_pubsub` is confirmed correct, with metrics like `dapr_component_pubsub_ingress_count` and `dapr_component_pubsub_egress_count`.
- The Resiliency CRD structure, including `inbound`/`outbound` targeting for pub/sub components, is confirmed correct per official documentation.
