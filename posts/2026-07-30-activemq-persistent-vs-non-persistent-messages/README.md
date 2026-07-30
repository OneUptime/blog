# Persistent vs Non-Persistent ActiveMQ: Guarantees and Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ, Message Persistence, JMS, Delivery Guarantee, Performance

Description: Select persistent or non-persistent delivery from the acceptable failure outcome, then benchmark the complete acknowledgement and storage path.

---

Persistent and non-persistent are JMS delivery modes, not synonyms for “queue” and “topic.” Either destination can carry either mode. The mode tells the provider how much protection the message needs while being transported to an eligible destination or subscription.

The safe default is simple:

- use **persistent** delivery when losing an accepted message during provider failure is unacceptable;
- use **non-persistent** delivery only when the application explicitly tolerates loss.

Jakarta Messaging makes persistent the producer default. Changing it for speed is an application reliability decision, not a broker tuning trick.

## What the Specification Guarantees

The Jakarta Messaging delivery-mode contract distinguishes two cases:

### `PERSISTENT`

The provider must take extra care so that provider failure does not lose the message in transit. The API documentation describes logging it to stable storage as part of the send. With a sufficient destination retention policy, the provider supplies its once-and-only-once transport guarantee.

### `NON_PERSISTENT`

Stable storage is not required. Provider failure can lose the message. The provider must deliver it at most once: it may be lost, but the delivery mode itself must not cause duplicate delivery.

This contract has limits. Persistent delivery does not override expiration, a full-destination retention policy, an operator purge, storage-media failure, or an application that acknowledges before making its side effect durable. The specification explicitly separates transport durability from administratively configured destination retention.

## Set the Mode on the Producer or Send

Using the classic JMS-style API:

```java
producer.setDeliveryMode(DeliveryMode.PERSISTENT);
producer.send(orderMessage);

producer.send(
    transientUpdate,
    DeliveryMode.NON_PERSISTENT,
    Message.DEFAULT_PRIORITY,
    5_000
);
```

The longer `send` call overrides the producer's default for that message and also gives the transient update a five-second time to live.

With the simplified Jakarta Messaging API:

```java
context.createProducer()
       .setDeliveryMode(DeliveryMode.NON_PERSISTENT)
       .send(destination, update);
```

Use `jakarta.jms` with Classic 6.x or the Artemis Jakarta client. Classic 5.x applications commonly use the corresponding `javax.jms` types. ActiveMQ Classic's JMS 2/Jakarta Messaging support is partial and version-specific, so do not assume every simplified-API method works on every Classic client line.

## Persistent Does Not Mean “Exactly Once Business Processing”

The provider cannot atomically coordinate an arbitrary external side effect unless that resource participates in the same transaction. Consider:

1. the consumer charges a card;
2. the process crashes;
3. the message acknowledgement never reaches the broker;
4. the broker redelivers the persistent message.

The transport correctly protected the message, but the application can charge twice. Use an idempotency key or an atomic inbox/outbox pattern. Treat `JMSRedelivered` and delivery count as diagnostic signals, not as the only deduplication mechanism.

The inverse ordering is also dangerous: acknowledging before the database commit can lose the work if the database operation fails afterward.

## ActiveMQ Classic Behavior

Classic documents persistent delivery as writing messages to its configured disk or database store so they can survive broker restart. Non-persistent messages in transit are lost if the broker is killed.

Classic also has a separate broker-level `persistent` setting. Configuring:

```xml
<broker persistent="false">
```

selects an in-memory persistence adapter for the broker. It is not equivalent to changing just one producer's delivery mode; it removes broker-store durability from the deployment. Do not use that setting in production merely to make a benchmark faster.

Persistent sends are generally synchronous in the Classic OpenWire client unless asynchronous send is enabled, while non-persistent sends are generally asynchronous. That difference changes what the producer knows when `send()` returns. If asynchronous sends must receive broker flow control, Classic documents `producerWindowSize`; `alwaysSyncSend` is another, slower way to make broker resource problems visible to the producer.

