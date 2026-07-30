# ActiveMQ Consumer Prefetch: How to Tune Throughput Without Starving Slow Workers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ Classic, Apache Artemis, Consumer Prefetch, JMS, Performance Tuning

Description: Tune consumer buffering from measured processing time, message size, and fairness requirements while keeping Classic prefetch distinct from Artemis byte credits.

---

Prefetch keeps a consumer busy by moving messages across the network before the application asks for each one. It removes a round trip from the hot path, but it also reserves work at the client. If one worker receives far more than it can process, faster workers can sit idle while messages wait in the slow worker's local buffer.

The correct setting balances:

- enough buffered work to hide network and scheduling latency;
- low enough reservation that another consumer can take over;
- bounded client memory;
- acceptable redelivery volume after a consumer fails.

There is no broker-independent `prefetch=10` rule. ActiveMQ Classic and Artemis expose different flow-control models.

## ActiveMQ Classic Prefetch Is a Message Count

The Classic OpenWire client uses a push model. Its prefetch limit is the nominal message-count window the broker uses when dispatching to an individual consumer before acknowledgements replenish credit.

Classic documents this refill behavior:

1. the broker dispatches up to the prefetch limit;
2. it stops dispatching to that consumer;
3. after acknowledgements reach at least half the prefetch value, the broker sends another half-window to top the buffer up.

This base refill model is not a hard cap on all delivered-but-unacknowledged work. The broker destination policy `usePrefetchExtension` is enabled by default, and it can allow a transaction batch to exceed the configured prefetch.

The supported 5.19.8 and 6.2.7 OpenWire Java clients use these base `ActiveMQPrefetchPolicy` defaults:

| Classic consumer type | Default prefetch |
| --- | ---: |
| Queue or temporary queue | 1000 |
| Queue browser | 500 |
| Durable topic subscription | 100 |
| Non-durable topic subscription | `Short.MAX_VALUE` (32767) |

An auto-acknowledged durable topic subscriber uses the separate `optimizeDurableTopicPrefetch` default of 1000 while `optimizedMessageDispatch` is active. The Classic prefetch page still lists the non-durable topic default as `Short.MAX_VALUE - 1`, but the current supported client source defines it as `Short.MAX_VALUE`.

Those values favor throughput. A queue worker that spends 30 seconds on each job should not reserve 1000 jobs merely because the default was designed for fast messaging.

Configure all Classic consumer types on an OpenWire connection URI:

```text
tcp://broker.example:61616?jms.prefetchPolicy.all=50
```

Configure queue consumers only:

```text
tcp://broker.example:61616?jms.prefetchPolicy.queuePrefetch=1
```

Or configure one destination:

```java
Queue queue =
    new ActiveMQQueue("WORK.ORDERS?consumer.prefetchSize=10");
MessageConsumer consumer = session.createConsumer(queue);
```

These are Classic client options. They do not configure an Artemis Core client, and a broker-side destination `memoryLimit` is a different control.

## What Values Mean in Classic

### Prefetch `1`

Use one as the initial trial for long-running or highly variable tasks. It keeps the nominal prefetch window to one message, which usually produces fairer distribution and limits failure redelivery. It still uses push delivery.

### Prefetch `0`

Classic switches that consumer to polling one message at a time. This adds request/response latency and is not equivalent to one. The Classic STOMP documentation also notes that STOMP does not support zero prefetch. Use zero only when pull behavior is intentional and supported by the client.

### Large prefetch

A large value is useful when handlers are fast, messages are small, network round-trip time is material, and consumers remain similar in speed. It increases client memory and the amount of work stranded on a stalled consumer.

Classic defines a slow consumer as one with more than twice its configured prefetch pending. That diagnostic definition is another reason to treat prefetch as part of monitoring, not just startup configuration.

## Artemis Core Consumer Flow Control Uses Bytes

For Artemis's Core client—including its JMS/Jakarta Messaging implementation—the analogous setting is `consumerWindowSize`, measured in **bytes**, not messages. Current Artemis documentation gives a 1 MiB default unless an address setting overrides it.

The values mean:

- `-1`: unbounded client buffer;
- `0`: no client-side buffer;
- a positive number: maximum aggregate message size buffered, in bytes.

For example:

```text
tcp://broker.example:61616?consumerWindowSize=0
```

With zero, messages remain server-side until the consumer is ready, which can give deterministic distribution among consumers at the cost of more network coordination. An unbounded window can maximize a demonstrably fast consumer's throughput, but Artemis explicitly warns that it can overflow client memory if processing falls behind.

