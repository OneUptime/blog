# Validation Summary: How to Use KEDA ScaledObject to Scale Based on Kafka Consumer Lag

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- KEDA ScaledObject
- KEDA Apache Kafka scaler
- Apache Kafka consumer groups and consumer lag
- Helm
- kubectl

## Sources Consulted
- KEDA Apache Kafka scaler documentation: https://keda.sh/docs/2.19/scalers/apache-kafka/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA deployment documentation: https://keda.sh/docs/latest/deploy/
- KEDA scaling deployments and activation documentation: https://keda.sh/docs/2.19/concepts/scaling-deployments/
- Kubernetes Horizontal Pod Autoscaler documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Apache Kafka consumer API documentation: https://downloads.apache.org/kafka/3.9.1/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html

## Issues Found
- Corrected the description of KEDA Kafka lag calculation from generic aggregation / average-per-partition language to total lag. The KEDA Kafka scaler documents `lagThreshold` as the target value for total lag, the sum of all partition lags.
- Corrected the Kafka scaler data source wording. The KEDA Kafka scaler reads lag from Kafka brokers, not from a monitoring system.
- Corrected the basic ScaledObject example and explanation so `lagThreshold: "100"` is described as a total lag target rather than an average lag threshold per partition.
- Corrected the `excludePersistentLag` comment. The setting excludes partitions whose current offset is unchanged from the previous polling cycle only when set to `true`; with `"false"`, persistent lag is included.
- Corrected the `allowIdleConsumers` example in the partition-aware configuration. The previous `true` value contradicted the text about capping replicas at the partition count; `"false"` preserves KEDA's default partition-count cap.
- Corrected the scale-to-zero example. KEDA activation occurs when the metric is greater than the activation threshold, so `activationLagThreshold: "0"` is the value that activates on any positive lag.
- Clarified the best-practice example for choosing `lagThreshold`, tying the threshold to backlog per replica instead of implying that total lag always clears within a fixed wall-clock time regardless of replica count.

## Review Notes
The reviewed YAML snippets are syntactically valid. KEDA also has an experimental `apache-kafka` scaler in newer documentation, but this post uses the established `kafka` scaler and remains technically relevant.
