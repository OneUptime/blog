# Argo Events EventBus: JetStream vs Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, EventBus, NATS JetStream, Apache Kafka, Kubernetes, Event Streaming, Scalability

Description: Choose an Argo Events EventBus by comparing managed JetStream with external Kafka across scaling, persistence, security, and operations.

---

Argo Events currently supports both NATS JetStream and Kafka as EventBus implementations. The official guidance recommends JetStream for getting started and Kafka when event volume and horizontally scaled Sensors justify an existing Kafka platform.

Kafka EventBus is not marked deprecated in the current Argo Events documentation or API. Legacy NATS Streaming, often called STAN, is the older option. Always check the release notes for the exact version you deploy because EventBus support has evolved.

## Compare the Ownership Model First

An Argo-managed JetStream EventBus creates a NATS StatefulSet, Services, configuration, credentials, and optional persistent volumes in the EventBus namespace:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: EventBus
metadata:
  name: default
  namespace: argo-events
spec:
  jetstream:
    version: 2.10.29
    replicas: 3
    persistence:
      storageClassName: standard
      accessMode: ReadWriteOnce
      volumeSize: 20Gi
```

The version must exist in the installed `argo-events-controller-config`. Do not copy `2.10.29` into another release without checking.

A Kafka EventBus points to a cluster Argo Events does not manage:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: EventBus
metadata:
  name: default
  namespace: argo-events
spec:
  kafka:
    url: kafka-0.kafka.svc:9092,kafka-1.kafka.svc:9092
    topic: argo-events-production
```

The optional Kafka `version` field configures the client protocol compatibility expected by Argo's Kafka library; it does not install or upgrade brokers. When omitted, the current Kafka EventBus API documents the oldest stable version supported by its client as the default. Set it deliberately only after confirming that the Kafka client bundled with your Argo Events release recognizes the value and that it is compatible with the brokers.

If your team has no Kafka operations capability, choosing Kafka transfers a large platform problem into the event pipeline. If Kafka is already a governed shared service with backups, authentication, quotas, monitoring, and on-call ownership, reusing it can reduce duplicated infrastructure.

## Understand the Data Model

Argo's JetStream implementation uses one stream named `default` and subjects shaped as:

```text
default.{eventSourceName}.{eventName}
```

Sensors use durable consumers for subjects they need. Stream limits such as `maxAge`, `maxMsgs`, `maxBytes`, retention, discard policy, replica count, and duplicate window come from the controller config and optional `streamConfig` overrides.

For Kafka, the default event topic is derived from namespace and EventBus name unless `topic` is set. Current Argo Events uses three topics per Sensor path: the shared event topic plus Sensor-specific trigger and action topics for internal coordination. Topics must exist unless broker auto-creation is enabled. Argo's documentation recommends at least as many event-topic partitions as Sensor replicas.

Topic auto-creation is convenient in a demo but weak production governance. Create topics with reviewed partition count, replication factor, retention, min in-sync replicas, and ACLs.

## Compare Sensor Scaling

With JetStream, Sensor high availability is active-passive. Set `spec.replicas` on the Sensor resource; do not manually scale the generated Deployment. One active replica processes while standbys participate in leader election.

With Kafka EventBus, current Argo Events supports horizontally scaled Sensors in active-active processing, using Kafka partitions to distribute events. Partition count caps useful consumer parallelism. More Sensor pods than relevant partitions do not create corresponding parallel consumption.

This difference is often the deciding factor for sustained high throughput. It does not remove downstream limits. Ten active Sensor replicas can create an uncontrolled Workflow fan-out unless quotas, rate limits, and workflow concurrency are designed.

EventSource HA is separate. Many EventSource types are active-passive even with Kafka EventBus. Do not assume Kafka makes every source active-active.

## Compare Persistence and Recovery

JetStream can persist messages to files on PVCs and replicate stream data across NATS replicas. Persistent volumes protect against pod replacement; replicas protect against a bounded number of node failures while quorum remains. Neither is a backup. NATS documents stream snapshots and restore for disaster recovery.

Kafka persists partition logs on brokers according to topic retention and replication. Recovery quality depends on broker replication, in-sync replica policy, storage durability, cluster placement, and backup or cross-cluster replication processes owned outside Argo Events.

