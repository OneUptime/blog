# Validation Summary: How to Set Up Event-Driven Architecture on Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Apache Kafka
- Strimzi
- NATS
- JetStream
- Knative Eventing
- Knative KafkaSource
- Confluent Schema Registry

## Sources Consulted
- Strimzi deployment and API docs: https://strimzi.io/docs/operators/latest/deploying
- Strimzi configuration reference: https://strimzi.io/docs/operators/latest/full/configuring
- Strimzi install manifest endpoint: https://strimzi.io/install/latest?namespace=kafka
- Knative broker docs: https://knative.dev/v1.20-docs/eventing/brokers/broker-types/channel-based-broker/
- Knative broker configuration docs: https://knative.dev/v1.20-docs/eventing/configuration/broker-configuration/
- Knative KafkaChannel configuration docs: https://knative.dev/docs/eventing/configuration/kafka-channel-configuration/
- Knative Eventing API reference: https://knative.dev/v1.20-docs/eventing/reference/eventing-api/
- Knative KafkaSource CRD in the official repository: https://raw.githubusercontent.com/knative-extensions/eventing-kafka-broker/main/control-plane/config/eventing-kafka-broker/100-source/100-kafka-source.yaml
- NATS Helm chart values in the official repository: https://raw.githubusercontent.com/nats-io/k8s/main/helm/charts/nats/values.yaml
- KEDA concepts: https://keda.sh/docs/latest/concepts
- Confluent Schema Registry Docker config reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent Schema Registry deployment guidance: https://docs.confluent.io/platform/current/schema-registry/installation/deployment.html
- Confluent Schema Registry API reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Archived Confluent Helm chart repository: https://github.com/confluentinc/cp-helm-charts

## Issues Found
- The Strimzi Kafka example used deprecated ZooKeeper-era configuration and stale API versions (`kafka.strimzi.io/v1beta2`, `spec.zookeeper`). Current Strimzi releases use `kafka.strimzi.io/v1`, require KRaft mode, and model node layout with `KafkaNodePool`. I replaced the sample with a current KRaft-based `KafkaNodePool` plus `Kafka` resource.
- The Kafka cluster version was pinned to `3.6.0`, which is no longer aligned with current Strimzi-supported Kafka versions. I updated it to `4.2.0` to match current Strimzi documentation.
- The topic examples used the old `KafkaTopic` API version. I updated both topic manifests to `kafka.strimzi.io/v1`.
- The Knative broker example referenced a `kafka-channel-config` ConfigMap that was never defined. I replaced it with the documented `kafka-channel` ConfigMap and kept the Broker pointed at that ConfigMap.
- The EDA component list described KEDA as an event router. KEDA is an event-driven autoscaler, not a routing layer. I corrected the label to “Event Routing and Autoscaling”.
- The Schema Registry step used Confluent’s archived `cp-helm-charts` repository, which is no longer a current deployment path. I replaced it with a direct Kubernetes `Deployment` and `Service` using the supported Schema Registry container configuration.
- The Schema Registry bootstrap server setting omitted the protocol prefix required by Confluent’s configuration (`PLAINTEXT://` or `SSL://`). I corrected the bootstrap server value and added the core required environment variables.

## Review Notes
- The updated Knative Broker example is valid, but Knative documentation recommends native broker implementations such as the Kafka Broker over `MTChannelBasedBroker` plus Channels when possible.
- The post assumes Knative Eventing and the relevant Kafka extensions are already installed in the cluster. The manifests shown for `KafkaChannel` and `KafkaSource` depend on those CRDs being present.
- The NATS section is technically correct for the current Helm chart values, but the rest of the walkthrough continues with Kafka-backed examples rather than integrating NATS into later routing examples.
