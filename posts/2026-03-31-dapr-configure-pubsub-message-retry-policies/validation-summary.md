# Validation Summary: How to Configure Pub/Sub Message Retry Policies in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency API
- Dapr Pub/Sub building block
- Dapr Declarative Subscriptions (v2alpha1)
- Dapr Bulk Subscribe
- Go (net/http for subscriber handlers)
- Kafka (as pub/sub component)
- Prometheus (for metrics monitoring)
- Kubernetes (kubectl for Kafka inspection)

## Sources Consulted
- Dapr Pub/Sub API Reference — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Resiliency Spec — https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Retry Policies — https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Resiliency Targets — https://docs.dapr.io/operations/resiliency/targets/
- Dapr Subscription Spec — https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Dead Letter Topics — https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr Bulk Subscribe — https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/
- Dapr Metrics Reference — https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Metrics Overview — https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Go SDK (service/http) — https://pkg.go.dev/github.com/dapr/go-sdk/service/http

## Issues Found

### Issue 1: Incorrect HTTP status code for RETRY response (line 59)
- **What was wrong:** The subscriber handler returned HTTP 500 with `{"status": "RETRY"}` in the JSON body. Dapr only parses the JSON body's `status` field when the HTTP response is 2xx. On a 500 response, Dapr ignores the body entirely and retries based on the non-2xx status code alone. This conflated two different retry mechanisms and was misleading.
- **What was changed:** Changed `w.WriteHeader(500)` to `w.WriteHeader(200)` in the RETRY handler. With HTTP 200, Dapr correctly reads the `{"status": "RETRY"}` body and schedules a retry. This is the canonical way to use Dapr's subscriber status codes (SUCCESS, RETRY, DROP).
- **Why:** Per the Dapr Pub/Sub API reference, the three status values (SUCCESS, RETRY, DROP) are only parsed from 2xx responses. Returning a non-2xx code like 500 triggers retry via a different mechanism (HTTP error handling), making the JSON body redundant and the example misleading.

### Issue 2: Non-existent Prometheus metric name (line 141)
- **What was wrong:** The Prometheus query used `dapr_component_pubsub_ingress_retry_total`, which is not a real Dapr metric. The actual Dapr pub/sub component metrics are: `dapr_component_pubsub_ingress_count`, `dapr_component_pubsub_ingress_latencies`, `dapr_component_pubsub_egress_count`, and `dapr_component_pubsub_egress_latencies`.
- **What was changed:** Replaced with `dapr_component_pubsub_ingress_count{app_id="order-service",success="false"}` which tracks failed message deliveries (i.e., deliveries that would trigger retries). Updated the comment to clarify what the metric measures.
- **Why:** The `dapr_component_pubsub_ingress_count` metric with the `success` label is the real Dapr metric for tracking pub/sub ingress, and filtering by `success="false"` captures failed deliveries that trigger retry behavior.

## Review Notes
- The `duration` field in the exponential retry policy is primarily documented for the `constant` policy. For `exponential`, official examples typically use only `maxInterval` and `maxRetries`. Including `duration` is not incorrect (it may act as the initial backoff interval), but readers should be aware it is not prominently featured in Dapr's exponential policy examples.
- The Dapr resiliency metrics ecosystem is still evolving. There is an open feature request (dapr/dapr#7476) for more granular resiliency metrics including per-policy retry counters. Future Dapr versions may provide more specific retry metrics.
- The dead letter handler code snippet uses `fmt.Printf` and `saveToDeadLetterStore` without imports or definitions, which is acceptable for a code snippet but readers should note these are not self-contained.
