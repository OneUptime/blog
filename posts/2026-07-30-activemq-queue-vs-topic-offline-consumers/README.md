# ActiveMQ Queue vs Topic: What Happens When Consumers Are Offline?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ, JMS, Message Queue, Publish Subscribe, Durable Subscription

Description: Understand which queue and topic messages remain available while consumers are offline, and which durability settings are required across broker failure.

---

A queue keeps work for an eligible consumer. A topic publishes a copy to each subscription that exists at the time of publication. That simple distinction explains most offline-consumer behavior, but three separate concepts are often mixed together:

1. the destination pattern—queue or topic;
2. the subscription lifetime—non-durable or durable;
3. the message delivery mode—persistent or non-persistent.

You need all three to predict what survives an offline interval or broker restart.

## The Short Answer

| Destination and subscription | Consumer offline when message arrives | After broker failure/restart |
| --- | --- | --- |
| JMS queue | Message remains for a future eligible queue consumer, subject to expiry and broker retention policy | Persistent messages are designed to survive; non-persistent messages may be lost |
| Topic, non-durable subscription | Offline consumer gets no copy | No subscription backlog exists to recover |
| Topic, existing durable subscription | Broker retains a copy for that subscription | Use persistent delivery and durable broker storage when the copy must survive provider failure |
| Topic, durable subscription not yet created | No historical copy is created for a future subscription | Nothing to recover |

“Durable topic” is imprecise. The durable object is a **subscription** with an identity. Other subscribers on the same topic have their own independent lifetimes.

## Queue: Work Waits for an Eligible Consumer

Jakarta Messaging queue semantics are point-to-point. A message is delivered to one consumer, not one copy per consumer. If there is no consumer, the provider retains the queued message until an eligible consumer receives and acknowledges it, unless another rule removes it.

Those removal rules matter:

- a time-to-live can expire the message;
- an administrative retention or capacity policy can discard or reject it;
- a dead-letter policy can move it after failed deliveries;
- an operator can purge or move it;
- a non-persistent message can be lost if the provider fails.

If a consumer receives a message but disconnects before acknowledgement, the broker makes it eligible for redelivery according to acknowledgement, transaction, and redelivery policy. A message prefetched to an offline or failed client may therefore look absent from the ready list while remaining unacknowledged.

Multiple queue consumers compete. If consumer A is offline, consumer B can process the work. The broker does not reserve a queue message for A unless another feature—such as an exclusive consumer, message group, selector, or consumer priority—makes B ineligible.

## Non-Durable Topic Subscription: Offline Means No Copy

A normal topic subscription exists only while its consumer is active. Messages published before it connects or while it is disconnected are not saved for that consumer.

For example:

```text
subscriber connects     receives M1, M2
subscriber disconnects  misses M3, M4
subscriber reconnects   receives M5 onward
```

Changing M3 and M4 to persistent delivery does not create a subscription. Persistent delivery protects transport to destinations and eligible subscriptions; it does not turn every future topic consumer into a historical subscriber.

If an application needs “latest state on connect” rather than every missed event, model that requirement explicitly. A retained-message, last-value, compacted-state, or database-snapshot pattern is different from a durable event subscription.

## Durable Topic Subscription: Identity Creates the Backlog

A durable subscription tells the provider to retain matching topic messages while its consumer is inactive. The subscription must exist before the offline publication interval.

With the classic JMS API, an unshared durable subscription is identified by:

- the connection's client ID; and
- the durable subscription name.

A minimal pattern is:

```java
connection.setClientID("billing-service");
Session session =
    connection.createSession(false, Session.CLIENT_ACKNOWLEDGE);
Topic topic = session.createTopic("Invoices");
TopicSubscriber subscriber =
    session.createDurableSubscriber(topic, "invoice-events");
connection.start();
```

For Classic 5.x the imports are normally from `javax.jms`; Classic 6.x and a Jakarta Artemis client use `jakarta.jms`. Do not mix those artifacts in one example merely because the interfaces have similar names. Shared durable consumers are a newer API feature, and ActiveMQ Classic's JMS 2/Jakarta support is version-dependent, so verify them against the selected client line.

Reconnect with the same identity and a compatible topic/selector/no-local definition. Accidentally changing the client ID or subscription name creates or addresses a different subscription and leaves the original backlog untouched.

