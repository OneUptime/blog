# ActiveMQ Consumer Is Connected but Not Receiving Messages: A Debugging Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ, JMS, Message Consumer, Troubleshooting, Message Selectors

Description: Trace a connected but idle consumer from destination and routing identity through eligibility, dispatch, acknowledgement, and application-thread evidence.

---

A TCP connection proves only that a client reached a broker endpoint. It does not prove that the JMS connection was started, that the consumer attached to the intended destination, that a message matches its selector, or that another consumer has not already reserved the work.

Debug from the broker outward. First establish where the message is, then determine why this consumer is or is not eligible.

## 1. Record the Exact Runtime Identity

Capture these values from the running process, not a deployment template:

- broker host, port, protocol, and resolved IP;
- broker product and version—ActiveMQ Classic or Artemis;
- client artifact and version;
- `javax.jms` or `jakarta.jms` API;
- client ID, connection ID, session mode, and acknowledgement mode;
- destination object type, physical name, and selector;
- transaction ID or framework listener-container state.

In a failover URI, also record the broker to which the client is currently attached. A healthy connection to a disaster-recovery broker with an empty destination looks like a consumer bug.

## 2. Verify Destination and Routing Identity

### ActiveMQ Classic

A JMS queue named `Orders` and a JMS topic named `Orders` are different destination domains. Check whether the producer used a `Queue` while the consumer created a `Topic`, or vice versa. Names are also case-sensitive.

For a Classic virtual topic, the producer normally sends to `VirtualTopic.Orders`, while a logical consumer reads a queue such as `Consumer.Billing.VirtualTopic.Orders`. Consuming directly from the topic gives ordinary topic-subscription behavior, not the billing consumer queue's backlog.

### Artemis

Artemis routes messages from an address to queues using `ANYCAST` or `MULTICAST`:

- anycast sends to one matching queue;
- multicast sends a copy to every matching multicast queue.

Inspect the actual address, queue, routing type, and filter. If a consumer must target a specific queue, use or verify the fully qualified queue name:

```text
OrdersAddress::BillingOrders
```

An auto-created resource with the wrong routing type can accept the connection while receiving none of the producer's messages. Artemis explicitly documents that a message with a routing-type property is routed only to queues with the matching type.

## 3. Make Sure Message Delivery Was Started

With the classic JMS connection API, creating a consumer is not enough:

```java
Connection connection = factory.createConnection();
Session session =
    connection.createSession(false, Session.CLIENT_ACKNOWLEDGE);
MessageConsumer consumer =
    session.createConsumer(session.createQueue("Orders"));

connection.start();
```

ActiveMQ Classic's official troubleshooting page calls a missing `connection.start()` a common cause of a connected consumer receiving nothing.

Frameworks normally start the connection for you, but lifecycle can be paused. Check that the listener container, route, or application context is actually running rather than merely initialized.

## 4. Prove That the Expected Message Reached This Queue

Inspect current and delta metrics over a fixed interval.

For Classic:

- `EnqueueCount`;
- `DequeueCount`;
- `QueueSize`;
- `InFlightCount`;
- `ConsumerCount`;
- `ExpiredCount`.

For Artemis:

- `messagesAdded`;
- `messagesAcknowledged`;
- `messageCount`;
- `deliveringCount`;
- `consumerCount`;
- `scheduledCount`;
- queue `paused` and `enabled` state.

Do not treat `QueueSize` or `messageCount` as a ready-only count. Classic `QueueSize` includes unacknowledged in-flight messages. Artemis `messageCount` includes scheduled, paged, and in-delivery messages, so compare it with `deliveringCount` and `scheduledCount` to isolate ordinary ready work.

Interpret the combinations:

| Evidence | Likely direction |
| --- | --- |
| Enqueue/messages-added does not advance | Producer sent elsewhere, transaction did not commit, routing/filter rejected it, or send failed |
| Derived ready count grows with zero consumers | Consumer attached to another queue/broker or failed to create |
| Derived ready count grows with consumers but delivery stays zero | Selector, paused dispatch, exclusivity, grouping, consumer priority, or dispatch thresholds |
| In-flight/delivering is high and acknowledgements are flat | A consumer owns messages but is blocked or not acknowledging |
| Acknowledgements advance | A consumer is acknowledging work; use per-consumer evidence to identify it |

Cumulative counters can reset on broker restart and cannot identify a particular message. Trace a business ID or message ID through producer logs, broker browse, consumer logs, expiry, and DLQ.

## 5. Check Selectors and Queue Filters

A selector can make a healthy consumer intentionally receive nothing:

```java
MessageConsumer consumer =
    session.createConsumer(queue, "region = 'eu' AND priority >= 5");
```

Under JMS selector three-valued logic, a missing property normally produces `UNKNOWN`, which does not match. Property types matter: the string `"5"` is not the numeric value `5`. Property names and quoted string values are case-sensitive.

Artemis has two filter locations:

- a **queue filter** runs before routing into the queue;
- a **consumer filter** runs after messages are already in the queue.

If the queue filter rejects a message, it never contributes to that queue's depth. If a consumer filter rejects ready messages, they can remain for another eligible consumer. Inspect both.

For Classic virtual topics with `selectorAware=true`, verify which active consumer selectors—and, if configured, which selectors in `virtualSelectorCacheBrokerPlugin`—were considered when the broker fanned out the message. Without the cache plugin, disconnected consumers' selectors are not considered. Do not assume a selector added after backlog accumulated will clean up old unmatched messages.

