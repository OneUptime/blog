# Validation Summary: Deploying Knative Serverless Platform with Helm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- Knative Operator
- Knative Serving
- Knative Eventing
- Knative Event Sources
- Knative KafkaSource and KafkaChannel
- Knative autoscaling
- Prometheus Operator ServiceMonitor and PrometheusRule

## Sources Consulted
- Knative Operator installation documentation: https://knative.dev/docs/install/operator/knative-with-operators/
- Knative Serving Operator CR configuration documentation: https://knative.dev/docs/install/operator/configuring-serving-cr/
- Knative Eventing Operator CR configuration documentation: https://knative.dev/docs/install/operator/configuring-eventing-cr/
- Knative Operator chart values from upstream repository: https://github.com/knative/operator
- Knative KafkaSource documentation: https://knative.dev/docs/eventing/sources/kafka-source/
- Knative Eventing API reference: https://knative.dev/docs/eventing/reference/eventing-api/
- Knative channel types and defaults documentation: https://knative.dev/docs/eventing/channels/channel-types-defaults/
- Knative custom domains documentation: https://knative.dev/docs/serving/services/custom-domains/
- Knative autoscaling metrics and targets documentation: https://knative.dev/docs/serving/autoscaling/autoscaling-metrics/ and https://knative.dev/docs/serving/autoscaling/autoscaling-targets/
- Knative Serving metrics reference and metrics collection documentation: https://knative.dev/docs/serving/observability/metrics/serving-metrics/ and https://knative.dev/docs/serving/observability/metrics/collecting-metrics/

## Issues Found
- The Helm repository commands used `https://knative.dev/charts`, which is not the official Knative Operator Helm repository. Updated the commands to use `helm repo add knative-operator https://knative.github.io/operator` and search that repository.
- The operator values example used an `operator:` key that does not match the current Knative Operator Helm chart values. Updated it to use the `knative_operator.knative_operator.resources` and `knative_operator.operator_webhook.resources` keys.
- The operator installation mixed a Helm values file with a raw `kubectl apply` manifest install, and verified the deployment in the wrong namespace. Updated it to install the official Helm chart with `helm install` and verify in `knative-operator`.
- The examples pinned Knative Serving and Eventing to `1.12.0`, which is outdated for the current operator. Updated the examples to `1.22.0`, matching the current supported component version in the Knative Operator documentation.
- The Eventing CR did not enable the Kafka event source even though the post later creates a `KafkaSource`. Added `spec.source.kafka.enabled: true` to the Eventing Operator CR.
- The custom domain example used the deprecated `serving.knative.dev/disableAutoTLS` annotation and omitted the `ClusterDomainClaim` required by current Knative custom domain documentation. Updated the annotation to `networking.knative.dev/disable-external-domain-tls`, added a `ClusterDomainClaim`, and set the `DomainMapping` namespace.
- The `KafkaSource` example used the older `sources.knative.dev/v1beta1` API. Updated it to `sources.knative.dev/v1`.
- The Kafka channel default ConfigMap omitted `retentionDuration` even though the preceding `KafkaChannel` resource configured it. Added the same retention setting to the channel template.
- The Helm chart values used `revisionName: latest`, which points to a revision literally named `latest` rather than the latest ready revision. Updated it to `latestRevision: true`.
- The ServiceMonitor example did not match Knative's current monitor examples. Updated the metadata namespace/name and endpoint settings to match the activator ServiceMonitor pattern from the Knative monitoring manifests.
- The Prometheus rule examples referenced stale metric names. Updated them to use current Knative Serving metric names as represented in Prometheus format.

## Review Notes
The workspace does not have `helm` or `kubectl` installed, so local CLI help validation was not possible. The command and manifest corrections were verified against official Knative documentation and upstream Knative repository content. The remaining examples are illustrative and still assume the required dependencies exist in the cluster, such as a working networking layer, DNS for DomainMapping, Prometheus Operator CRDs, and Kafka infrastructure for KafkaSource/KafkaChannel examples.
