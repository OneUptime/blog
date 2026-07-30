# Why ActiveMQ Producers Block When Memory or Store Usage Reaches Its Limit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ Classic, Apache Artemis, Producer Flow Control, Backpressure, Message Store

Description: Diagnose broker backpressure at destination, memory, store, and disk limits, then choose an explicit block, page, fail, or loss policy.

---

A producer blocked inside `send()` is often ActiveMQ protecting the broker, not a deadlocked JMS client. If consumers fall behind, the broker must either retain the growing backlog, apply backpressure, fail the send, or discard data. ActiveMQ Classic and Artemis expose those choices through different controls.

First determine which broker is running. Classic `SystemUsage` and destination `producerFlowControl` settings are not Artemis address-full settings.

## ActiveMQ Classic: The Limits That Stop a Producer

Classic producer flow control reacts when the broker detects that a resource limit has been exceeded:

- a destination's `memoryLimit`;
- the broker's `memoryUsage`;
- the persistent `storeUsage`;
- the temporary `tempUsage`.

The default behavior documented by Classic is to block the producer until space becomes available. This is commonly mistaken for a hung producer.

### Destination memory

A destination policy can set a memory budget and enable producer flow control:

```xml
<destinationPolicy>
  <policyMap>
    <policyEntries>
      <policyEntry
          queue="ORDERS.>"
          producerFlowControl="true"
          memoryLimit="64mb"/>
    </policyEntries>
  </policyMap>
</destinationPolicy>
```

The memory limit is not necessarily the total backlog size. Classic message cursors keep a working set in memory and can page references or non-persistent data to disk. A destination can therefore hit store or temporary-store pressure without its in-memory cursor looking large.

### Broker store

Persistent messages consume the configured persistence adapter's store. A slow or absent consumer, inactive durable subscription, DLQ, or transaction can prevent old data from being reclaimed. Once the store reaches its effective high-water mark, producer flow control blocks sends that need more store.

### Temporary store

Classic can spool non-persistent messages and temporary-destination data into the temporary file store. A supposedly “non-persistent only” workload can therefore block on `tempUsage`.

### Global memory

The broker-level memory budget protects the JVM across destinations. Raising every destination limit without checking the global total can simply move the failure to heap pressure.

## Synchronous and Asynchronous Classic Sends Look Different

Classic documents persistent sends as generally synchronous unless `useAsyncSend` is enabled. The calling thread sees the block directly.

Non-persistent sends are generally asynchronous. Without a producer window, the application may continue enqueueing data locally and see the problem later at the transport rather than at the exact send. Classic's `producerWindowSize` limits the bytes an asynchronous producer transmits before waiting for broker acknowledgements. `alwaysSyncSend` also makes resource failures visible per send, with a throughput cost.

Capture a client thread dump. A stack waiting in an ActiveMQ producer/transport flow-control path, together with broker usage near a limit, is different from a lock cycle in application code.

## Make Classic Failure Behavior Explicit

Instead of allowing an unbounded wait, Classic can fail sends when space remains unavailable:

```xml
<systemUsage>
  <systemUsage sendFailIfNoSpaceAfterTimeout="15000">
    <memoryUsage>
      <memoryUsage limit="1 gb"/>
    </memoryUsage>
    <storeUsage>
      <storeUsage limit="100 gb"/>
    </storeUsage>
    <tempUsage>
      <tempUsage limit="50 gb"/>
    </tempUsage>
  </systemUsage>
</systemUsage>
```

After 15 seconds without space, the producer receives a resource-allocation exception instead of waiting forever. Classic also supports immediate `sendFailIfNoSpace="true"`. The timeout is available globally and, on newer Classic lines, via destination policy; confirm syntax against the deployed version.

An exception is not a complete policy. The application must define whether to retry, reject upstream work, persist it elsewhere, or alert. Retrying immediately against a full broker amplifies overload.

Disabling `producerFlowControl` for a destination is possible in Classic, but it removes a safety mechanism. Do it only when another bounded cursor/store design has been load- and failure-tested.

## Diagnose Classic Before Changing a Limit

Graph these together over the same interval:

- broker `MemoryPercentUsage`, `StorePercentUsage`, and temporary-store usage;
- per-destination `MemoryPercentUsage`, `QueueSize`, `InFlightCount`, enqueue, and dequeue rates;
- persistence-adapter size and disk free space;
- consumer count and acknowledgement rate;
- producer send latency and blocked threads;
- expired and dead-lettered messages.

Then find what pins the resource:

