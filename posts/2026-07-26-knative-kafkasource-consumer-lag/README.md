# Knative KafkaSource Consumer Lag Keeps Growing: How to Find the Bottleneck

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, KafkaSource, Apache Kafka, Consumer Lag, Troubleshooting, KEDA

Description: Diagnose growing KafkaSource lag by partition, then distinguish sink backpressure, poison events, insufficient consumers, rebalances, and Kafka connectivity failures.

---

Kafka consumer lag is the difference between a partition's latest offset and the offset committed by a consumer group. A growing total says only that production is outpacing committed consumption. The partition pattern and commit behavior reveal why.

A Knative `KafkaSource` preserves order within each topic partition by serializing delivery in that partition. It waits for each sink delivery attempt, including configured retries and dead letter handling, to finish before delivering the next record in that partition. That makes sink latency and failures part of Kafka consumption throughput.

## Start with the Exact Source Identity

Read the topics, consumer group, desired consumers, sink, and placement status:

```bash
kubectl get kafkasource orders -n production -o yaml

kubectl get kafkasource orders -n production \
  -o jsonpath='{.spec.consumerGroup}{"\n"}{.spec.topics}{"\n"}{.spec.consumers}{"\n"}'

kubectl get kafkasource orders -n production \
  -o jsonpath='{.status.placements}{"\n"}'
```

Do not inspect a similarly named Kafka Broker or KafkaChannel consumer group. Copy `spec.consumerGroup` exactly from this KafkaSource.

Confirm reconciliation and data-plane health:

```bash
kubectl describe kafkasource orders -n production
kubectl get deployment,statefulset,pod -n knative-eventing
```

The standard installation uses a `kafka-controller` Deployment and a `kafka-source-dispatcher` StatefulSet. Names can differ in a managed or customized installation, so follow the source status when locating the assigned dispatcher Pod.

## Describe Lag by Partition

Run Kafka's consumer group tool from an authorized Kafka client environment:

```bash
bin/kafka-consumer-groups.sh \
  --bootstrap-server my-cluster-kafka-bootstrap.kafka.svc:9092 \
  --describe \
  --group orders-source-v1
```

Capture `TOPIC`, `PARTITION`, `CURRENT-OFFSET`, `LOG-END-OFFSET`, `LAG`, `CONSUMER-ID`, and `HOST` repeatedly. Interpret the pattern:

| Pattern | Likely direction |
| --- | --- |
| No active consumer IDs | dispatcher unavailable, source not placed, authentication/network failure, or rebalancing |
| Every partition grows similarly | insufficient aggregate throughput or a generally slow sink |
| One partition grows while others drain | hot key, poison event, or slow ordered work on that partition |
| Current offset is fixed while deliveries repeat | sink is failing or timing out during configured retries |
| Consumer IDs constantly change | Pod churn, unstable networking, or repeated group rebalances |
| Lag falls only when producers stop | sustainable consume rate is lower than produce rate |

One total-lag graph can hide a single blocked partition. Alert and debug at partition level.

## Check the HTTP Sink Before Adding Consumers

Because KafkaSource serializes delivery within a partition, inspect sink response codes and latency:

```bash
kubectl get kafkasource orders -n production \
  -o jsonpath='{.status.sinkUri}{"\n"}'

kubectl get ksvc order-ingestor -n production
kubectl logs -n production \
  -l serving.knative.dev/service=order-ingestor \
  -c user-container --since=15m
```

Look for:

- `5xx`, `404`, `408`, `409`, or `429` responses, which are retryable when `spec.delivery.retry` is greater than zero;
- connection and request timeouts;
- a Knative Service repeatedly scaling from zero;
- exhausted database connection pools;
- excessive container concurrency or CPU throttling;
- a single message whose processing never succeeds;
- a handler that starts asynchronous work but delays its acknowledgement.

The generic Knative Eventing metrics reference lists source sent-event and retry-event counts with response dimensions. Kafka dispatcher releases can export different metrics, and the official metrics page warns that names are migrating from OpenCensus to OpenTelemetry, so verify the actual names exported by your installed release.

If the sink can safely accept work into a durable internal queue, acknowledge after that enqueue rather than after a long downstream workflow. Keep the downstream queue observable and idempotent.

## Account for Ordered Head-of-Line Blocking

A KafkaSource blocks only the affected partition while a sink attempt and its configured retries are in progress, so one poison record with a large retry budget or long backoff can produce a distinctive single-partition backlog.

