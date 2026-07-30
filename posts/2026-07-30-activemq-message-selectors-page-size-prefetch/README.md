# ActiveMQ Message Selectors: Page Size, Prefetch, and Hung Consumers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ, ActiveMQ Classic, JMS Selectors, Prefetch, Message Paging

Description: Diagnose an ActiveMQ Classic selector consumer that appears idle by separating selector matching, store paging, and client-side prefetch.

---

A selector consumer can be connected and healthy while receiving nothing because the messages it can accept are not currently available for dispatch. In ActiveMQ Classic, three independent mechanisms shape that result:

1. a JMS selector decides which message properties match;
2. the destination cursor pages a bounded window of stored messages into memory;
3. prefetch reserves dispatched messages in each consumer's client-side buffer.

Tuning only one of those mechanisms can move the symptom without fixing the queue design.

This article covers ActiveMQ Classic. Artemis uses filters and a different paging implementation; Classic properties such as `maxPageSize` are not Artemis address settings.

## Verify the selector before tuning the broker

Standard JMS selectors use a SQL-like expression over headers and message properties, not the body. ActiveMQ Classic also provides a non-portable XPath selector extension for XML message bodies. For example:

```java
MessageConsumer consumer =
    session.createConsumer(queue, "region = 'eu' AND schemaVersion >= 3");
```

Common mistakes include:

- property name case mismatch;
- sending a string such as `"3"` but comparing it as a number;
- a missing property in an ordinary comparison, which yields unknown rather than a match;
- quoting a numeric or Boolean literal incorrectly;
- expecting the selector to inspect JSON body fields;
- setting a transport header rather than a JMS message property;
- creating the consumer on a topic instead of a queue, or vice versa.

Prove the expression with known messages and a minimal consumer. Then browse message properties through JMX or the web console. Browsing does not guarantee that the same paged window is immediately dispatchable, but it confirms what was stored.

## Page size limits the in-memory candidate window

Classic's `maxPageSize` destination policy is the maximum number of messages paged from the store at one time. The documented default is 200.

Selector matching occurs before dispatch on messages in memory. With a large persistent backlog, the current page can be dominated by messages for another selector or message group. A matching message deeper in the store can wait even though the queue's total `QueueSize` is large.

You can raise the setting for a specific queue hierarchy:

```xml
<destinationPolicy>
  <policyMap>
    <policyEntries>
      <policyEntry queue="ORDERS.>" maxPageSize="1000"/>
    </policyEntries>
  </policyMap>
</destinationPolicy>
```

This increases the candidate window, but also increases memory and scanning work. Apply it narrowly and load-test the selector distribution. It is not evidence that every queue should have a huge page.

`maxBrowsePageSize` is a separate setting for management browsing. Raising it makes more messages visible to a browser; it does not directly enlarge the dispatch page.

## Prefetch explains where “missing” messages went

ActiveMQ Classic pushes messages to consumers. The prefetch limit controls how many can be dispatched without acknowledgement. The native queue-consumer default is commonly 1000.

If consumer A starts first with a prefetch larger than the backlog, many messages can be dispatched to its local buffer. They count as in flight rather than available to consumer B. A's acknowledgement removes them from the queue; closing or failing A releases unacknowledged messages for redelivery. A selector on B cannot reclaim messages already validly dispatched to A.

For slow work or competing consumers, configure a smaller prefetch on the client:

```text
tcp://broker.example.com:61616?jms.prefetchPolicy.queuePrefetch=10
```

Or for a specific native ActiveMQ destination:

```java
Queue queue =
    new ActiveMQQueue("ORDERS?consumer.prefetchSize=10");
```

Use the syntax supported by the exact client library. A prefetch of `1` improves fairness for slow processing but increases protocol round trips. A prefetch of `0` makes the Classic consumer poll one message at a time and has different performance characteristics.

## Read the JMX state as a pipeline

For the queue:

- `QueueSize`: messages not yet acknowledged, including stored and potentially in-flight work;
- `InFlightCount`: dispatched but unacknowledged;
- `ConsumerCount`: active subscriptions;
- `DispatchCount`: dispatches since statistics were last reset;
- `DequeueCount`: removals since statistics were last reset, normally through acknowledgement;
- cursor memory/full state through `QueueViewMBean`;
- `MaxPageSize`: effective dispatch page setting.

For subscriptions, inspect selector, dispatched and pending counts, active/slow state, and connection identity.

Typical patterns:

| Observation | Likely direction |
|---|---|
| No consumers | Wrong destination, security failure, consumer creation failure, or disconnected client |
| Consumer present, no matching sample | Selector/property problem |
| High in-flight count on another consumer | Prefetch or stuck worker |
| Large stored backlog, low in-flight, rare match | Page-window/selectivity problem |
| Dequeue rate zero for every selector | Transactions, acknowledgement, or downstream failure |
| Messages move when one consumer closes | Prefetch reservation or dispatch fairness |

Call `connection.start()` after creating the connection. Classic explicitly documents this common omission.

## Do not confuse pending-limit settings

`consumer.maximumPendingMessageLimit` and pending-message limit strategies primarily control how many extra matched messages are retained for slow **non-durable topic** consumers, with older messages potentially discarded. They are not a general queue selector paging fix.

Likewise, a round-robin dispatch policy cannot make an unmatched message valid for a selector. Separate fairness, selection, and paging in the diagnosis.

## Better queue designs for mutually exclusive selectors

If every consumer selects one stable category and a large portion of the queue is irrelevant to each one, selector scanning may be the wrong routing layer. Consider routing at production time to:

```text
ORDERS.EU
ORDERS.US
ORDERS.APAC
```

This gives each backlog independent retention, ownership, alerts, and scaling. Selectors remain useful for occasional filtering and compatible subscribers, but one giant mixed queue couples every category's latency and storage behavior.

If categories must share a queue, ensure at least one consumer can drain each valid property value. Otherwise unmatched messages remain until they expire or are removed, and can hold KahaDB journal files open.

## A disciplined tuning sequence

1. Confirm destination type/name and call `connection.start()`.
2. Inspect the consumer's effective selector and stored property types.
3. Compare queue size with in-flight count and per-consumer dispatch.
4. Reduce excessive prefetch for slow competing consumers.
5. Verify every message category has an eligible consumer.
6. Increase `maxPageSize` narrowly only when evidence shows selective matches are deeper than the page window.
7. Load-test memory, dispatch latency, and fairness.
8. Split the queue when stable routing categories keep interfering.

The consumer is not necessarily hung. Often the broker is faithfully applying a selector to a bounded page while other messages sit in client prefetch buffers.

## Official Documentation

- [ActiveMQ Classic selectors](https://activemq.apache.org/components/classic/documentation/selectors)
- [ActiveMQ Classic prefetch limits](https://activemq.apache.org/components/classic/documentation/what-is-the-prefetch-limit-for)
- [ActiveMQ Classic per-destination policies](https://activemq.apache.org/components/classic/documentation/per-destination-policies)
- [ActiveMQ Classic message groups and page-size behavior](https://activemq.apache.org/components/classic/documentation/message-groups)
- [ActiveMQ Classic destination options](https://activemq.apache.org/components/classic/documentation/destination-options)
- [Jakarta Messaging 3.1 specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1)