The Jakarta Messaging specification adds an important durability caveat: delivery of a non-persistent message to a queue or to an inactive durable subscription is not guaranteed if the provider shuts down and restarts. If the offline backlog must survive provider failure, send persistent messages and use durable broker storage with sufficient retention.

## How ActiveMQ Classic Represents This

Classic exposes queues and topics directly as JMS destinations:

- a queue holds one copy for competing consumers;
- a non-durable topic subscription receives only while active;
- a durable topic subscription holds its own logical copy while inactive.

Classic identifies a durable subscription by client ID and subscription name. Its virtual topics are a broker-specific alternative: a producer publishes to `VirtualTopic.X`, and each logical subscriber consumes from its own physical queue such as `Consumer.A.VirtualTopic.X`. Offline behavior then follows the consumer queue, not a regular non-durable topic subscription.

When debugging Classic, inspect both the destination and the subscription identity. A queue named `Orders` and a topic named `Orders` are different JMS destination domains even though the physical strings match.

## How Artemis Represents This

Artemis maps the API concepts to addresses and queues:

- an anycast address with a queue provides competing-consumer behavior;
- a multicast address routes a copy to each bound subscription queue;
- a non-durable topic subscription normally uses a temporary queue;
- a durable topic subscription uses a durable queue named from the protocol's subscription identity.

A basic queue topology is:

```xml
<addresses>
   <address name="Orders">
      <anycast>
         <queue name="Orders"/>
      </anycast>
   </address>
</addresses>
```

A topic address can be declared with `<multicast/>`; the protocol manager creates the appropriate subscription queues:

```xml
<addresses>
   <address name="InvoiceEvents">
      <multicast/>
   </address>
</addresses>
```

Artemis can also pre-create a durable multicast queue and address it with an FQQN such as `InvoiceEvents::billing.invoice-events`. That is useful for explicit topology, but it is an Artemis address/queue contract, not a Classic durable-subscriber configuration.

Check `purge-on-no-consumers`, auto-delete settings, queue durability, and routing type before assuming offline retention. A queue deliberately configured to purge or disappear when its last consumer leaves does not provide a durable backlog.

## Diagnose an Offline-Message Complaint

Work through the timeline:

1. Was the producer using a queue or topic object?
2. For a topic, did the durable subscription already exist before publication?
3. Did the reconnect use exactly the same client ID, subscription name, selector, and no-local setting?
4. Was the message persistent or non-persistent?
5. Did its expiration time pass?
6. Did a broker policy expire, dead-letter, purge, ring-buffer, or auto-delete it?
7. Did another eligible queue consumer acknowledge it?
8. Is it currently in delivery to a consumer rather than ready?
9. Did the producer's transaction commit?
10. Did a protocol mapping create a different Artemis address, queue, or routing type than expected?

Use message IDs and business IDs to trace a few samples. Cumulative enqueue counters alone cannot prove that a particular subscription received a copy.

## Choose the Pattern from the Business Contract

Use a queue when one worker in a pool should process each command or job. Use a topic when every interested application needs its own copy. Add a durable subscription when a topic consumer must catch up after being offline. Use persistent delivery when loss across broker failure is unacceptable, then verify storage, acknowledgement, retention, and failover as one end-to-end contract.

Neither a durable subscription nor persistent delivery replaces idempotent processing. A consumer can complete an external side effect and crash before its acknowledgement commits, causing legitimate redelivery.

## Official Documentation

- [Jakarta Messaging 3.1 specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1.html)
- [Jakarta Messaging delivery modes](https://jakarta.ee/specifications/messaging/3.1/apidocs/jakarta.messaging/jakarta/jms/deliverymode)
- [ActiveMQ Classic: queue compared with topic](https://activemq.apache.org/components/classic/documentation/how-does-a-queue-compare-to-a-topic)
- [ActiveMQ Classic: durable queues and topics](https://activemq.apache.org/components/classic/documentation/how-do-durable-queues-and-topics-work)
- [ActiveMQ Classic virtual destinations](https://activemq.apache.org/components/classic/documentation/virtual-destinations)
- [Apache Artemis address model and subscription queues](https://artemis.apache.org/components/artemis/documentation/latest/address-model.html)
- [Apache Artemis mapping of JMS concepts to the core API](https://artemis.apache.org/components/artemis/documentation/latest/jms-core-mapping.html)
