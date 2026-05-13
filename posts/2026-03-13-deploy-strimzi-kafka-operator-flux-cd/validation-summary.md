# Validation Summary: How to Deploy Strimzi Kafka Operator with Custom Resources via Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Strimzi Kafka Operator
- Apache Kafka
- Kubernetes custom resources
- KafkaNodePool, Kafka, and KafkaTopic CRDs
- Flux CD HelmRelease and Kustomization
- HelmRepository
- kubectl
- Prometheus JMX Exporter metrics configuration

## Sources Consulted
- Strimzi latest deploying documentation: https://strimzi.io/docs/operators/latest/deploying
- Strimzi latest custom resource API reference: https://strimzi.io/docs/operators/latest/full/configuring
- Strimzi downloads and supported versions: https://strimzi.io/downloads/
- Strimzi Helm chart repository index: https://strimzi.io/charts/index.yaml
- Strimzi 0.42.0 deploying documentation for comparison: https://strimzi.io/docs/operators/0.42.0/deploying.html
- Strimzi 0.42.0 Helm chart values for comparison: https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/0.42.0/packaging/helm-charts/helm3/strimzi-kafka-operator/values.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The post pinned Strimzi Operator `0.42.0`, Kubernetes `v1.26+`, Kafka `3.7.1`, and `kafka.strimzi.io/v1beta2`. These are outdated for a current review: Strimzi 1.0.0 uses only the `v1` custom resource API, and recent Strimzi versions require Kubernetes 1.30+. Updated the operator version, Kubernetes prerequisite, Strimzi CR API versions, Kafka version, and metadata version.
- The Kafka manifest claimed KRaft mode but still configured `spec.zookeeper` and did not define a `KafkaNodePool`. Current Strimzi KRaft deployments require `Kafka` plus `KafkaNodePool` resources. Replaced the ZooKeeper-based fields with a `KafkaNodePool` and moved replicas, storage, JVM options, resources, and pod anti-affinity into the node pool.
- The Helm values comment said `watchNamespaces: []` watches all namespaces. The Strimzi chart uses `watchAnyNamespace: true` for all namespaces; `watchNamespaces: []` watches the release namespace by default. Corrected the comment and added `watchAnyNamespace: false`.
- The Flux `dependsOn` example referenced `strimzi-operator` without showing the required Flux `Kustomization`, and Flux dependencies are between Kustomization resources, not arbitrary HelmRelease objects. Split the Flux example into an operator Kustomization and a Kafka Kustomization that depends on it.
- The verification commands produced to `my-test-topic` while topic auto-creation was disabled. Added a `KafkaTopic` manifest for the test topic.
- The producer verification command passed stdin without `kubectl exec -i`. Added `-i` so the here-string is forwarded to the container.

## Review Notes
- The example uses a three-node dual-role KRaft node pool to preserve the original small-cluster shape. For larger production environments, Strimzi documentation recommends dedicated controller and broker node pools.
- Local YAML syntax validation passed for all fenced YAML blocks in the post.
