# How to Preserve Kafka Partition Ordering in Knative Eventing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, Apache Kafka, Ordering, CloudEvent, KafkaSource, Kafka Broker

Description: Preserve per-key, per-partition order through Knative KafkaSource and Kafka Broker deliveries while understanding throughput and failure trade-offs.

---

Kafka ordering is per partition, not per topic and not global. Knative can preserve that order, but only if related events enter the same partition and the outbound consumer waits for each subscriber acknowledgement before advancing.

There are two different Knative Kafka paths:

- `KafkaSource` reads an existing topic and, with its default `spec.ordering: ordered` setting, preserves each source partition's order by waiting for a successful sink response before delivering the next record from that partition.
- the native Kafka Broker defaults each Trigger to `unordered`; add an annotation to request a per-partition blocking consumer.

Configure the path you actually use.

## Route Related Events to One Partition

Choose an ordering key that represents the entity whose changes must be serialized, such as `customer-42` or `order-1042`. Every producer must use the same canonical value.

For events sent to a Knative Kafka Broker, use the CloudEvents partitioning extension. In binary HTTP content mode:

```bash
curl --fail-with-body --request POST \
  --header 'Content-Type: application/json' \
  --header 'Ce-Specversion: 1.0' \
  --header 'Ce-Id: order-1042-status-3' \
  --header 'Ce-Source: https://orders.example.com' \
  --header 'Ce-Type: com.example.order.status-changed.v1' \
  --header 'Ce-Partitionkey: order-1042' \
  --data-binary '{"orderId":"1042","sequence":3}' \
  "$BROKER_URL"
```

In structured JSON content mode, `partitionkey` is a top-level CloudEvent extension attribute:

```json
{
  "specversion": "1.0",
  "id": "order-1042-status-3",
  "source": "https://orders.example.com",
  "type": "com.example.order.status-changed.v1",
  "partitionkey": "order-1042",
  "data": {
    "orderId": "1042",
    "sequence": 3
  }
}
```

The `partitionkey` value must be a non-empty string. It is routing metadata, so preserve it through any CloudEvent transform that should retain the same ordering group.

If Kafka clients publish to a source topic directly, set the Kafka record key consistently and use compatible partitioning behavior across producers. A `KafkaSource` keeps the existing partition assignment; it does not repartition records based on the CloudEvent it later creates.

## Enable Ordered Kafka Broker Delivery

Make sure the Broker uses the native `Kafka` or `KafkaNamespaced` class, and annotate each Trigger that requires ordered delivery:

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: order-projector
  namespace: production
  annotations:
    kafka.eventing.knative.dev/delivery.order: ordered
spec:
  broker: orders
  filters:
    - exact:
        type: com.example.order.status-changed.v1
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-projector
  delivery:
    retry: 5
    backoffPolicy: exponential
    backoffDelay: PT1S
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: order-projector-dead-letter
```

`ordered` makes the Trigger consumer block per partition until the subscriber returns a successful response. The default `unordered` mode is non-blocking and favors parallel delivery.

This annotation is a Kafka Broker feature. It does not turn an `MTChannelBasedBroker` into the native Kafka implementation, and it does not promise order for another Broker class.

## Acknowledge Only After Ordered Work Is Safe

Ordered dispatch controls request delivery, not arbitrary work started by the application. If the subscriber returns `202` and then launches concurrent background tasks, those tasks can complete out of order even though Knative delivered requests serially.

Return `2xx` only after:

- the ordered state transition has committed; or
- the event has been appended to an application queue that itself preserves the same key order.

Make the subscriber idempotent. A lost acknowledgement can cause the current event to be retried before the partition advances.

## Understand Head-of-Line Blocking

Ordered consumption deliberately trades throughput for sequencing. One slow or repeatedly failing event blocks later events in that partition. Other partitions can still progress.

Configure bounded retries and a dead letter sink so a permanent poison event has a controlled failure path. Decide whether moving it aside is acceptable: continuing after dead lettering preserves transport progress but means business sequence `N+1` may run without successful sequence `N`. Some domains must instead quarantine the entire key until an operator repairs the gap.

Use enough partitions to parallelize independent keys. More consumer replicas than active partitions do not increase partition-level concurrency. Conversely, a very hot key stays on one partition and cannot be accelerated without relaxing or subdividing its ordering requirement.

Avoid casually increasing a topic's partition count. Future records for a key can map differently after the count changes, so old backlog and new records may no longer share one ordering lane. Plan partition count and migration before production.

## Preserve Order Across Multiple Hops

An ordered first hop does not make an entire event graph ordered:

```text
KafkaSource -> Broker -> Trigger -> Service -> reply Broker -> Trigger
```

For each hop, ask:

1. what is the partition or ordering key?
2. does the transport preserve it?
3. is the consumer configured for ordered delivery?
4. when does the subscriber acknowledge?
5. can retries, dead lettering, or asynchronous work create a gap?

A KafkaSource using its default `spec.ordering: ordered` setting serializes delivery within each input partition. If its sink is a Kafka Broker, include or derive a stable `partitionkey` before Broker ingress if downstream Trigger ordering matters. The KafkaSource exposes the original Kafka key as a CloudEvent `key` extension, but `key` and the standardized `partitionkey` extension are distinct attributes; transform intentionally rather than assuming one is substituted for the other.

Each Trigger has its own consumer path. Ordering on one Trigger does not coordinate side effects across two different subscribers.

## Verify with a Sequence Number

Generate several events for two keys:

```text
order-1042: 1, 2, 3, 4
order-2099: 1, 2, 3, 4
```

Make event `order-1042/2` fail twice. A correct test should show:

- `order-1042/3` waits until `order-1042/2` succeeds or follows the chosen dead letter policy;
- `order-2099` can continue if it is on another partition;
- retries reuse the same CloudEvent `(source, id)`;
- no subscriber side effect completes out of order.

Log the CloudEvent identity, ordering key, application sequence, Kafka topic/partition/offset when available, attempt, and completion time. Test during consumer scaling and rebalances, not only in steady state.

Per-partition order is valuable and achievable. Global order is a different, much more expensive requirement; use one partition or an application sequencer only when the business domain truly needs it.

## Official Documentation

- [Knative Kafka Broker ordered and unordered Trigger delivery](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Knative KafkaSource partition-order behavior](https://knative.dev/docs/eventing/sources/kafka-source/)
- [Knative Channel types and KafkaChannel ordering](https://knative.dev/docs/eventing/channels/channel-types-defaults/)
- [CloudEvents partitioning extension](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/extensions/partitioning.md)
- [Apache Kafka design: ordering and consumer groups](https://kafka.apache.org/documentation/#design)
