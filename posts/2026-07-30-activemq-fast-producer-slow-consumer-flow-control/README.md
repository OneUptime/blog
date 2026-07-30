# Taming a Fast Producer and Slow Consumer with ActiveMQ Flow Control and Pending Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ Classic, Apache Artemis, Flow Control, Slow Consumers, Backpressure

Description: Bound a producer-consumer rate mismatch with lossless backpressure for work queues and explicit eviction only for data the application permits you to drop.

---

When producers publish faster than consumers acknowledge, backlog grows at a predictable rate:

```text
backlog growth = accepted production - acknowledged consumption
```

No prefetch value removes that imbalance. A broker can buffer it, page it to disk, block producers, reject sends, or discard messages. The correct choice depends on whether the data is durable work or a replaceable stream update.

ActiveMQ Classic's **pending message limit strategy** is often misunderstood here. It is a lossy slow-consumer tool for non-durable topics. It is not a general queue-depth cap and should not be applied to an orders queue.

## Separate the Three Pressure Points

| Pressure point | Symptom | Classic control |
| --- | --- | --- |
| Consumer reserves too much work | Fast consumers idle while a slow one holds prefetched messages | Consumer prefetch |
| Broker retains a growing lossless backlog | Queue/store grows; sends eventually block | Message cursor, destination memory, producer flow control, `SystemUsage` |
| One non-durable topic subscriber falls behind | Pending topic messages consume memory and slow healthy subscribers | Pending message limit and eviction strategy |

Treat each independently. Increasing prefetch to improve throughput can make the first problem worse. Disabling producer flow control can turn the second into disk or heap exhaustion. Adding an eviction strategy to the third deliberately loses old updates.

## For Queued Work, Preserve Backpressure

Commands, orders, and jobs usually require lossless queue semantics. Use these controls together.

### 1. Reduce Classic prefetch for slow workers

For work that takes seconds or minutes:

```text
tcp://broker.example:61616?jms.prefetchPolicy.queuePrefetch=1
```

One limits how much work a stalled consumer reserves while preserving push delivery. Prefetch zero changes a Classic consumer to polling and adds a round trip.

### 2. Keep producer flow control enabled

A destination policy can bound the in-memory working set:

```xml
<destinationPolicy>
  <policyMap>
    <policyEntries>
      <policyEntry
          queue="WORK.>"
          producerFlowControl="true"
          memoryLimit="64mb"/>
    </policyEntries>
  </policyMap>
</destinationPolicy>
```

Classic's store-backed cursors allow large persistent backlogs without retaining every message reference in heap. Flow control still protects the broker when destination or broker memory, persistent store, or temporary store reaches its limit.

### 3. Bound how long a producer waits

`sendFailIfNoSpaceAfterTimeout` lets a send fail after a known interval rather than block forever. The application then needs a bounded retry policy, upstream load shedding, or another durable handoff. An immediate retry loop is not backpressure; it is extra load.

### 4. Scale the actual bottleneck

Adding consumers helps only if work is parallelizable and the downstream database, API, or CPU has capacity. Message groups and exclusive consumers can intentionally pin work to fewer consumers. Measure acknowledgement rate by consumer and group before scaling replicas.

### 5. Give every message a business idempotency key

A blocked producer can lose its connection after the broker accepted a send but before the client observed the result. Retrying can duplicate the command. Idempotency makes uncertain send and redelivery outcomes safe.

## For Non-Durable Topic Updates, Bound Pending Data

Price ticks, presence, and rapidly superseded telemetry may value freshness over completeness. Classic can cap the number of matched messages it holds for a slow non-durable topic subscription **in addition to that consumer's prefetch buffer**.

For example:

```xml
<destinationPolicy>
  <policyMap>
    <policyEntries>
      <policyEntry topic="PRICES.>">
        <pendingMessageLimitStrategy>
          <constantPendingMessageLimitStrategy limit="50"/>
        </pendingMessageLimitStrategy>
      </policyEntry>
    </policyEntries>
  </policyMap>
</destinationPolicy>
```

Once the pending limit is reached, Classic discards older messages as new ones arrive. The default eviction strategy removes the oldest; alternative strategies can prefer low-priority messages or replace messages sharing a property.

The other built-in strategy relates the limit to prefetch:

```xml
<prefetchRatePendingMessageLimitStrategy multiplier="2.5"/>
```

If prefetch is 100, that strategy permits a calculated pending amount above the prefetch buffer. The broker-side strategy documents:

- `0`: keep no pending messages beyond prefetch;
- positive: keep that many beyond prefetch;
- `-1`: disable discarding.

The per-client `maximumPendingMessageLimit` option treats zero differently, so verify whether the limit came from the broker policy or client before interpreting it.

## Understand What Pending Eviction Does Not Protect

Pending-message eviction:

