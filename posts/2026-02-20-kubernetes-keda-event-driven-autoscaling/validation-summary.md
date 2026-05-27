# Validation Summary: How to Use KEDA for Event-Driven Autoscaling in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- KEDA
- Helm
- RabbitMQ scaler
- Apache Kafka scaler
- Prometheus scaler
- Cron scaler
- KEDA ScaledObject, TriggerAuthentication, and ScaledJob CRDs

## Sources Consulted
- KEDA v2.19 Deploying KEDA documentation: https://keda.sh/docs/2.19/deploy/
- KEDA v2.19 ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA v2.19 ScaledJob specification: https://keda.sh/docs/2.19/reference/scaledjob-spec/
- KEDA v2.19 RabbitMQ Queue scaler documentation: https://keda.sh/docs/2.19/scalers/rabbitmq-queue/
- KEDA v2.19 Apache Kafka scaler documentation: https://keda.sh/docs/2.19/scalers/apache-kafka/
- KEDA v2.19 Prometheus scaler documentation: https://keda.sh/docs/2.19/scalers/prometheus/
- KEDA v2.19 Cron scaler documentation: https://keda.sh/docs/2.19/scalers/cron/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The Helm install verification listed only `keda-operator` and `keda-metrics-apiserver`. Current KEDA Helm installations also deploy the admission webhook by default, so `keda-admission-webhooks` was added to the expected pod list.
- The RabbitMQ scaler comment said `QueueLength` scaled based on "total queue length" while the example uses `protocol: amqp`. The KEDA docs note that counting unacknowledged messages requires the HTTP protocol, so the wording was changed to the more accurate "queue length."
- The scaling-flow diagram used queue-specific wording for a general KEDA flow. It was updated from "messages in queue" to trigger activity and from `messages / threshold` to `metric / threshold`.
- The ScaledJob comments implied KEDA always creates exactly one Job per message. The wording was adjusted to describe queue-depth-based job creation and the target value more accurately.

## Review Notes
The examples use current KEDA `keda.sh/v1alpha1` APIs and current scaler metadata names for KEDA v2.19. The cron example intentionally keeps `minReplicaCount: 2`, so it pre-scales during configured windows but does not scale the workload to zero outside those windows.
