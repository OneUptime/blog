# Why an ActiveMQ Queue Keeps Growing-and How to Find the Bottleneck

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ, Queue Backlog, JMS, Capacity Planning, Messaging Troubleshooting

Description: Locate a growing queue's bottleneck by comparing accepted, delivered, and acknowledged rates with consumer eligibility, message age, and broker storage pressure.

---

A queue grows when messages enter it faster than they leave it. That can mean producers accelerated, consumers slowed, messages became ineligible, acknowledgements stopped, or the broker is retaining messages by design.

Queue depth alone cannot distinguish those cases. Diagnose with rates and state:

```text
net backlog change
  ≈ messages added
  - messages removed after acknowledgement, expiry, DLQ routing, or administration
```

On an ordinary destructive queue, acknowledgements are the main removal signal. Sample counters at two known times. A single cumulative number is not a rate, and most broker counters reset on restart or when an operator resets statistics.

## Use the Right Metrics for the Broker

### ActiveMQ Classic

Classic documents these destination attributes:

- `EnqueueCount`: cumulative messages sent to the destination;
- `DequeueCount`: cumulative messages removed after consumer acknowledgement;
- `DispatchCount`: cumulative messages sent to consumer sessions;
- `InFlightCount`: messages dispatched without an acknowledgement;
- `ExpiredCount`: messages removed by expiration;
- `QueueSize`: current unacknowledged queue/store population;
- `ConsumerCount`: attached consumers.

`DispatchCount` equals acknowledged dispatches plus current in-flight dispatches according to the Classic metric definition. It is not the number waiting now.

### Artemis

Artemis `QueueControl` and management list operations expose:

- `messagesAdded`;
- `messagesAcknowledged` (`messagesAcked` in `listQueues`);
- `messageCount`;
- `deliveringCount`;
- `consumerCount`;
- `messagesExpired` and `messagesKilled`;
- `scheduledCount`;
- per-consumer last delivery and acknowledgement times;
- queue state such as paused, enabled, and exclusive.

Artemis documentation recommends sampling `messageCount` and `messagesAdded` over time or using a metrics plugin rather than treating its internal queue rate as an application metric. Do not sum `messageCount` and `deliveringCount` without checking the current API definition; delivering is a useful state breakdown, not automatically an additional population.

Keep Classic and Artemis dashboards separate. Similar-looking names can have different inclusion rules.

## Calculate the Actual Rates

For samples at `t1` and `t2`:

```text
add rate = (added₂ - added₁) / (t₂ - t₁)
ack rate = (acked₂ - acked₁) / (t₂ - t₁)
```

If producers add 1,200 messages/s and consumers acknowledge 900/s:

```text
growth = 300 messages/s
```

At that rate, the backlog grows by another million messages in about 55 minutes. The forecast is more actionable than “queue is large.”

Account for expiry, administrative moves/removals, DLQ routing, and counter resets when reconciling the equation. Use bytes as well as count. Ten thousand 10 MiB messages are a different incident from ten thousand 200-byte messages.

## Branch 1: There Are No Eligible Consumers

If `ConsumerCount` is zero, verify:

- the deployment is running and ready;
- it connected to this broker, not another failover member;
- queue versus topic type and destination case;
- Artemis address, queue, FQQN, and routing type;
- authentication and consume permission;
- client ID and durable-subscription identity;
- a listener container did not stop after repeated exceptions.

A non-zero consumer count still does not prove eligibility. Selectors, consumer priority, exclusive consumption, groups, and queue state can keep a connected consumer idle.

## Branch 2: Messages Are Delivered but Not Acknowledged

High or rising Classic `InFlightCount`, or Artemis `deliveringCount`, with a flat acknowledgement counter points at the consumer path:

- handler blocked on a downstream API or database;
- transaction open and never committed or rolled back;
- acknowledgement mode misunderstood;
- executor or connection pool exhausted;
- consumer prefetched more than it can process;
- network connection half-open;
- process paused by long garbage collection;
- poison message repeatedly fails.

Map in-flight messages to consumer IDs, remote addresses, last delivery, and last acknowledgement. Take a thread dump before restarting the client. A restart releases deliveries but often erases the evidence and can create duplicate side effects.

## Branch 3: Consumers Work, but Aggregate Capacity Is Too Low

If acknowledgement rate is healthy but persistently below add rate, the system is underprovisioned or downstream-limited.

Measure per consumer:

- message throughput;
- processing-time percentiles;
- error and rollback rate;
- downstream latency and pool wait;
- CPU, heap, and garbage collection;
- distribution of messages and groups.

Adding workers helps only when the queue can distribute work and downstream systems have spare capacity. One exclusive consumer, a small number of hot `JMSXGroupID` values, or a database lock can keep new replicas idle.

Plan a drain rate:

```text
required acknowledgement rate
  = incoming rate
  + current backlog / target drain seconds
```

If that rate would overload the downstream dependency, drain more slowly and apply upstream backpressure.

## Branch 4: Selectors or Routing Make Messages Ineligible

Browse a bounded sample of old and new messages and compare their properties with every active selector. Missing properties evaluate as unknown under JMS selector logic and do not match. Numeric and string values are not interchangeable.

In Artemis, distinguish:

- a queue filter, which prevents non-matching messages from entering the queue;
- a consumer filter, which leaves non-matching messages available in the queue.

