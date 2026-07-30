# Migrating ActiveMQ Classic Virtual Topics to Artemis Addresses and Queues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ Classic, Apache Artemis, Virtual Topics, OpenWire, Message Migration

Description: Preserve Classic virtual-topic fan-out and competing-consumer behavior by mapping each logical subscription to an Artemis multicast queue and validating the cutover explicitly.

---

An ActiveMQ Classic virtual topic combines topic fan-out with queue consumption. A producer sends to a topic such as `VirtualTopic.Orders`, while system A consumes from the queue `Consumer.A.VirtualTopic.Orders` and system B consumes from `Consumer.B.VirtualTopic.Orders`. Each system gets its own copy, and multiple consumers within one system compete on that system's queue.

Apache Artemis represents that topology directly:

- `VirtualTopic.Orders` becomes a **multicast address**;
- `Consumer.A.VirtualTopic.Orders` and `Consumer.B.VirtualTopic.Orders` become queues bound to that address;
- consumers can select a particular queue with the fully qualified queue name (FQQN) syntax `address::queue`.

This is a semantic migration, not a string replacement. Choose whether to retain Classic OpenWire destination names temporarily or move applications to native Artemis addressing.

## First Capture the Existing Contract

Do not start with `broker.xml`. Inventory what the Classic broker actually does:

- every virtual-topic name and any custom `name`, `prefix`, or `postfix`;
- each consumer-queue name and whether multiple processes compete on it;
- selectors and whether the Classic virtual topic has `selectorAware="true"`;
- message groups, exclusive consumers, priorities, expiration, and dead-letter policy;
- durable versus non-durable delivery;
- network connectors and whether they forward the virtual topic, the consumer queues, or both;
- current queue depth, oldest-message age, in-flight messages, and producer rate.

Classic's documented default convention covers `VirtualTopic.>` with consumer queues matching `Consumer.*.VirtualTopic.>`. A customized virtual destination does not automatically match the Artemis compatibility example.

## Option 1: Keep Existing OpenWire Client Names

Artemis has an OpenWire virtual-topic translation specifically for existing Classic consumers. On the OpenWire acceptor, configure the documented mapping:

```xml
<acceptor name="artemis">tcp://localhost:61616?protocols=OPENWIRE;virtualTopicConsumerWildcards=Consumer.*.%3E%3B2</acceptor>
```

The URL-encoded value represents the mapping `Consumer.*.>;2`. With it, Artemis translates:

```text
Consumer.A.VirtualTopic.Orders
```

to:

```text
VirtualTopic.Orders::Consumer.A.VirtualTopic.Orders
```

That FQQN identifies the multicast address and the queue for system A. The integer `2` tells the mapping how many path components identify the consumer portion.

This route minimizes application changes, but it is still not “Classic running on Artemis.” Test the exact OpenWire client version and all Classic extensions the application uses. The Artemis documentation describes its OpenWire-specific options and examples, but it is not a comprehensive compatibility matrix for every Classic broker extension.

### Treat selectors as a migration decision

The mapping supports an optional `selectorAware` parameter. When enabled, a selector from the OpenWire consumer is transferred to the auto-created subscription queue as a persistent queue filter.

That can avoid retaining messages that no consumer selector could ever match, but it changes where filtering occurs. A queue filter decides whether a message enters the queue; a consumer selector filters messages already in a queue. If several consumers of the same logical queue use different or changing selectors, do not enable or change selector-aware behavior without a dedicated test.

## Option 2: Model the Topology Natively

For a controlled migration, pre-create the multicast address and its durable subscription queues:

```xml
<addresses>
   <address name="VirtualTopic.Orders">
      <multicast>
         <queue name="Consumer.A.VirtualTopic.Orders">
            <durable>true</durable>
         </queue>
         <queue name="Consumer.B.VirtualTopic.Orders">
            <durable>true</durable>
         </queue>
      </multicast>
   </address>
</addresses>
```

Producers send to `VirtualTopic.Orders` with topic/multicast semantics-for example, by using a JMS `Topic` or a protocol-specific multicast indication. Sending with queue/anycast semantics is not interchangeable. A consumer for system A connects to:

```java
Queue systemA =
    session.createQueue(
        "VirtualTopic.Orders::Consumer.A.VirtualTopic.Orders"
    );
MessageConsumer consumer = session.createConsumer(systemA);
```

The FQQN syntax is useful because JMS and several wire protocols do not otherwise expose Artemis's distinction between an address and a queue. Multiple consumers using the same FQQN compete for messages on that queue. System B uses its own queue and receives its own multicast copy.

The import in that client depends on the selected API artifact: Artemis publishes separate `javax.jms` and `jakarta.jms` client lines. Keep the broker, client artifact, and source imports aligned.

## Do Not Accidentally Use Anycast

