# Knative Kafka Broker vs MTChannelBasedBroker: Key Tradeoffs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, Kafka Broker, MTChannelBasedBroker, KafkaChannel, Architecture, Kubernetes

Description: Choose between Knative's native Kafka Broker and MTChannelBasedBroker by comparing the actual transport, delivery path, durability, ordering, and operational footprint.

---

Both options implement Knative's `Broker` and `Trigger` APIs, but they do not have the same data path:

- the **native Kafka Broker** targets Apache Kafka directly and is designed to reduce network hops;
- `MTChannelBasedBroker` routes through a configured Knative Channel implementation.

The Channel choice is therefore part of every `MTChannelBasedBroker` comparison. An InMemoryChannel-backed Broker and a KafkaChannel-backed Broker have very different durability and operations.

Knative's current documentation recommends native Broker implementations such as the Kafka Broker over the channel-based combination in most cases because they are usually more efficient.

## Compare the Real Options

| Area | Native Kafka Broker | MTChannelBasedBroker + KafkaChannel | MTChannelBasedBroker + InMemoryChannel |
| --- | --- | --- | --- |
| Persistent transport | Apache Kafka | Apache Kafka through KafkaChannel | No durable backing store |
| Network/data-plane path | Kafka-native receiver and dispatcher | Broker path plus Channel path | Broker path plus in-memory dispatcher |
| Production suitability | Yes, with production Kafka configuration | Yes, with production Kafka and Channel configuration | No; Knative docs prohibit InMemoryChannel for production |
| Trigger ordering | Kafka `ordered` annotation, per partition | Depends on Channel/Broker path and implementation | No durable partition-order contract |
| Delivery options | Core DLS, retry, backoff fields supported | Depends on KafkaChannel support | Supported, without durable retention |
| Topic control | Broker topic defaults or external topic | KafkaChannel topic configuration | Not applicable |
| Operational components | Kafka Broker controller, receiver, dispatcher, Kafka | Core Broker components, KafkaChannel components, Kafka | Core Broker and InMemoryChannel components |
| Portability of backing transport | Kafka-specific | Channel template can be changed for new Brokers | Channel template can be changed for new Brokers |

Neither option provides exactly-once subscriber processing. Triggers use at-least-once delivery, so consumers must be idempotent.

## Durability Is a Transport Configuration, Not a Name

The native Kafka Broker writes incoming CloudEvents as Kafka records in binary content mode. Its durability depends on Kafka replication, acknowledgements, topic retention, disk health, availability, and access control. Configure:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-broker-config
  namespace: knative-eventing
data:
  bootstrap.servers: "my-cluster-kafka-bootstrap.kafka:9092"
  default.topic.partitions: "12"
  default.topic.replication.factor: "3"
  default.topic.config.retention.ms: "86400000"
```

The replication factor cannot exceed the number of Kafka brokers. If you attach an externally managed topic with `kafka.eventing.knative.dev/external.topic`, Knative no longer owns its lifecycle or validates all of its operational policy; your Kafka team must manage it.

An `MTChannelBasedBroker` inherits storage behavior from its Channel. A KafkaChannel can provide Kafka durability. An InMemoryChannel is a best-effort Channel with no persistent backing store and must not be used in production.

A dead letter sink and retry policy improve failure handling, but they do not replace durable transport or adequate Kafka retention.

## Latency and Throughput

The native Kafka Broker exists specifically to integrate directly with Kafka and reduce network hops. That usually improves latency and resource efficiency over wrapping KafkaChannel inside the multi-tenant channel-based Broker.

Do not turn "fewer hops" into an unmeasured latency promise. Actual performance depends on:

- Kafka producer acknowledgement and replication settings;
- partitions and key skew;
- Trigger count and filtering;
- ordered versus unordered delivery;
- subscriber response latency;
- retry behavior;
- shared data-plane contention;
- network and service-mesh overhead.

Benchmark producer-to-Broker acknowledgement and Broker-to-subscriber completion separately. Also test recovery throughput after an outage; steady-state median latency can hide a data plane that drains backlog too slowly.

## Native Kafka Broker Configuration

Create a native Broker by selecting the case-sensitive `Kafka` class:

```yaml
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: orders
  namespace: production
  annotations:
    eventing.knative.dev/broker.class: Kafka
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: kafka-broker-config
    namespace: knative-eventing
