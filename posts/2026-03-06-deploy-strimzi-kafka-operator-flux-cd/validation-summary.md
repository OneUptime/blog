# Validation Summary: How to Deploy Strimzi Kafka Operator with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Strimzi Kafka Operator
- Apache Kafka
- Flux CD
- Kubernetes
- Helm / OCI Helm charts
- Kustomize
- KafkaTopic and KafkaUser custom resources

## Sources Consulted
- Strimzi 1.0.0 documentation: https://strimzi.io/docs/operators/latest/deploying
- Strimzi downloads and supported versions: https://strimzi.io/downloads/
- Strimzi 1.0.0 custom resource API reference: https://strimzi.io/docs/operators/latest/configuring
- Strimzi 1.0.0 example Kafka custom resources: https://github.com/strimzi/strimzi-kafka-operator/tree/1.0.0/examples
- Strimzi 1.0.0 Helm chart values: https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/1.0.0/packaging/helm-charts/helm3/strimzi-kafka-operator/values.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- Updated Strimzi examples from `kafka.strimzi.io/v1beta2` to `kafka.strimzi.io/v1`, because Strimzi 1.0.0 only supports the v1 API for custom resources.
- Updated the Strimzi operator chart version from `0.43.x` to `1.0.x`, Kafka from `3.7.0` to `4.2.0`, and Kubernetes prerequisite from `v1.26` to `v1.30`, matching the current Strimzi 1.0.0 support matrix.
- Changed the HelmRepository to use the official OCI Helm chart source `oci://quay.io/strimzi-helm` with `type: oci`.
- Removed `+UseKRaft,+KafkaNodePools` feature gates because both features are GA and no longer configured that way for current Strimzi.
- Removed the obsolete KRaft and node-pool annotations from the `Kafka` resource and added `metadataVersion: 4.2-IV1`.
- Added `kraftMetadata: shared` to the controller node pool storage so the KRaft metadata log storage is explicitly configured.
- Added `spec.kafka.authorization.type: simple` so the KafkaUser ACL examples using `authorization.type: simple` can reconcile.
- Fixed the Helm chart dashboard values from `dashboards.labels` to `dashboards.label` and `dashboards.labelValue`.
- Removed `wait: true` from the Flux Kustomization because Flux ignores explicit `healthChecks` when `wait` is true; added a Kafka custom resource health check alongside the HelmRelease.
- Removed the claim that the guide configures Kafka Connect, since the post only mentions Kafka Connect as a possible extension.

## Review Notes
The post now targets current Strimzi 1.0.0 APIs. The example is still a compact tutorial manifest; production deployments should further review external listener exposure, storage class names, pod scheduling labels, and the order in which Flux reconciles operator installation versus Strimzi custom resources.