Ask both options the same questions:

- What event loss is possible after one node, zone, or cluster failure?
- How long can a Sensor be offline before retention deletes events?
- What happens when storage reaches its limit?
- How is a deleted stream/topic restored?
- Are consumer positions included in recovery?
- When was a restore tested?

## Compare Security

For Argo-managed JetStream, Argo Events enables TLS for client-server and inter-node communication and uses password authentication for clients by default. The controller creates and distributes required Secrets. Restrict Secret access and network paths even though defaults are secure.

Kafka EventBus exposes `tls` and `sasl` configuration in the CRD. Kafka security is external: broker listeners, certificate authorities, SASL mechanism, ACLs, principal lifecycle, and topic permissions must align with the Argo Events client configuration.

Use a separate principal or credential per environment and EventBus. The EventBus's TLS/SASL configuration is shared by its EventSources and Sensors, so its Kafka principal needs the combined topic, consumer-group, and transactional-ID permissions used by both paths; Argo does not expose separate producer and Sensor credentials within one EventBus. Validate actual broker authorization logs rather than granting broad cluster ACLs.

## Compare Operational Surface

JetStream advantages:

- installed and reconciled through the EventBus resource;
- small default footprint for a Kubernetes-local pipeline;
- automatic TLS and client credentials;
- fewer external dependencies;
- direct Argo-specific stream configuration.

JetStream costs:

- your Argo/Kubernetes team owns NATS capacity, quorum, PVCs, upgrades, and restore;
- active-passive Sensors limit per-Sensor processing parallelism;
- controller-supported NATS versions must be managed carefully.

Kafka advantages:

- active-active Sensor scaling across partitions;
- established large-scale retention and broker tooling;
- shared platform ownership when Kafka already exists;
- independent broker lifecycle.

Kafka costs:

- an external cluster, one shared event topic, and two Sensor-specific coordination topics per Sensor;
- partition, group, retention, ACL, TLS, and SASL administration;
- more complex failure and rebalance behavior;
- network dependency between Kubernetes and brokers.

## Benchmark the Complete Trigger Path

Do not select by broker messages per second alone. Measure:

```text
source acceptance -> EventBus publish -> Sensor filter -> trigger API -> target admission
```

Record p50, p95, and p99 latency, duplicate rate, failed actions, backlog, and Workflow creation rate. Test small and maximum payloads, expensive transforms, failed targets, and a Sensor restart.

The target Kubernetes API and Workflow controller often become bottlenecks before Kafka or JetStream. A faster broker can make overload arrive faster.

## Use a Decision Rule

Choose managed JetStream when the event pipeline is Kubernetes-local, operational simplicity matters, throughput fits active-passive Sensor processing, and your team can own a small NATS cluster.

Choose Kafka when a reliable Kafka service already exists, sustained volume requires partitioned active-active Sensors, retention or ecosystem integration needs Kafka, and the platform team accepts Argo's internal topic and consumer-group model.

Use `jetstreamExotic` when an independently managed NATS JetStream service is the actual organizational standard. It changes ownership and credentials, so review its API separately rather than assuming managed-JetStream defaults.

## Official Documentation

- [Argo Events JetStream EventBus](https://argoproj.github.io/argo-events/eventbus/jetstream/)
- [Argo Events Kafka EventBus](https://argoproj.github.io/argo-events/eventbus/kafka/)
- [Argo Events Sensor high availability](https://argoproj.github.io/argo-events/sensors/ha/)
- [Argo Events EventSource high availability](https://argoproj.github.io/argo-events/eventsources/ha/)
- [NATS JetStream concepts](https://docs.nats.io/nats-concepts/jetstream)
- [Apache Kafka design](https://kafka.apache.org/documentation/#design)

## Conclusion

JetStream gives Argo-managed, Kubernetes-local event transport with secure defaults and active-passive Sensors. Kafka gives externally operated partitioned transport and active-active Sensor scaling. Choose by ownership and measured end-to-end load, then test retention, duplicates, failover, and downstream backpressure instead of treating the broker as the whole system.
