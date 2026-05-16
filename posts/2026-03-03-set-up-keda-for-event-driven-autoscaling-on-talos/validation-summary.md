# Validation Summary: How to Set Up KEDA for Event-Driven Autoscaling on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- KEDA
- Helm
- RabbitMQ
- Apache Kafka
- Redis
- Prometheus
- Kubernetes Cron, HPA, Deployments, and Jobs

## Sources Consulted
- KEDA 2.19 Deploying KEDA: https://keda.sh/docs/2.19/deploy/
- KEDA 2.19 ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA 2.19 ScaledJob specification: https://keda.sh/docs/2.19/reference/scaledjob-spec/
- KEDA 2.19 RabbitMQ Queue scaler: https://keda.sh/docs/2.19/scalers/rabbitmq-queue/
- KEDA 2.19 Apache Kafka scaler: https://keda.sh/docs/2.19/scalers/apache-kafka/
- KEDA 2.19 Redis Lists scaler: https://keda.sh/docs/2.19/scalers/redis-lists/
- KEDA 2.19 Prometheus scaler: https://keda.sh/docs/2.19/scalers/prometheus/
- KEDA 2.19 Cron scaler: https://keda.sh/docs/2.19/scalers/cron/
- KEDA Helm chart values: https://raw.githubusercontent.com/kedacore/charts/main/keda/values.yaml

## Issues Found
- RabbitMQ examples used the deprecated `queueLength` metadata field. Updated the RabbitMQ ScaledObject, multi-trigger RabbitMQ trigger, and ScaledJob RabbitMQ trigger to use `mode: QueueLength` and `value`, which is the current KEDA 2.19 format.
- The Prometheus example included `metricName`, which was deprecated in KEDA 2.10 and removed from the current Prometheus scaler documentation. Removed it from the manifest.
- The Prometheus example described `activationThreshold` as scaling from zero, but the example sets `minReplicaCount: 2`. Updated the comment to say it marks the scaler active only above the threshold.

## Review Notes
- Helm and Kubernetes CLI binaries were not installed in the local environment, so command verification was performed against official KEDA documentation and the KEDA Helm chart values rather than local `--help` output.
- The cron "after hours" trigger is redundant with `minReplicaCount: 2`, but it is not technically invalid.