- does not cap a durable queue;
- does not make a durable topic subscription safe to lose;
- does not remove messages already inside the client's prefetch buffer;
- does not fix a permanently blocked callback;
- does not guarantee a subscriber sees every logical key;
- does not replace expiration or an application retention contract.

If every update for every symbol matters, the feed is not eligible for eviction. Use durable storage and backpressure.

Monitor Classic `TopicSubscriptionViewMBean` values such as `matched` and `discarded`. A non-zero discarded count is application-visible loss and should be an explicit service-level metric, not a hidden broker detail.

## Set Pending Limit and Prefetch Together

Suppose a non-durable topic consumer has:

```text
prefetch = 100
pending limit = 50
```

The broker can have up to roughly the prefetched window reserved at the client plus the configured pending allowance at the subscription. It can begin evicting pending messages while the application is still processing old prefetched data. If freshness is the goal, lowering prefetch is as important as limiting pending messages.

Test with the slowest supported client and realistic message-size distribution. A count limit on 1 KiB messages has a very different memory effect from the same count of 1 MiB messages.

## Detect and Act on Slow Classic Consumers

Classic can emit slow-consumer advisories and can configure strategies that abort slow consumers. Aborting returns unacknowledged queue deliveries and removes a non-durable topic subscription, but it can also:

- close other sessions if the whole connection is aborted;
- trigger a redelivery burst;
- duplicate application side effects;
- remove the only copy available to a non-durable subscriber.

Set thresholds above normal processing time, make handlers idempotent, and test the exact strategy. Detection should usually precede automatic termination.

## The Artemis Controls Are Different

Do not copy Classic policy elements into Artemis.

For Artemis:

- `consumerWindowSize` is a Core/JMS client buffer in bytes; zero prevents client buffering;
- `max-size-bytes` and `max-size-messages` are address thresholds;
- `address-full-policy=PAGE` writes backlog to page files;
- `BLOCK` applies producer backpressure;
- `FAIL` rejects sends;
- `DROP` deliberately discards sends;
- page limits can cap page storage with a `DROP` or `FAIL` outcome;
- slow-consumer detection can `NOTIFY` or `KILL`, based on acknowledgement rate.

Artemis last-value and ring queues can implement explicitly lossy “latest state” or bounded-history semantics. They are not drop-in replacements for a Classic non-durable topic pending limit: changing to either changes the queue's application contract.

On a multicast Artemis address, one slow subscription queue can push the whole address into paging because messages remain referenced until all relevant queues release them. Investigate per-queue backlog even when the producer sends to one address.

## Size the Buffer from a Recovery Objective

If arrival is 5,000 messages/s and consumption is 4,000 messages/s:

```text
growth = 1,000 messages/s
```

A 3.6-million-message store buys one hour, ignoring message-size variation and storage overhead. It does not restore stability.

Choose:

- maximum expected slowdown duration;
- recovery drain rate after the incident;
- maximum bytes, not only message count;
- acceptable producer wait or failure rate;
- for lossy streams, maximum staleness and discard rate.

The system needs post-incident spare capacity. If consumers return at exactly the producer rate, the backlog never drains.

## A Production Validation Plan

1. Run producers at peak sustained and burst rates.
2. Slow one consumer while leaving others healthy.
3. Stop all consumers long enough to reach paging or flow control.
4. Measure ready, in-flight, store/page, and discarded counts.
5. Restart a consumer holding its full prefetch window.
6. Verify producer timeout, retry, and duplicate handling.
7. Restore consumers and measure drain time without overwhelming downstream systems.
8. For lossy topics, prove that retained updates meet the application's freshness contract.

The objective is controlled degradation: durable work pushes back without disappearing, while explicitly disposable updates remain bounded without exhausting the broker.

## Official Documentation

- [ActiveMQ Classic producer flow control](https://activemq.apache.org/components/classic/documentation/producer-flow-control)
- [ActiveMQ Classic slow-consumer handling and pending-message limits](https://activemq.apache.org/components/classic/documentation/slow-consumer-handling)
- [ActiveMQ Classic consumer prefetch](https://activemq.apache.org/components/classic/documentation/what-is-the-prefetch-limit-for)
- [ActiveMQ Classic message cursors](https://activemq.apache.org/components/classic/documentation/message-cursors)
- [Apache Artemis flow control](https://artemis.apache.org/components/artemis/documentation/latest/flow-control.html)
- [Apache Artemis paging and page limits](https://artemis.apache.org/components/artemis/documentation/latest/paging.html)
- [Apache Artemis slow-consumer detection](https://artemis.apache.org/components/artemis/documentation/latest/slow-consumers.html)
- [Apache Artemis last-value queues](https://artemis.apache.org/components/artemis/documentation/latest/last-value-queues.html)
- [Apache Artemis ring queues](https://artemis.apache.org/components/artemis/documentation/latest/ring-queues.html)