Do not confuse this with `consumerMaxRate`, which limits messages consumed per second. A low rate limit plus a large byte window can still fill the client's internal buffer.

An OpenWire Classic client connected to an Artemis broker is a separate case: it uses OpenWire client behavior and Classic-style destination options. Identify the client protocol before changing a setting on the Artemis broker.

## Estimate a Starting Window

For a Classic queue, estimate how much work one consumer should reserve:

```text
target prefetch ≈ processing rate per consumer × desired buffered seconds
```

If one worker completes 20 messages per second and a 250 ms cushion is enough:

```text
20 × 0.25 = 5 messages
```

Start around five, then test one and ten. Do not use a long cushion for multi-minute jobs.

For an Artemis byte window:

```text
target window bytes ≈ target buffered messages × encoded message-size percentile
```

Use a high percentile, not just mean body size. Headers, properties, and protocol encoding add memory beyond the body. A queue with 1 KiB and 2 MiB messages cannot be tuned reliably from its average alone.

Estimate client exposure across the fleet:

```text
Classic reserved messages ≈ consumers × prefetch
Artemis buffered bytes     ≈ consumers × consumerWindowSize
```

These are planning estimates, not exact heap formulas, but they reveal when a seemingly modest per-consumer setting becomes huge at scale.

## Account for Acknowledgement and Transactions

Prefetch governs dispatch, not completion. A message remains in flight until the relevant acknowledgement reaches the broker:

- in `AUTO_ACKNOWLEDGE`, successful listener return normally drives acknowledgement;
- in `CLIENT_ACKNOWLEDGE`, a call to `acknowledge()` acknowledges all messages delivered by that session, not just an arbitrary single item;
- in a transacted session, commit acknowledges the transaction's consumed messages and rollback makes them eligible for redelivery;
- framework containers may batch acknowledgements or hold a transaction open around several deliveries.

A worker can therefore empty its local application queue while the broker still reports many in-flight messages. Tune the transaction batch and prefetch together. A prefetch of 100 with a commit every 100 messages has a very different failure and fairness profile from committing each message.

## Avoid Consumer Pooling Traps

Classic's documentation warns that pooled consumers can retain prefetched messages after application code calls `close()` if the pool defers the real consumer close. Those messages remain unavailable to other consumers until that pooled consumer is reused or truly closed.

Pool connections and sessions only with a library whose consumer caching behavior you understand. During an incident, verify the broker-side consumer is actually gone rather than trusting an application wrapper's close call.

## Tune with a Fairness Test

Use at least three worker profiles:

- a normal worker;
- a worker slowed by a downstream dependency;
- a worker that stops acknowledging entirely.

For each candidate setting, measure:

- acknowledged throughput and latency percentiles;
- ready and in-flight/delivering counts;
- messages processed per consumer;
- client heap and pause time;
- redelivery burst when the stalled consumer closes;
- time for a newly added worker to receive useful work.

A setting is too high when a slow worker accumulates local work while fast workers go idle. It is too low when all workers repeatedly wait on the broker and throughput is network-latency-bound. The best value is usually a range, so leave headroom for larger messages and slower dependencies.

## A Safe Tuning Sequence

1. Record broker, client, and protocol versions.
2. Measure processing-time and message-size distributions.
3. For slow queue workers, begin with Classic prefetch one or Artemis window zero.
4. Increase in small steps until throughput stops improving materially.
5. Inject a slow and failed consumer at every step.
6. Keep the smallest setting that meets throughput and latency objectives.
7. Alert on skew between consumers and on high in-flight/delivering counts, not just total queue depth.

Do not “solve” a slow downstream service by increasing prefetch. That only moves the backlog into client memory and makes the broker's ready count look healthier.

## Official Documentation

- [ActiveMQ Classic prefetch limits, defaults, and refill behavior](https://activemq.apache.org/components/classic/documentation/what-is-the-prefetch-limit-for)
- [ActiveMQ Classic connection URI and prefetch-policy options](https://activemq.apache.org/components/classic/documentation/connection-configuration-uri)
- [ActiveMQ Classic slow-consumer handling](https://activemq.apache.org/components/classic/documentation/slow-consumer-handling)
- [ActiveMQ Classic STOMP prefetch behavior](https://activemq.apache.org/components/classic/documentation/stomp)
- [Apache Artemis consumer flow control](https://artemis.apache.org/components/artemis/documentation/latest/flow-control.html)
- [Apache Artemis address settings](https://artemis.apache.org/components/artemis/documentation/latest/address-settings.html)