The persistence adapter and disk still matter. KahaDB, JDBC, filesystem durability, disk cache behavior, and HA storage determine the real failure boundary behind a persistent send.

## Artemis Behavior

Artemis calls the corresponding core-message property **durable**. A durable message survives a restart only when it is routed to at least one durable queue. A durable message in a non-durable queue does not make that queue survive, and a non-durable message does not become durable merely because the queue is durable.

For non-transacted Core/JMS sends, current Artemis defaults are:

- `blockOnDurableSend=true`;
- `blockOnNonDurableSend=false`.

With `blockOnDurableSend=true`, the client waits for a server response for durable sends. If the durable message reaches a durable queue and `journal-sync-non-transactional=true`-also the documented default-the server waits for durable journal persistence before replying.

For a transacted session, the commit is the synchronization point. Artemis documents `journal-sync-transactional=true` as the default. Disabling either journal-sync setting or disabling blocking can improve a benchmark while weakening what a successful return proves during a crash. Treat such changes as reliability changes and test the intended failure window.

## Where the Performance Cost Comes From

Persistent delivery may add:

- journal or database writes;
- durable synchronization;
- replication or shared-store latency in an HA design;
- transaction commit round trips;
- disk contention while paging or compacting.

Non-persistent delivery can avoid some stable-store work, but it does not remove every copy, network hop, broker queue, or flow-control check. Classic can spool non-persistent backlog to a temporary file cursor, and Artemis still manages non-durable messages in memory and can apply address policies. “Non-persistent” does not promise “memory only at every layer.”

Small single-message synchronous tests exaggerate round-trip cost. Large uncommitted transactions exaggerate memory and recovery risk. Benchmark the batching model the application will actually use.

## Choose by Message Class

Persistent delivery usually fits:

- orders, payments, inventory changes, and audit events;
- commands whose loss creates an unrecoverable business inconsistency;
- an outbox event that is the only handoff to a downstream system;
- durable-subscription events that must survive broker restart.

Non-persistent delivery can fit:

- rapidly superseded telemetry or price updates;
- best-effort presence signals;
- cache invalidations that have a periodic full refresh;
- derived data that can be rebuilt from an authoritative source.

Do not make a whole destination non-persistent because most messages are disposable if a minority are critical. Separate message classes or set delivery mode deliberately per send, then make monitoring show the difference.

## Benchmark the Guarantee You Need

Test at least four states:

1. steady-state production and consumption;
2. consumer stopped, building the largest expected backlog;
3. broker process killed immediately after sends or commits return;
4. storage or HA failover under sustained load.

For each acknowledged producer send, record a business ID. After recovery, reconcile IDs as received, expired, dead-lettered, or intentionally dropped. Measure:

- end-to-end acknowledgement throughput;
- send and commit latency percentiles;
- journal or database latency and bandwidth;
- queue depth and drain time;
- duplicates at the business handler;
- messages absent after each injected failure.

If non-persistent delivery is selected, document the exact acceptable-loss scenario. If persistent delivery is selected, keep the broker retention and storage policy strong enough to honor it.

## Official Documentation

- [Jakarta Messaging 3.1 delivery-mode specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1.html)
- [Jakarta Messaging `DeliveryMode` API](https://jakarta.ee/specifications/messaging/3.1/apidocs/jakarta.messaging/jakarta/jms/deliverymode)
- [ActiveMQ Classic persistent versus non-persistent delivery](https://activemq.apache.org/components/classic/documentation/what-is-the-difference-between-persistent-and-non-persistent-delivery)
- [ActiveMQ Classic persistence](https://activemq.apache.org/components/classic/documentation/persistence)
- [ActiveMQ Classic producer flow control and asynchronous sends](https://activemq.apache.org/components/classic/documentation/producer-flow-control)
- [Apache Artemis guarantees of sends and commits](https://artemis.apache.org/components/artemis/documentation/latest/send-guarantees.html)
- [Apache Artemis persistence](https://artemis.apache.org/components/artemis/documentation/latest/persistence.html)
- [Apache Artemis messaging concepts](https://artemis.apache.org/components/artemis/documentation/latest/messaging-concepts.html)
