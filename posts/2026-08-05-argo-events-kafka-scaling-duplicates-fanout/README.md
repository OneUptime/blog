# Scale Kafka EventSources and Sensors Without Runaway Workflow Fan-Out

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, Apache Kafka, EventSource, Sensor, Kubernetes, Scaling, Idempotency

Description: Scale Kafka ingestion and Kafka-backed Sensors while preserving offsets, controlling Workflow cardinality, and containing duplicate side effects.

---

In this Kafka-to-Workflow path, "Kafka" appears in two independent places: a Kafka EventSource consumes an application topic, while a Kafka EventBus transports CloudEvents between EventSources and Sensors. Scaling one does not automatically scale the other.

That distinction prevents two common mistakes. Increasing replicas on a Kafka EventSource does not increase active consumers, because that EventSource type is active-passive. Increasing replicas on a Sensor backed by a Kafka EventBus does create active-active consumers, but it can also multiply pressure on the Kubernetes API and Workflow controller.

## Start with the Two Kafka Hops

A Kafka-to-Workflow path can contain both Kafka roles:

```text
application Kafka topic
  -> Kafka EventSource
  -> Argo Kafka EventBus event topic
  -> active-active Sensor replicas
  -> Kubernetes API
  -> Workflow controller
```

The application topic and EventBus topic have different producers, consumer groups, partitions, retention, ACLs, and lag. Monitor them separately. A healthy input consumer does not prove the Sensor is keeping up, and a healthy EventBus does not prove Workflow creation is being admitted.

## Treat Kafka EventSource Replicas as HA

Official Argo Events HA documentation lists Kafka EventSources as active-passive. Set `spec.replicas` on the EventSource resource to get a standby, and do not scale the generated Deployment manually:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: EventSource
metadata:
  name: orders-kafka
  namespace: argo-events
spec:
  replicas: 3
  eventBusName: default
  kafka:
    orders:
      url: kafka-0.kafka.svc:9092,kafka-1.kafka.svc:9092
      topic: order-events
      jsonBody: true
      consumerGroup:
        groupName: argo-events-orders
        oldest: true
        rebalanceStrategy: sticky
      limitEventsPerSecond: 200
```

Only the elected EventSource pod consumes. The other two are failover capacity, not throughput capacity. With a Kafka EventBus, EventSource leader election uses Kubernetes Leases. Ensure the EventSource service account has the documented `get`, `create`, and `update` verbs on `coordination.k8s.io` Lease resources.

`consumerGroup` gives Kafka durable group offsets and lets the active process receive claims for the topic's partitions. Current Argo Events accepts `sticky`, `roundrobin`, and `range` rebalance strategies; `range` is the fallback. `oldest: true` selects the reset position when the group has no committed offset or its committed offset is no longer available, such as after retention removes it. It does not rewind a valid existing offset.

The alternative fixed `partition` mode consumes one named partition. In the current implementation it starts from the newest offset and does not use a consumer group, which makes it a poor default for durable production ingestion. Prefer a consumer group unless fixed-partition, new-events-only behavior is deliberate and tested against your installed release.

In the current implementation, `limitEventsPerSecond` applies only in consumer-group mode and paces each assigned partition claim after a message is processed. Aggregate throughput can exceed the configured value when the active pod owns multiple partitions, and fixed `partition` mode does not apply the limit. It is useful for protecting Argo, but it is not a listener-wide or distributed business quota and does not replace broker lag alerts.

## Scale Sensors with Kafka EventBus Partitions

Sensors using a Kafka EventBus are the exception to normal Sensor active-passive behavior. They can run active-active without leader election:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Sensor
metadata:
  name: order-workflows
  namespace: argo-events
spec:
  eventBusName: default
  replicas: 4
  dependencies:
    - name: order-created
      eventSourceName: orders-kafka
      eventName: orders
      filters:
        data:
          - path: body.type
            type: string
            value:
              - order.created
  triggers:
    - template:
        name: start-order-workflow
        conditions: order-created
        # Supply the normal Argo Workflow trigger here.
      rateLimit:
        unit: Second
        requestsPerUnit: 25
```

The abbreviated trigger is an overlay example, not a complete Sensor to apply. Keep the real Workflow trigger in source control and review the final rendered object.

The Kafka EventBus requires one shared event topic plus a trigger topic and action topic for each Sensor. Official guidance says the event topic needs at least as many partitions as planned Sensor replicas. More pods than event partitions cannot provide equal consumption parallelism. Trigger and action topics normally need fewer partitions, commonly one to three, because they coordinate each Sensor's decisions and completed actions.

Create these topics explicitly when broker auto-creation is disabled. Review replication factor, retention, `min.insync.replicas`, ACLs, and partition count. A missing internal topic causes the EventSource or Sensor to exit rather than silently fall back.

Set Sensor replicas through `spec.replicas`, not by manually scaling its generated Deployment. The controller owns that Deployment, and manual scaling bypasses Argo's intended topology.

## Understand What Kafka Prevents and What It Cannot

The current Kafka EventBus design uses its trigger and action topics for transactional coordination across Sensor replicas. Argo's official documentation describes this as preventing repeated trigger evaluation and tracking completed actions through restart or rebalance.

