# Validation Summary: How to Configure KEDA Autoscaling in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- KEDA
- Kubernetes
- Helm
- Apache Kafka
- Prometheus
- RabbitMQ

## Sources Consulted
- KEDA deployment docs: https://keda.sh/docs/2.19/deploy/
- KEDA concepts and architecture docs: https://keda.sh/docs/2.19/concepts/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA ScaledJob specification: https://keda.sh/docs/2.19/reference/scaledjob-spec/
- KEDA Kafka scaler docs: https://keda.sh/docs/2.19/scalers/apache-kafka/
- KEDA Prometheus scaler docs: https://keda.sh/docs/2.19/scalers/prometheus/
- KEDA RabbitMQ scaler docs: https://keda.sh/docs/2.19/scalers/rabbitmq-queue/
- KEDA Cron scaler docs: https://keda.sh/docs/2.19/scalers/cron/
- KEDA authentication docs: https://keda.sh/docs/2.19/concepts/authentication/
- Rancher monitoring docs: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Rancher monitoring chart values: https://raw.githubusercontent.com/rancher/charts/release-v2.13/charts/rancher-monitoring/108.0.0%2Bup77.9.1-rancher.6/values.yaml
- KEDA Helm charts repository: https://github.com/kedacore/charts

## Issues Found
- The post pinned KEDA Helm chart `2.12.0`, which is outdated relative to the current official KEDA docs and chart releases. Updated the install example to `2.19.0`.
- The introduction and conclusion implied KEDA extends or runs alongside a separate HPA for the same workload. Updated the wording to reflect that KEDA uses Kubernetes HPA under the hood for scaling decisions.
- The architecture section treated scalers as a top-level installed component and omitted admission webhooks. Updated the description to match the current KEDA architecture and runtime components.
- The Kafka `ScaledObject` set `idleReplicaCount: 0` together with `minReplicaCount: 0`. KEDA requires `idleReplicaCount` to be less than `minReplicaCount`, so the invalid field was removed.
- The Kafka authentication example defined a `TriggerAuthentication` but the Kafka trigger did not reference it. Added `authenticationRef` to the Kafka trigger.
- The Kafka authentication secret was incomplete for SASL authentication. Added the `sasl` parameter and mapped it through `TriggerAuthentication`.
- The Prometheus scaler example used the removed `metricName` field. Removed it to match current KEDA Prometheus scaler syntax.
- The Prometheus service address was too generic for a Rancher Monitoring deployment. Updated it to the default Rancher Monitoring Prometheus service name in the `cattle-monitoring-system` namespace.
- The RabbitMQ `ScaledJob` referenced `rabbitmq-trigger-auth`, but that object was never defined in the post. Reworked the example to use the already-defined `RABBITMQ_URL` environment variable via `hostFromEnv`, which is valid for KEDA.

## Review Notes
- The cron examples are valid, but behavior depends on the exact time windows and any other triggers on the same `ScaledObject` because KEDA passes the highest desired replica count to HPA.
- KEDA 2.19 documentation states that this release targets Kubernetes 1.30 and newer, so readers should confirm their Rancher-managed cluster version before applying the examples.
