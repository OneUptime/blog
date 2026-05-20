# Validation Summary: How to Deploy Strimzi Kafka with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache Kafka
- Strimzi Kafka Operator
- Kafka KRaft mode
- KafkaNodePool, KafkaTopic, and KafkaUser custom resources
- Argo CD Applications and custom health checks
- Helm
- Kubernetes

## Sources Consulted
- Strimzi 0.43.0 Deploying and Managing documentation: https://strimzi.io/docs/operators/0.43.0/deploying
- Strimzi 0.43.0 Custom Resource API Reference: https://strimzi.io/docs/operators/0.43.0/configuring
- Strimzi Helm chart 0.43.0 values and templates from the official release artifact: https://github.com/strimzi/strimzi-kafka-operator/releases/download/0.43.0/strimzi-kafka-operator-helm-3-chart-0.43.0.tgz
- Argo CD Helm application documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD custom resource health check documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/

## Issues Found
- The Strimzi Helm values commented "Watch all namespaces" but only set `watchNamespaces: []`. In the Strimzi 0.43.0 Helm chart, an empty `watchNamespaces` without `watchAnyNamespace: true` makes the operator watch only its own namespace. Added `watchAnyNamespace: true` so the operator can reconcile the Kafka resources in the `streaming` namespace.
- The Strimzi Helm values included `featureGates: "+UseKRaft"`. In Strimzi 0.43.0, `UseKRaft` is already GA and permanently enabled; KRaft is selected on the Kafka resource with the `strimzi.io/kraft: enabled` annotation. Removed the unnecessary feature gate setting.
- The guide creates `KafkaUser` ACLs with `authorization.type: simple`, but the Kafka cluster did not enable simple broker authorization. Added `spec.kafka.authorization.type: simple` so the ACL examples are effective.

## Review Notes
- The Strimzi 0.43.0 examples and API reference support `kafka.strimzi.io/v1beta2`, Kafka 3.8.0, KRaft annotations, `KafkaNodePool` roles, persistent-claim storage, JMX Prometheus metrics configuration, `KafkaTopic`, and `KafkaUser` resources as shown.
- Argo CD Application syntax, Helm chart source fields, sync options, retry policy, and custom Lua health check structure match Argo CD documentation.
