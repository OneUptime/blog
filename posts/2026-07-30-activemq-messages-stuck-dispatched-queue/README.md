# Why ActiveMQ Messages Stay in the Dispatched Queue—and How to Release Them

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ Classic, JMS, Message Acknowledgement, Consumer Prefetch, Troubleshooting

Description: Diagnose dispatched but unacknowledged messages from broker and consumer evidence, then return them safely without purging valid work.

---

In ActiveMQ Classic, a message can leave the ready portion of a queue without being finished. The broker has dispatched it to a consumer, but it remains unacknowledged. A large prefetch can put hundreds of messages in that state even when application code is processing only one.

“Stuck in the dispatched queue” therefore usually means **reserved by a consumer and awaiting acknowledgement**, not lost inside a second durable queue.

Before taking action, identify the exact metric. Classic's queue MBean exposes:

- `QueueSize`: the current unacknowledged queue/store population;
- `InFlightCount`: messages sent to consumer sessions without an acknowledgement;
- `DispatchCount`: cumulative messages dispatched since statistics were reset;
- `DequeueCount`: cumulative messages removed after acknowledgement;
- `ConsumerCount`: current consumers.

`DispatchCount` is cumulative and should not be treated as a current backlog. Do not add `QueueSize` and `InFlightCount` without verifying the broker version's metric definitions; use each to distinguish ready/store state from delivery state.

## Why Messages Remain In Flight

### The handler is still working

A long-running task legitimately holds its message until completion. Compare in-flight age with the handler's normal duration before declaring it stuck.

### The consumer prefetched too much

Classic can dispatch up to the consumer's prefetch limit. A worker with `queuePrefetch=1000` can reserve an entire small backlog before a second worker connects. The official prefetch documentation notes that unconsumed prefetched messages are released when the real consumer closes.

### Acknowledgement never occurs

Common causes include:

- a listener blocks or never returns in `AUTO_ACKNOWLEDGE`;
- a `CLIENT_ACKNOWLEDGE` path misses `message.acknowledge()`;
- a transacted session never commits or rolls back;
- an XA transaction remains prepared or its transaction manager is unavailable;
- a framework catches an exception but leaves the transaction open;
- the acknowledgement cannot traverse a broken connection.

In `CLIENT_ACKNOWLEDGE`, acknowledgement is session-scoped: acknowledging a consumed message acknowledges messages consumed by that session. Code that assumes it is an independent per-message acknowledgement can produce surprising batches.

### The consumer is alive only from one side's point of view

A half-open TCP session or stalled client process can remain registered until failure detection closes it. Classic's InactivityMonitor normally exchanges keepalives and closes connections that stop receiving data; disabling it can leave ghost consumers longer.

### A consumer pool did not really close the consumer

A wrapper may return a consumer to a pool while the underlying broker consumer remains open with its prefetched messages. Check the broker's consumer and connection MBeans rather than relying on an application log line.

### Redelivery delay hides the returned message

After rollback or consumer failure, redelivery policy may delay the next attempt. A poison message may eventually move to a dead-letter queue. “It disappeared from in-flight but is not ready yet” can be expected redelivery behavior.

## Find the Consumer Holding the Work

Use Classic JMX or the web console and preserve a snapshot before changing anything:

1. Record `QueueSize`, `InFlightCount`, `ConsumerCount`, `DispatchCount`, and `DequeueCount`.
2. List the destination's subscriptions and their connection/client IDs, remote addresses, prefetch, pending count, dispatched count, and enqueue/dequeue activity where exposed.
3. Map each connection to a process, pod, host, deployment version, and application log.
4. Sample message IDs and business IDs through safe browse or application tracing.
5. Determine whether acknowledgements advance over a fixed interval.

If `InFlightCount` is high and `DequeueCount` is flat, focus on consumers and transactions. If `InFlightCount` is low but `QueueSize` grows, the problem is more likely eligibility, insufficient capacity, or no consumers.

Do not start by purging. Purge deletes work; it does not ask the owning consumer to release it.

## Release Messages Through the JMS Lifecycle

Prefer an application-controlled outcome:

### Commit or acknowledge successful work

If the handler completed and its side effect is durable, let the correct acknowledgement or transaction commit finish. Do not force redelivery of already completed non-idempotent work unless the application can deduplicate it.

### Roll back failed work

For a transacted session:

```java
session.rollback();
```

This returns the transaction's consumed messages for redelivery under broker/client redelivery policy.

For an application-owned, non-transacted session, `session.recover()` stops delivery to that session and restarts it with the oldest unacknowledged message marked for redelivery:

```java
session.recover();
```

