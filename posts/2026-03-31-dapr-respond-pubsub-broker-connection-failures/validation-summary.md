# Validation Summary: How to Respond to Dapr Pub/Sub Broker Connection Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub building block
- Apache Kafka (as pub/sub broker)
- RabbitMQ (as pub/sub broker)
- Dapr Resiliency policies (retries, circuit breakers)
- Dapr Subscription CRD and dead letter topics
- Kubernetes (kubectl, NetworkPolicy, Services)

## Sources Consulted
- Dapr Kafka pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Resiliency spec: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Subscription spec: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Component spec: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Dead Letter Topics: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/

## Issues Found

1. **Deprecated `authRequired` metadata field in Kafka component configuration (line 64)**
   - **What was wrong:** The post used `authRequired: "false"` which has been deprecated since Dapr v1.6.
   - **What was changed:** Replaced with `authType: "none"`, which is the current recommended field.
   - **Why:** The `authRequired` field was deprecated in favor of `authType` which supports more authentication modes (`none`, `password`, `mtls`, `oidc`, `awsiam`). Using the deprecated field may cause warnings or stop working in future Dapr versions.

2. **Outdated Subscription API version and routing syntax (lines 129-139)**
   - **What was wrong:** The Subscription CRD used `apiVersion: dapr.io/v1alpha1` with the `route` field, which is deprecated.
   - **What was changed:** Updated to `apiVersion: dapr.io/v2alpha1` and changed `route: /orders/process` to `routes.default: /orders/process`.
   - **Why:** The v1alpha1 Subscription API is deprecated in favor of v2alpha1, which uses a `routes` object with a `default` field and optional conditional `rules` for content-based routing.

## Review Notes
- The Resiliency CRD (Component and Resiliency both use `dapr.io/v1alpha1`) is correct and current.
- All kubectl commands use correct resource names and syntax.
- The Kafka broker verification commands and RabbitMQ status check are accurate.
- The network connectivity test using busybox with `nc` is a valid troubleshooting approach.
- The circuit breaker configuration fields (`maxRequests`, `interval`, `timeout`, `trip`) and retry policy fields (`policy`, `duration`, `maxInterval`, `maxRetries`) are all correct per the current Dapr Resiliency spec.
- The `deadLetterTopic` field is correctly used and remains valid in the v2alpha1 Subscription spec.