```

The normal `Kafka` class uses shared `kafka-broker-receiver` and `kafka-broker-dispatcher` deployments in `knative-eventing`. The `KafkaNamespaced` class creates a data plane for each namespace that has a Broker, improving isolation at the cost of more deployments and resources.

Native Kafka features include:

- per-Trigger `ordered` or default `unordered` delivery;
- routing related events with the CloudEvents `partitionkey` extension;
- shared or namespace-isolated data planes;
- bring-your-own Kafka topic;
- Kafka-specific TLS and SASL configuration;
- alpha KEDA scaling for dispatchers.

Use the native implementation when Kafka is a deliberate platform standard and these features or the shorter data path matter.

## MTChannelBasedBroker Configuration

The channel-based Broker references a ConfigMap containing a Channel template:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: production-kafka-channel
  namespace: production
data:
  channel-template-spec: |
    apiVersion: messaging.knative.dev/v1beta1
    kind: KafkaChannel
    spec:
      numPartitions: 12
      replicationFactor: 3
---
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: orders-channel-based
  namespace: production
  annotations:
    eventing.knative.dev/broker.class: MTChannelBasedBroker
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: production-kafka-channel
    namespace: production
```

Install and configure the KafkaChannel implementation first, including bootstrap servers and security. Match the KafkaChannel API version to the CRD installed in your cluster.

This model can be appropriate when:

- a platform must use the same Broker control pattern over an approved Channel implementation;
- existing Channel operations and tooling are the stronger organizational standard;
- compatibility with a non-native Broker transport is more important than Kafka-specific optimization;
- a migration requires maintaining an existing channel-based topology.

Do not choose it merely because it ships with core Eventing. A production KafkaChannel still adds Kafka extension components and operational ownership.

## Compare Operations, Not Just Manifests

For each candidate, inventory:

- controllers, receiver/dispatcher deployments, and their high-availability modes;
- Kafka topics, partitions, replication, retention, and ACLs;
- TLS/SASL Secrets and certificate rotation;
- data-plane scaling and partition limits;
- delivery fields actually supported;
- metrics, logs, consumer lag, and dead letter ownership;
- upgrade compatibility among Knative Eventing, the Kafka extension, Kafka, and Kubernetes;
- tenant isolation and noisy-neighbor risk.

The native shared data plane has fewer per-namespace components but a wider failure and contention domain. `KafkaNamespaced` narrows that domain with higher baseline cost. Channel-based designs introduce another implementation boundary whose support matrix must be tested.

## Make the Decision with Failure Tests

Run the same workload through both topologies and measure:

1. ingress acknowledgement latency;
2. end-to-end subscriber latency and throughput;
3. behavior during subscriber `5xx` responses and timeouts;
4. duplicate delivery after dispatcher restart;
5. backlog growth and drain rate;
6. Kafka broker loss within the configured replication factor;
7. control-plane and data-plane upgrades;
8. operator time to locate and replay a dead letter event.

For a new Kafka-backed production Broker, the native Kafka Broker is the sensible default. Retain `MTChannelBasedBroker` when its Channel abstraction solves a concrete portability or platform constraint and the chosen Channel meets the required durability and delivery semantics.

Treat a change of Broker implementation as a data-path migration. Create a new Broker, verify all Triggers and policies, plan duplicate-safe producer cutover, drain or retain the old transport, and keep rollback possible instead of casually changing a class annotation in place.

## Official Documentation

- [Knative native Broker for Apache Kafka](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Knative channel-based Broker](https://knative.dev/docs/eventing/brokers/broker-types/channel-based-broker/)
- [Knative Channel types and defaults](https://knative.dev/docs/eventing/channels/channel-types-defaults/)
- [Knative Kafka Channel configuration](https://knative.dev/docs/eventing/configuration/kafka-channel-configuration/)
- [Knative event delivery support matrix](https://knative.dev/docs/eventing/event-delivery/)