## 6. Find Another Consumer Holding the Messages

Classic prefetch can dispatch a large batch to the first consumer. The Classic documentation gives a typical case where consumer A prefetched all 100 messages before consumer B connected; B received nothing until A stopped or new messages arrived.

Check:

- each consumer's connection and remote address;
- prefetch or consumer byte window;
- pending and dispatched/in-transit counts per consumer;
- last delivery and last acknowledgement time;
- pooled consumers that remain open;
- stale connections waiting for inactivity detection.

The native Artemis Core client, including the Artemis JMS client built on it, uses `consumerWindowSize` in bytes. The ActiveMQ Classic OpenWire client uses count-based prefetch, including when it connects to Artemis. Tune the setting for the client protocol in use.

## 7. Check Eligibility Features

An attached consumer can be valid but not selected:

- an **exclusive consumer/queue** owns all delivery;
- `JMSXGroupID` pins a message group to another live consumer;
- consumer priority prefers another subscriber;
- `noLocal` on an unshared topic subscription suppresses messages from its own connection; for an unshared durable subscription it also applies to other connections with the same client ID;
- a durable-topic reconnect used a different client ID or subscription name;
- Artemis `consumers-before-dispatch` is waiting for more consumers;
- Artemis `delay-before-dispatch` has not elapsed;
- a queue is paused;
- a browser is connected but is non-destructive and is not a work consumer.

Inspect effective broker state rather than only source configuration. Runtime management changes and auto-created resources can differ from files.

## 8. Verify Producer Completion

A producer can log “sent” before the broker makes a message visible:

- a transacted JMS session has not committed;
- an XA transaction remains active or prepared;
- a supported asynchronous send later failed;
- producer flow control is blocking the send;
- the message was sent with a supported JMS delivery delay or broker-specific schedule;
- its expiration time passed before delivery.

Correlate send/commit completion with broker `messagesAdded` or `EnqueueCount`. In Artemis, `scheduledCount` distinguishes scheduled messages from ordinary ready work.

## 9. Inspect Acknowledgement, Redelivery, Expiry, and DLQ

The target message may already have been:

- dispatched but not acknowledged;
- rolled back and delayed for redelivery;
- expired;
- moved to a dead-letter address/queue after maximum attempts;
- acknowledged by an application that failed afterward.

Check the redelivery and dead-letter policy for the exact destination match. A poison message repeatedly delivered to another consumer can dominate logs while later messages wait because of ordering or grouping.

Never purge a queue to test this theory. Browse a small sample and inspect the DLQ non-destructively.

## 10. Verify the Application Can Run the Callback

If broker delivery advances but business logs do not:

- take a thread dump;
- inspect listener executor queue and active threads;
- check downstream connection-pool exhaustion;
- look for a lock held across `onMessage`;
- verify the framework did not stop the listener after an exception;
- inspect long garbage-collection pauses and client heap;
- confirm the callback is not blocked on logging or tracing export.

The broker sees delivery to the client library, not completion of application code. Packet capture is rarely the first tool once broker in-flight metrics prove the transfer.

## Use a Controlled Probe

On a dedicated test destination, create one consumer with no selector, explicitly start the connection, send a persistent message with a unique ID, receive it with a bounded timeout, and acknowledge or commit it. Do not add a probe consumer to a production work queue: it can steal and acknowledge real messages.

A JMS `QueueBrowser` can inspect ready queue messages non-destructively, but it does not prove topic history and may not show messages already in flight. Management browse limits also mean that an absent message in the first page is not proof it never arrived.

## A Fast Decision Order

1. Same broker?
2. Same destination type, address, queue, and routing type?
3. Connection or listener started?
4. Message added to this queue?
5. Message ready, scheduled, delivering, acknowledged, expired, or dead-lettered?
6. Selector and queue filter match?
7. Another consumer, exclusive owner, or group owns it?
8. Producer transaction committed?
9. Application callback thread runnable?

That sequence turns “connected but idle” into a specific routing, eligibility, delivery, or application-lifecycle problem.

## Official Documentation

- [ActiveMQ Classic: consumer receives no messages](https://activemq.apache.org/components/classic/documentation/i-am-not-receiving-any-messages-what-is-wrong)
- [ActiveMQ Classic: why a second consumer receives nothing](https://activemq.apache.org/components/classic/documentation/i-do-not-receive-messages-in-my-second-consumer)
- [ActiveMQ Classic queue metrics](https://activemq.apache.org/components/classic/documentation/how-do-i-find-the-size-of-a-queue)
- [ActiveMQ Classic virtual destinations](https://activemq.apache.org/components/classic/documentation/virtual-destinations)
- [Jakarta Messaging 3.1 selectors, connection lifecycle, and transactions](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1.html)
- [Apache Artemis address model, routing types, FQQNs, and filters](https://artemis.apache.org/components/artemis/documentation/latest/address-model.html)
- [Apache Artemis management API](https://artemis.apache.org/components/artemis/documentation/latest/management.html)
- [Apache Artemis `QueueControl` attributes](https://artemis.apache.org/components/artemis/documentation/javadocs/javadoc-latest/org/apache/activemq/artemis/api/core/management/QueueControl.html)
