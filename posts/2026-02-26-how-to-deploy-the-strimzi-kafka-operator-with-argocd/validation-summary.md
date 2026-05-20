# Validation Summary: How to Deploy the Strimzi Kafka Operator with ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Apache Kafka
- Strimzi Kafka Operator
- Helm
- KafkaTopic and KafkaUser custom resources
- KRaft

## Sources Consulted
- Strimzi downloads and supported versions: https://strimzi.io/downloads/
- Strimzi deploying and managing documentation: https://strimzi.io/docs/operators/latest/deploying
- Strimzi 1.0.0 Kafka persistent example: https://github.com/strimzi/strimzi-kafka-operator/blob/1.0.0/examples/kafka/kafka-persistent.yaml
- Strimzi 1.0.0 Helm chart values: https://github.com/strimzi/strimzi-kafka-operator/blob/1.0.0/packaging/helm-charts/helm3/strimzi-kafka-operator/values.yaml
- Strimzi 1.0.0 Kafka CRD: https://github.com/strimzi/strimzi-kafka-operator/blob/1.0.0/install/cluster-operator/040-Crd-kafka.yaml
- Strimzi 1.0.0 KafkaTopic example: https://github.com/strimzi/strimzi-kafka-operator/blob/1.0.0/examples/topic/kafka-topic.yaml
- Strimzi 1.0.0 KafkaUser example: https://github.com/strimzi/strimzi-kafka-operator/blob/1.0.0/examples/user/kafka-user.yaml
- Argo CD directory application documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD resource health customization documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/

## Issues Found
- The post used Strimzi 0.39.0, `kafka.strimzi.io/v1beta2`, ZooKeeper configuration, and Kafka 3.6.1. I updated the examples to Strimzi 1.0.0, `kafka.strimzi.io/v1`, Kafka 4.2.0, KRaft metadata, and `KafkaNodePool` resources to match current Strimzi examples and CRDs.
- The operator Helm values enabled old feature gates for KRaft and KafkaNodePools. I removed the feature gate setting because these are no longer needed in Strimzi 1.0.0.
- The Kafka cluster configured KafkaUser ACLs but did not enable Kafka broker authorization. I added `authorization.type: simple` to the Kafka resource so the KafkaUser authorization example is effective.
- The CRD Argo CD application combined `ServerSideApply=true` and `Replace=true`. I removed `Replace=true` because Argo CD documents that replace takes precedence over server-side apply and can be destructive.
- The architecture diagram still referred to ZooKeeper. I updated it to reference the KRaft metadata quorum.

## Review Notes
The examples are still production-shaped templates rather than complete production manifests. A real deployment should also review listener exposure, storage class availability, PodDisruptionBudgets, monitoring rules, backup and disaster recovery, and exact Argo CD timeout settings for the target environment.
