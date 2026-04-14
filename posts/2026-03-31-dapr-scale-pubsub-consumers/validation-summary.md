# Validation Summary: How to Scale Dapr Pub/Sub Consumers Horizontally

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub building block, Kafka component, bulk subscribe)
- Apache Kafka (topics, partitions, consumer groups)
- KEDA (Kafka trigger, ScaledObject)
- Kubernetes (Deployments, annotations)
- Python / FastAPI (bulk message handler)

## Sources Consulted
- Dapr Kafka pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr bulk subscribe documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/
- Dapr Subscription spec: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- KEDA Kafka trigger documentation: https://keda.sh/docs/latest/scalers/apache-kafka/
- Kubernetes Deployment spec: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/

## Issues Found
1. **Missing `selector` field in Deployment spec**: The Kubernetes Deployment YAML was missing the required `spec.selector.matchLabels` field. Without this field, `kubectl apply` would reject the Deployment with a validation error. Added `selector.matchLabels.app: order-processor` to match the pod template labels.

## Review Notes
- The Subscription CRD uses `apiVersion: dapr.io/v1alpha1`, which still works but is deprecated in favor of `dapr.io/v2alpha1`. The v2alpha1 version uses `routes.default` instead of `route`. This is a minor version concern and not an error, as v1alpha1 remains functional.
- All Dapr Kafka pubsub component metadata fields (`brokers`, `consumerGroup`, `authType`, `maxMessageBytes`, `consumeRetryInterval`) are verified correct against official documentation.
- The bulk subscribe request/response format in the Python handler is correct: incoming entries have `entryId`, `event`, `contentType`; response uses `{"statuses": [...]}` with `SUCCESS`/`RETRY` status values.
- KEDA ScaledObject with `keda.sh/v1alpha1` and all Kafka trigger metadata fields (`bootstrapServers`, `consumerGroup`, `topic`, `lagThreshold`, `offsetResetPolicy`) are correct for KEDA 2.x.
- Kafka CLI commands (`kafka-topics.sh`, `kafka-consumer-groups.sh`) use correct syntax and flags.
- The technical claim about needing at least as many partitions as max replicas for full parallelism is accurate.
