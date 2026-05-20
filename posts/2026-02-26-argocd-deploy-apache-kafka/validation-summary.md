# Validation Summary: How to Deploy Apache Kafka with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Strimzi Kafka Operator
- Argo CD
- Kubernetes custom resources
- GitOps
- Prometheus JMX Exporter metrics

## Sources Consulted
- Strimzi downloads and supported version matrix: https://strimzi.io/downloads/
- Strimzi Helm chart repository index: https://strimzi.io/charts/index.yaml
- Strimzi 1.0.0 Deploying and Managing guide: https://strimzi.io/docs/operators/latest/deploying
- Strimzi 0.39.0 Deploying and Managing guide: https://strimzi.io/docs/operators/0.39.0/full/deploying
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/application-specification/
- Argo CD sync options reference: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/

## Issues Found
- The Strimzi operator snippet used `targetRevision: 0.39.0` with Kafka `3.7.0`. Strimzi's supported version matrix shows 0.39.0 supports Kafka 3.5.x and 3.6.x, not Kafka 3.7.0. Updated the operator to `1.0.0` and the Kafka example to a supported Kafka `4.1.0` / metadata version `4.1-IV1` pairing.
- The post presented a production-ready KRaft deployment while using Strimzi 0.39.0. Strimzi 0.39.0 documented KRaft as development/testing only and not ready for production. Updating to Strimzi 1.0.0 fixes that version-specific mismatch.
- The Strimzi custom resources used `apiVersion: kafka.strimzi.io/v1beta2`. Strimzi 1.0.0 supports only the `v1` API version for Strimzi custom resources, so the Kafka, KafkaNodePool, KafkaTopic, and KafkaUser examples were updated to `kafka.strimzi.io/v1`.
- The Strimzi operator Helm values enabled `+UseKRaft,+KafkaNodePools`, which is appropriate for older preview/beta feature gates but not needed for the current 1.0.0 examples. Removed the feature gate line.
- The Kafka resource still used older KRaft and node pool annotations. Current Strimzi KRaft deployments use Kafka and KafkaNodePool resources without those annotations, so they were removed.
- The KafkaUser ACL example used `authorization: type: simple`, but the Kafka cluster did not enable broker authorization. Added `spec.kafka.authorization.type: simple` so the User Operator ACL management example is complete.
- The architecture explanation said Strimzi translates Kafka custom resources into StatefulSets. Current Strimzi uses internal StrimziPodSet resources for Kafka pods, so the wording was updated to mention Kubernetes resources such as Deployments, Pods, Services, ConfigMaps, Secrets, and StrimziPodSets.
- The Kafka upgrade example used an old `3.8.0` target version and implied the metadata version could be advanced during the same broker binary upgrade. Updated it to the documented Kafka 4.1.0 to 4.2.0 flow: change `version` first while keeping `metadataVersion: "4.1-IV1"`, then advance metadata version to `"4.2-IV1"` after all brokers run the new version.

## Review Notes
- The external listener uses `type: loadbalancer`, which is valid but depends on a Kubernetes environment that can provision LoadBalancer services.
- The storage class `gp3` is AWS-specific; the example is valid for clusters where that StorageClass exists.
- The metrics configuration uses Prometheus JMX Exporter, which remains supported, though Strimzi also documents Strimzi Metrics Reporter as an alternative.