An Artemis **anycast** address routes each message to a single matching queue. A **multicast** address routes a copy to every bound multicast queue.

If `VirtualTopic.Orders` is created as anycast, A and B can compete with one another instead of each receiving a copy. That destroys the virtual-topic contract. Verify the address and every queue's routing type in management; do not rely solely on auto-creation defaults.

Conversely, consumers within system A should share one queue. Creating a new multicast queue per worker gives every worker a copy rather than load balancing work. The intended topology is:

```text
VirtualTopic.Orders (multicast address)
├── Consumer.A.VirtualTopic.Orders
│   ├── A worker 1
│   └── A worker 2
└── Consumer.B.VirtualTopic.Orders
    ├── B worker 1
    └── B worker 2
```

Fan-out happens across queues; competing consumption happens within a queue.

## Decide How Existing Messages Move

Artemis cannot consume a Classic KahaDB directory as its own message journal. Choose a migration policy for every non-empty consumer queue:

### Drain before cutover

Stop or quiesce producers, allow all Classic consumer queues to reach the agreed threshold, stop consumers cleanly, reconcile counts, then switch the clients. This is the simplest option when a maintenance window is acceptable.

### Bridge or relay at the application/protocol layer

Run a controlled relay that consumes each Classic consumer queue and sends directly to the corresponding Artemis queue using its FQQN. Do not send each queue's backlog to the multicast address: those messages are already fanned out, so that would create extra copies on every target queue. Make the relay idempotent, preserve required headers, and record source message ID, target send result, and acknowledgement. A crash between target send and source acknowledgement can duplicate a message, so downstream processing still needs an idempotency key.

Avoid simultaneously forwarding both a Classic virtual topic and its fanned-out consumer queues. Classic's virtual-destination documentation warns that bridging both sides of this topology can fan messages out twice.

### Replay from an application event source

If the messages can be reconstructed from an authoritative database or event log, replay into Artemis with an explicit time range and deduplication key. This often produces a cleaner audit trail than attempting an opaque store conversion.

## Use a Phased Cutover

1. Pre-create the Artemis address and queues; disable ambiguous auto-creation for the migrated namespace if practical.
2. Connect test consumers to each FQQN and verify queue names, routing types, selectors, and security roles.
3. Publish uniquely identified canary messages and prove that A and B each get one copy while workers within A do not each get a copy.
4. Exercise rollback, redelivery, expiration, dead-lettering, and consumer restart.
5. Measure `messageCount`, `deliveringCount`, `messagesAdded`, and acknowledgements on every target queue.
6. Quiesce, drain or relay the Classic backlog, then reconcile application-level IDs rather than trusting only cumulative broker counters.
7. Switch consumers before-or in a tightly controlled sequence with-producers so that no target queue is left unobserved.
8. Retain the Classic store read-only until the reconciliation and rollback window closes.

## Validation Cases That Catch Real Mistakes

Use at least these tests:

| Test | Expected result |
| --- | --- |
| One order, A and B online | One copy enters each system queue |
| Two A workers online | Only one A worker acknowledges the order |
| A offline, B online | A's durable queue retains its copy; B continues |
| A consumer rolls back | The message becomes eligible for A redelivery under the configured policy |
| Message has a selector property | Queue and consumer filtering matches the documented migration decision |
| Message expires while A is offline | It follows the configured Artemis expiry policy, not a presumed Classic default |
| Broker restarts with queued persistent messages | Durable messages in durable queues remain available |

Also compare message property types, not just names. Selectors distinguish numeric and string values, and a protocol converter can expose headers differently.

## Know When the Migration Is Complete

The work is complete when applications no longer depend on an unexplained compatibility convention. If OpenWire translation remains, document the acceptor mapping and keep it under configuration management. If clients use native FQQNs, document the address-to-queue contract and who owns each durable queue.

Do not delete Classic consumer queues merely because the Artemis queue depth looks plausible. Reconcile business identifiers, duplicate counts, dead-letter counts, and the full cutover interval first.

## Official Documentation

- [ActiveMQ Classic virtual destinations and default virtual-topic naming](https://activemq.apache.org/components/classic/documentation/virtual-destinations)
- [Apache Artemis OpenWire virtual-topic consumer translation](https://artemis.apache.org/components/artemis/documentation/latest/openwire.html)
- [Apache Artemis address model, multicast queues, and FQQNs](https://artemis.apache.org/components/artemis/documentation/latest/address-model.html)
- [Apache Artemis filter expressions](https://artemis.apache.org/components/artemis/documentation/latest/filter-expressions.html)
- [Apache Artemis management API](https://artemis.apache.org/components/artemis/documentation/latest/management.html)
- [Apache Artemis message redelivery and undelivered messages](https://artemis.apache.org/components/artemis/documentation/latest/undelivered-messages.html)