That does not make an arbitrary external side effect exactly once. The target can accept a Workflow or HTTP request and lose the response before Argo records completion. A client timeout, pod termination, or operator replay can make the outcome ambiguous. Treat every trigger as potentially repeatable at the system boundary.

For Kafka input, Argo's CloudEvent ID is derived from EventSource name, event name, one configured broker address, topic, partition, and offset. Carry that ID, or a producer-supplied stable operation ID, into the Workflow. Enforce uniqueness where the business effect happens. Examples include:

- a database uniqueness constraint on the operation ID;
- a Workflow admission gateway that returns the existing result for the same key;
- a deterministic resource name when Kubernetes create semantics fit the use case;
- an idempotency table whose write and business mutation share one transaction.

Do not depend only on a short in-memory deduplication window. Rebalances, disaster recovery, retention changes, and manual replays outlive process memory.

## Calculate Fan-Out Before Adding Replicas

For one input class, estimate the maximum Workflow creation rate as:

```text
input events/second
  * matching Sensor resources
  * matching triggers per Sensor round
  * Workflows created per trigger
```

Sensor replicas are not an additional multiplier when the Kafka EventBus coordinates them correctly. Duplicate Sensor resources, separate consumer groups, and multiple matching triggers are multipliers. Broad `||` conditions expand the set of events that can fire a trigger.

Each Sensor defaults to its own Kafka consumer-group name. With those default group names, two Sensors that depend on the same EventSource are independent subscribers, so both can legitimately react to the same CloudEvent. That is fan-out, not a Kafka duplicate. Inventory every Sensor subscription before calling an action unexpected.

## Put Limits at Several Boundaries

A robust design contains overload at more than one point:

- filter irrelevant messages in the Kafka EventSource when a simple source expression is sufficient;
- use Sensor dependency filters before trigger conditions;
- apply `limitEventsPerSecond` to Kafka consumer-group input when the EventSource must pace each partition claim;
- apply a trigger `rateLimit` for local action pacing;
- use Workflow controller parallelism and synchronization limits for execution concurrency;
- enforce namespace `ResourceQuota` and `LimitRange` policies;
- protect the Kubernetes API with realistic client and platform limits;
- retain enough Kafka data to survive the longest expected backlog.

The Sensor trigger rate limiter is process-local. With an active-active Kafka Sensor, each replica has its own limiter, so aggregate rate can approach `replicas * requestsPerUnit`. It is not a cluster-wide ceiling. If the business contract requires 25 Workflow creates per second across four replicas, use a shared admission service, reduce each local limit conservatively, or enforce a downstream distributed quota.

Rate limiting also does not reduce upstream data volume. It moves waiting into the pipeline. Alert on Kafka consumer lag and oldest-message age so a stable Workflow rate does not hide an unbounded backlog.

## Plan Rebalances and Failure Tests

Kafka scaling changes cause consumer-group rebalances. A rebalance is expected, but an unhealthy loop produces latency spikes and repeated work. Test:

1. scaling a Kafka-backed Sensor from one to the intended replica count;
2. deleting the active Kafka EventSource pod and measuring leader failover;
3. deleting a Sensor pod during a slow trigger;
4. broker loss and recovery while offsets are uncommitted;
5. a full stop longer than normal, followed by backlog drain;
6. target acceptance followed by a forced client timeout;
7. accidental deployment of a second Sensor with the same dependency.

Count unique source IDs, Sensor successes, Workflow objects, and unique business operations. A one-to-one count at the Workflow layer is not enough if a Workflow retries a non-idempotent external call.

## Monitor Both Throughput and Cardinality

Argo Events exposes these useful Prometheus metrics:

- `argo_events_events_sent_total` and `argo_events_events_sent_failed_total` by EventSource and event name;
- `argo_events_events_processing_failed_total` for broader source processing failures;
- `argo_events_action_triggered_total`, `argo_events_action_failed_total`, and `argo_events_action_retries_failed_total` by Sensor and trigger;
- event processing and action duration summaries.

Add Kafka lag, partition assignment, rebalance rate, topic storage, broker request latency, and under-replicated partition metrics. Add Workflow creation and phase counts. Alert on ratios and gaps, such as accepted input increasing while successful actions remain flat, rather than on pod CPU alone.

## Official Documentation

- [Argo Events Kafka EventSource](https://argoproj.github.io/argo-events/eventsources/setup/kafka/)
- [Argo Events EventSource high availability](https://argoproj.github.io/argo-events/eventsources/ha/)
- [Argo Events Kafka EventBus](https://argoproj.github.io/argo-events/eventbus/kafka/)
- [Argo Events Sensor high availability](https://argoproj.github.io/argo-events/sensors/ha/)
- [Argo Events trigger rate limits](https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/)
- [Argo Events Prometheus metrics](https://argoproj.github.io/argo-events/metrics/)
- [Apache Kafka consumer design](https://kafka.apache.org/documentation/#consumerconfigs)

## Conclusion

Use Kafka EventSource replicas for failover, not input parallelism. Use Kafka EventBus partitions and Sensor `spec.replicas` for active-active processing, then budget the downstream fan-out explicitly. Kafka coordination reduces duplicate evaluation inside Argo, but idempotency at the business boundary, distributed quotas, lag monitoring, and rebalance drills are what keep high throughput from becoming duplicate work or a Workflow storm.