Configure a bounded failure policy:

```yaml
spec:
  delivery:
    retry: 5
    backoffPolicy: exponential
    backoffDelay: PT1S
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: orders-dead-letter
```

After sink attempts are exhausted, the current dispatcher attempts delivery to the dead letter sink and then commits the record so consumption can move on, even if dead letter delivery fails. Monitor the dead letter sink so a failed quarantine copy is not mistaken for successful handling. That restores transport progress, but later records may depend on business state that the failed record should have created. Decide whether the domain permits skipping a poison event or requires quarantining that ordering key.

## Scale Only When Parallelism Is the Limit

KafkaSource supports explicit consumer scaling:

```yaml
apiVersion: sources.knative.dev/v1
kind: KafkaSource
metadata:
  name: orders
  namespace: production
spec:
  consumerGroup: orders-source-v1
  consumers: 12
  bootstrapServers:
    - my-cluster-kafka-bootstrap.kafka.svc:9092
  topics:
    - orders
  sink:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-ingestor
```

You can also use:

```bash
kubectl scale kafkasource orders -n production --replicas=12
```

Useful consumer parallelism is bounded by the number of assigned partitions. Twelve consumers cannot accelerate a topic with three partitions, and no replica count fixes one hot partition. Additional consumers can also increase sink pressure, rebalances, connections, and memory use.

Measure:

```text
required active partitions or consumers
≈ incoming records per second / sustainable records per second per consumer
```

Then validate with real event sizes and sink latency.

## Use KEDA with Release-Aware Guardrails

Knative Kafka dispatcher autoscaling with KEDA is currently an alpha feature. Enabling `controller-autoscaler-keda` in `config-kafka-features` affects KafkaSources, Kafka Broker Triggers, and KafkaChannel Subscriptions cluster-wide.

After installing KEDA and enabling the feature, a KafkaSource can use annotations such as:

```yaml
metadata:
  annotations:
    autoscaling.eventing.knative.dev/min-scale: "1"
    autoscaling.eventing.knative.dev/max-scale: "12"
    autoscaling.eventing.knative.dev/polling-interval: "10"
    autoscaling.eventing.knative.dev/cooldown-period: "60"
    autoscaling.eventing.knative.dev/lag-threshold: "100"
```

Keep `max-scale` at or below useful partition parallelism unless you have a measured reason otherwise. A nonzero minimum avoids cold consumer activation where low latency matters.

## Check Kafka and Kubernetes Limits

If the sink is healthy and consumers are correctly sized, inspect:

- Kafka broker CPU, disk latency, network, under-replicated partitions, and throttling;
- TLS/SASL failures and certificate expiry;
- consumer fetch latency and poll behavior;
- dispatcher CPU/memory limits, restarts, OOM kills, and node pressure;
- DNS and NetworkPolicy between the dispatcher, Kafka, and sink;
- partition skew caused by producer keys;
- deployment rollouts causing repeated group rebalances.

Compare produce rate, consume/commit rate, and lag age. Ten thousand tiny fresh records may be less urgent than one thousand records that are hours old.

## Do Not “Fix” Lag by Changing the Consumer Group

Changing `spec.consumerGroup` creates a different logical consumer. It does not repair the old group's backlog and can replay or skip data depending on the new group's starting offsets.

Likewise, changing `initialOffset` does not reset an existing group. Knative honors `initialOffset` only when there are no committed offsets for that consumer group.

Offset resets are data operations. Stop the consumer instances before using Kafka's offset reset tool, pause producers too if your procedure requires a stable end offset, record the exact partitions and target offsets, understand duplicate or loss consequences, and use the Kafka administration procedure for your installed version.

The fastest diagnosis is usually: describe lag per partition, correlate the stuck offsets with sink attempts, and only then decide whether to fix a poison event, accelerate the sink, stabilize consumers, rebalance keys, or add useful consumer parallelism.

## Official Documentation

- [Knative KafkaSource behavior, scaling, and delivery](https://knative.dev/docs/eventing/sources/kafka-source/)
- [Knative KEDA autoscaling for Kafka resources](https://knative.dev/docs/eventing/configuration/keda-configuration/)
- [Knative Eventing metrics reference](https://knative.dev/docs/eventing/observability/metrics/eventing-metrics/)
- [Apache Kafka consumer group operations](https://kafka.apache.org/43/operations/basic-kafka-operations/)
- [Knative handling delivery failure](https://knative.dev/docs/eventing/event-delivery/)
