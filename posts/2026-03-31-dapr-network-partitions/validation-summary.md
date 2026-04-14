# Validation Summary: How to Handle Network Partitions in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (resiliency policies, service invocation, pub/sub, actors, placement service)
- Dapr Python SDK
- Apache Kafka (as Dapr pub/sub component)
- Kubernetes (StatefulSet for placement service)
- Prometheus (alerting on circuit breaker metrics)

## Sources Consulted
- Dapr Resiliency Schema Reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Circuit Breaker Policies: https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr Python SDK Documentation: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr Python SDK source (invoke_method, DaprInternalError): https://github.com/dapr/python-sdk
- Apache Kafka Pub/Sub Component Reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Placement Service Overview: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr Metrics Documentation: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md

## Issues Found
1. **Incorrect Prometheus metric name and label**: The Prometheus alert rule used `dapr_resiliency_state_count{state="open"}`, but the actual Dapr metric for circuit breaker state is `dapr_resiliency_cb_state` with a `status` label (not `state`). Fixed to `dapr_resiliency_cb_state{status="open"} > 0`.

## Review Notes
- The Resiliency YAML spec (`apiVersion: dapr.io/v1alpha1`, circuit breaker fields `maxRequests`, `timeout`, `trip` with `consecutiveFailures >= 3` syntax, and app target fields) is all correct per official docs.
- The Dapr Python SDK code is correct: `DaprClient`, `DaprInternalError`, `invoke_method` with `app_id`/`method_name`/`http_verb` parameters, and `response.data` are all valid.
- The Kafka pub/sub component spec (`pubsub.kafka`, metadata fields `brokers`, `consumerGroup`, `maxMessageBytes`) is accurate.
- The placement service description is correct -- it is deployed as a StatefulSet named `dapr-placement-server` in `dapr-system`, and 3 replicas enable HA via Raft consensus. The post describes this as "quorum for split-brain protection" which is a reasonable simplification of the underlying Raft mechanism.