Artemis also documents a paging edge case: with a restrictive consumer filter, matching messages deep behind a large run of non-matching paged messages may not become consumable until the earlier messages are consumed. Do not apply that Artemis-specific paging behavior to Classic.

## Branch 5: Ordering Features Concentrate the Backlog

Inspect:

- exclusive-consumer or exclusive-queue configuration;
- `JMSXGroupID` cardinality and ownership;
- consumer priorities;
- strict-order dispatch policies;
- Artemis `consumers-before-dispatch` and `delay-before-dispatch`.

A queue can show ten consumers while one owns every active message group. Graph acknowledgements by consumer and group, not just fleet total.

## Branch 6: Redelivery Is Recycling Work

A poison message can consume capacity without reducing depth:

1. consumer receives;
2. handler fails;
3. transaction rolls back;
4. the client or broker applies any configured delay and redelivers;
5. the cycle repeats until a dead-letter or discard limit applies, or indefinitely if retries are unbounded.

Track redelivery count, rollback/error rate, and DLQ movement. Use delayed redelivery to avoid a hot loop, set a deliberate maximum-delivery policy, and make the handler distinguish transient from permanent failure.

Do not blindly increase the maximum attempts. That converts a visible DLQ item into continued queue contention.

## Branch 7: The Queue Is Designed Not to Shrink

Check for:

- Artemis non-destructive queues, whose consumers do not remove acknowledged messages in the ordinary way;
- queue browsers mistaken for consumers;
- retained/latest-value or ring semantics;
- an inactive durable topic subscription accumulating pending messages (represented by a queue in Artemis);
- expiration configured but not yet scanned or forwarded;
- a replay or audit queue intentionally retaining history.

Artemis warns that a queue with only non-destructive consumers can grow without constraint unless another mechanism, such as expiry or ring semantics, bounds it. Fix the expectation or retention policy rather than scaling consumers that are not supposed to delete.

## Branch 8: Broker Storage Is Now the Bottleneck

Once backlog is large, storage can reduce both enqueue and dequeue performance.

For Classic, inspect destination memory, broker memory/store/temp usage, KahaDB or JDBC latency, disk free space, and cursor behavior.

For Artemis, inspect address paging state, page-file growth, global size, disk thresholds, and page-read limits. One slow multicast subscription can force an address into paging and make otherwise empty subscriptions read through page storage.

Never delete KahaDB journal files, Artemis journal files, or page files manually. Use supported drain, move, expiry, data-tool, and compaction procedures for the exact broker version.

## Find the Oldest Message, Not Just the Count

Message age distinguishes a burst from starvation:

- depth high, oldest age low, drain rate above input: recovering;
- depth flat, oldest age rising: no spare capacity;
- depth rising, oldest age rising: active overload;
- depth high, age bounded by expiration: an expiration-bounded window; verify that expiry or forwarding is intentional.

Browse only a bounded page or use a broker metric/plugin designed for age. Scanning millions of messages through a management endpoint can add load during an incident.

## A Practical Incident Checklist

1. Identify Classic or Artemis, exact version, and client protocol.
2. Snapshot queue state and disk/memory limits.
3. Sample add, acknowledgement, expiry, DLQ, and depth metrics at least twice.
4. Determine current growth in messages/s and bytes/s.
5. Inspect oldest-message age.
6. Split ready from delivering/in-flight and scheduled state.
7. Break acknowledgements down by consumer and message group.
8. Inspect selectors, routing type, pause/exclusive/non-destructive state.
9. Trace a small set of old business IDs through consumer errors and DLQ.
10. Forecast time to memory, store, page, or disk limit.

Then apply the narrow remedy:

- restore or unpause consumers;
- repair a downstream bottleneck;
- lower prefetch or Artemis consumer window for fairness;
- add safe parallelism;
- correct a selector or routing error;
- isolate poison messages through tested redelivery/DLQ policy;
- throttle or reject upstream work;
- deliberately expire or discard only data whose contract permits loss.

After recovery, alert on backlog growth rate, oldest age, acknowledgement silence, consumer count, in-flight/delivering age, store/page usage, and time to capacity. Queue depth is an outcome; those signals reveal the bottleneck early enough to act.

## Official Documentation

- [ActiveMQ Classic queue-size and destination-counter definitions](https://activemq.apache.org/components/classic/documentation/how-do-i-find-the-size-of-a-queue)
- [ActiveMQ Classic JMX management](https://activemq.apache.org/components/classic/documentation/jmx)
- [ActiveMQ Classic prefetch](https://activemq.apache.org/components/classic/documentation/what-is-the-prefetch-limit-for)
- [ActiveMQ Classic message groups](https://activemq.apache.org/components/classic/documentation/message-groups)
- [ActiveMQ Classic message cursors](https://activemq.apache.org/components/classic/documentation/message-cursors)
- [Apache Artemis management and queue counters](https://artemis.apache.org/components/artemis/documentation/latest/management.html)
- [Apache Artemis `QueueControl` API](https://artemis.apache.org/components/artemis/documentation/javadocs/javadoc-latest/org/apache/activemq/artemis/api/core/management/QueueControl.html)
- [Apache Artemis paging](https://artemis.apache.org/components/artemis/documentation/latest/paging.html)
- [Apache Artemis non-destructive queues](https://artemis.apache.org/components/artemis/documentation/latest/non-destructive-queues.html)
- [Jakarta Messaging 3.1 specification](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1.html)