Use the method appropriate to the actual session mode. `recover()` is not a substitute for rolling back a transacted session.

### Close the real consumer or session

Closing the `MessageConsumer`, its `Session`, or its `Connection` cancels unacknowledged deliveries so the broker can make them eligible again. A graceful application shutdown is safer than killing a process because it can stop accepting new work and finish or roll back the current transaction deliberately.

Calling `connection.stop()` only pauses delivery; it does not close the consumer and should not be expected to release prefetched messages.

### Close a verified ghost connection administratively

If the process is gone but the broker still owns its connection, use the Classic connection MBean or console to stop that exact connection. Verify client ID and remote address first: one connection can host several sessions and consumers, so closing it may release work from multiple destinations.

Expect duplicates whenever there is uncertainty about whether the old consumer completed its side effect before losing the acknowledgement.

## Why Restarting the Broker Is the Wrong First Tool

A restart cancels all deliveries, disrupts healthy clients, triggers failover/reconnect behavior, and can create a large simultaneous redelivery wave. It may temporarily clear in-flight state without explaining why acknowledgement stopped.

Restart only for a demonstrated broker fault or as a controlled recovery step after preserving diagnostics. A targeted consumer close has a much smaller failure domain.

## Prevent the Next Incident in Classic

### Lower prefetch for slow work

For long or variable tasks:

```text
tcp://broker.example:61616?jms.prefetchPolicy.queuePrefetch=1
```

Classic prefetch zero changes the consumer to polling, so one is usually the safer initial fairness setting.

### Put a deadline around downstream work

A listener blocked forever on a database or HTTP call holds the message forever. Bound the operation, roll back on timeout, and use delayed redelivery so a dependency failure does not create a hot retry loop.

### Keep connection failure detection enabled

Classic's InactivityMonitor is enabled by default and negotiates inactivity timeouts. Tune it for real network conditions; disabling it trades fewer false positives for slower ghost cleanup.

### Detect slow acknowledgements

Classic provides slow-consumer strategies, including acknowledgement-based detection. An abort policy can close a slow consumer or its connection, but that is a consequential action. Set thresholds above legitimate processing times and test the resulting redelivery burst.

### Make handlers idempotent

No timeout can determine whether an external side effect happened just before a connection failed. A durable business idempotency key makes safe release and redelivery possible.

## The Artemis Equivalent Is Named Differently

Artemis does not use Classic's queue-MBean vocabulary. Its `QueueControl` exposes `messageCount` and `deliveringCount`; the latter is the number currently being delivered to consumers. Closing a consumer cancels its unacknowledged deliveries back to the queue, subject to transaction and redelivery policy.

For Artemis Core/JMS clients, `consumerWindowSize` is a byte window. Setting it to zero prevents client-side buffering. Do not copy a Classic `queuePrefetch` destination option into Artemis and expect the same result. An OpenWire client connected to Artemis remains an OpenWire-specific case.

## A Safe Incident Sequence

1. Stop unnecessary producers only if continued input obscures or worsens the incident.
2. Snapshot queue, consumer, connection, and transaction state.
3. Identify the exact consumer holding each sampled message.
4. Decide whether the business side effect completed.
5. Commit/acknowledge completed work; roll back failed work.
6. Gracefully close the faulty consumer, or administratively close only a verified ghost connection.
7. Watch ready, in-flight, acknowledgement, redelivery, and DLQ counts.
8. Fix prefetch, deadlines, pooling, or acknowledgement logic before restoring full input.

The goal is not merely to make `InFlightCount` fall. It is to account for each unit of work without deleting it or applying it twice.

## Official Documentation

- [ActiveMQ Classic queue size and destination metric definitions](https://activemq.apache.org/components/classic/documentation/how-do-i-find-the-size-of-a-queue)
- [ActiveMQ Classic JMX MBeans](https://activemq.apache.org/components/classic/documentation/jmx)
- [ActiveMQ Classic prefetch and pooled-consumer behavior](https://activemq.apache.org/components/classic/documentation/what-is-the-prefetch-limit-for)
- [ActiveMQ Classic InactivityMonitor](https://activemq.apache.org/components/classic/documentation/activemq-classic-inactivitymonitor)
- [Jakarta Messaging 3.1 specification: acknowledgement and recovery](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1.html)
- [Apache Artemis `QueueControl` API](https://artemis.apache.org/components/artemis/documentation/javadocs/javadoc-latest/org/apache/activemq/artemis/api/core/management/QueueControl.html)
- [Apache Artemis message redelivery](https://artemis.apache.org/components/artemis/documentation/latest/undelivered-messages.html)
