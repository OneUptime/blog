# Validation Summary: How to Tune Kafka Consumer Groups for Dapr Pub/Sub

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (pub/sub building block)
- Apache Kafka (consumer groups, partitions, rebalancing)
- Kubernetes (Deployments, Dapr sidecar injection)

## Sources Consulted
- Dapr Kafka Pub/Sub Component Reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Sidecar Injector Docs: https://docs.dapr.io/concepts/dapr-services/sidecar-injector/
- Dapr Pub/Sub API Reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Components-Contrib Kafka metadata.yaml: https://github.com/dapr/components-contrib/blob/main/pubsub/kafka/metadata.yaml
- Dapr Components-Contrib Kafka metadata.go: https://github.com/dapr/components-contrib/blob/main/common/component/kafka/metadata.go

## Issues Found

1. **`fetchMessageMaxBytes` is not a valid Dapr metadata field.** Removed from the component configuration YAML. The actual Dapr fields for fetch sizing are `consumerFetchMin` and `consumerFetchDefault`.

2. **`sessionTimeout` and `heartbeatInterval` used raw millisecond numbers ("10000", "3000").** Dapr expects Go duration strings. Changed to "10s" and "3s" respectively.

3. **`maxPollIntervalMs` is not a valid Dapr metadata field.** This is a native Kafka consumer config not exposed by Dapr's pub/sub component. Removed the entire "Max Poll Interval" section.

4. **Deployment YAML incorrectly included a manual `dapr-sidecar` container.** Dapr injects the sidecar automatically via a Kubernetes mutating admission webhook when `dapr.io/enabled: "true"` is set. Rewrote the deployment YAML to show only the app container with proper annotations in the pod template metadata, and added a note explaining automatic injection.

5. **`CooperativeStickyAssignor` is not supported by Dapr.** Dapr uses IBM/Sarama (not confluent-kafka-go) and supports `range`, `sticky`, and `roundrobin` strategies via the `consumerGroupRebalanceStrategy` metadata field. Replaced the section with the correct field and valid values.

6. **`groupInstanceID` is not a valid Dapr metadata field.** Kafka static membership is not exposed by Dapr. Removed all references to `groupInstanceID` and static membership.

7. **`consumeRetryMaxElapsedTime` is not a valid Dapr metadata field.** Removed from the Processing Failures section.

8. **Retry behavior explanation was misleading.** `consumeRetryInterval` controls retries for consuming from Kafka topics, not application-level message delivery retries. Corrected the explanation and added information about Dapr's app-level retry mechanism (RETRY/DROP status responses).

## Review Notes
- The `consumerGroup` behavior explanation is slightly simplified. When `consumerGroup` is not explicitly set, Dapr falls back to `consumerID`, which defaults to the app-id. The post's claim that same app-id means same consumer group is true in practice but only as a fallback behavior.
- The Kafka CLI command (`kafka-consumer-groups.sh`) shown for monitoring consumer lag is correct and standard.
- The heartbeat-to-session-timeout ratio recommendation (1:3) is standard Kafka best practice and is accurate.