- no consumers or acknowledgements;
- producer rate greater than aggregate consumer rate;
- an inactive durable subscription;
- a large transaction holding acknowledgements or store files;
- a prefetched but stalled consumer;
- a destination policy matched differently than expected;
- KahaDB cleanup held by an old message reference;
- slow or failing storage.

Raising a limit buys time only. If arrival rate remains above acknowledgement rate, the new limit fills too.

## Artemis Uses Address-Full and Disk Policies

Artemis applies capacity policy to an **address**, across the queues bound to it. The principal `address-full-policy` choices are:

- `PAGE`: write additional messages to page files;
- `BLOCK`: stop issuing producer capacity/credits until space is freed;
- `FAIL`: reject the message and report an exception;
- `DROP`: silently discard additional messages.

A blocking example is:

```xml
<address-settings>
   <address-setting match="orders">
      <max-size-bytes>104857600</max-size-bytes>
      <address-full-policy>BLOCK</address-full-policy>
   </address-setting>
</address-settings>
```

For Core producers, Artemis uses byte credits. For AMQP, link credit counts messages rather than bytes, so current Artemis also documents `max-size-bytes-reject-threshold` as an optional hard rejection threshold with `BLOCK`.

Paging is not the same as unlimited retention. It protects heap by writing page files, but a dead consumer can still fill the disk. Current Artemis supports page limits with `page-full-policy` and disk thresholds through `max-disk-usage` or `min-disk-free`. The current `disk-full-policy` determines whether the broker blocks, fails, or drops when the configured disk threshold is crossed; the documented default is `BLOCK`.

Generated instance defaults and configuration-reference defaults can differ across releases. Inspect the deployed `broker.xml`, wildcard match, and effective management state rather than copying an old example that says all addresses default to one particular policy.

## Multicast Makes One Slow Queue Everyone's Storage Problem

On an Artemis multicast address, each bound queue holds a reference to the routed message. Artemis cannot free the address's message memory until every relevant queue releases it. One inactive subscription can push the address into paging or blocking while the other subscriptions remain empty and fast.

Classic durable topics and virtual-topic consumer queues have a related operational symptom: an abandoned logical subscriber accumulates its own backlog and eventually consumes broker resources. Always break usage down by subscription queue, not only by producer address/topic.

## Recover Without Turning Backpressure into Loss

Use this sequence:

1. Confirm the blocked call and the exact broker resource at its limit.
2. Reduce or pause upstream input if the application contract permits.
3. Restore acknowledgement capacity—repair consumers, downstream dependencies, transactions, or storage.
4. Drain or deliberately move/expire messages according to business retention policy.
5. Free disk safely; do not delete broker journal or page files by hand.
6. Change block/fail/page limits only after calculating backlog and recovery capacity.
7. Test the producer's timeout, exception, retry, and idempotency behavior.

Never switch from `BLOCK` to `DROP` during an incident unless silent loss is an explicitly approved requirement. A green producer-latency graph is not success if messages vanished.

## Capacity Math Makes the Outcome Predictable

Let:

```text
backlog byte growth rate = retained bytes added per second - retained bytes released per second
time to limit ≈ remaining usable capacity / backlog byte growth rate
```

This estimate applies only while the growth rate is positive. For a single queue with roughly uniform message sizes, message backlog growth is the producer message rate minus the acknowledged consumer message rate. For multicast, calculate retention per subscription queue rather than subtracting aggregate acknowledgements from the original publish rate. Include replication, journal/page overhead, message properties, and per-queue reference overhead. Alert on projected time to exhaustion while there is still time to drain or shed load.

Backpressure is the broker preserving a bounded system. The durable fix is to balance input and acknowledgement capacity or choose a documented overload outcome—not to make the bound invisible.

## Official Documentation

- [ActiveMQ Classic producer flow control](https://activemq.apache.org/components/classic/documentation/producer-flow-control)
- [ActiveMQ Classic message cursors](https://activemq.apache.org/components/classic/documentation/message-cursors)
- [ActiveMQ Classic per-destination policy reference](https://activemq.apache.org/components/classic/documentation/per-destination-policies)
- [ActiveMQ Classic JMX monitoring](https://activemq.apache.org/components/classic/documentation/jmx)
- [Apache Artemis flow control](https://artemis.apache.org/components/artemis/documentation/latest/flow-control.html)
- [Apache Artemis paging and address-full policies](https://artemis.apache.org/components/artemis/documentation/latest/paging.html)
- [Apache Artemis configuration reference](https://artemis.apache.org/components/artemis/documentation/latest/configuration-index.html)
- [Apache Artemis address model](https://artemis.apache.org/components/artemis/documentation/latest/address-model.html)
