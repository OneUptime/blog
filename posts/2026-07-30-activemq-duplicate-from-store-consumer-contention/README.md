# Why ActiveMQ Reports “Duplicate from Store”—and How Consumer Contention Triggers It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ, ActiveMQ Classic, Duplicate Messages, Message Store, Troubleshooting

Description: Interpret ActiveMQ Classic's duplicate-from-store warning correctly, measure it through JMX, and separate consumer churn from network or store duplication.

---

The phrase `duplicate from store` is easy to misread. It does not by itself mean two consumers ran the same handler, and it does not prove the producer sent the same business event twice. In ActiveMQ Classic, the destination's cursor audit found a message identifier it had already seen while paging from the persistent store.

Consumer contention can make the condition visible by increasing dispatch, rollback, and paging churn. It is not, on its own, the mechanism that creates a duplicate store entry. Start the investigation at the broker cursor and message path rather than blaming the busiest consumer.

This is a Classic-specific diagnostic. Artemis duplicate detection and paging use different settings and identifiers.

## Where the warning comes from

Classic destinations keep a pending-message cursor between the persistent store and subscriptions. A message audit helps the cursor avoid dispatching the same stored message twice. When that audit detects a duplicate, the destination increments `DuplicateFromStoreCount`.

An Apache issue describing the original handling gives a representative cause: a network connector forwards a message, the reply is lost, and the forwarding operation is retried after the original has already been dispatched. The store may not reject the retry because the first copy is in flight, but the destination cursor later recognizes the duplicate.

Other causes and diagnostic factors include:

- a broker or store bug fixed in a later patch release;
- recovery around an unclean broker failure;
- network-of-brokers forwarding and replay;
- a network bridge or failover transport replaying an in-flight send with the same broker message ID;
- audit sizing that is too small for the number of active producers and backlog, which can let older duplicates escape detection after their audit entry is evicted;
- an unhealthy persistence store or index.

Do not jump from the warning to KahaDB corruption. Correlate it with broker version, network connectors, failover events, and store logs.

## What happens to the detected copy?

The answer is version-sensitive.

ActiveMQ Classic's per-destination policy documents `sendDuplicateFromStoreToDLQ`:

- before 5.17.0, the default behavior was `true`;
- from 5.17.0, the default is `false`;
- when `true`, a copy is sent to the DLQ when the condition is detected.

That means a message in a DLQ with a duplicate-from-store failure is broker evidence, not necessarily a poison business payload. Replaying it without checking whether the original completed can duplicate the business side effect.

The destination's general `enableAudit` setting defaults to `true`. Disabling the audit to silence warnings removes a duplicate-suppression defense and is not a root-cause fix.

## Why multiple consumers can look guilty

Consider a queue with high prefetch, several consumers, rollbacks, and reconnects:

```text
store cursor -> consumer A prefetch (in flight)
             -> consumer B prefetch (in flight)
             -> unpaged store backlog
```

If A disconnects, its unacknowledged deliveries become eligible for redelivery. If a network bridge or failover transport also replayed an in-flight send, the cursor may encounter the repeated message ID while repaging. The warning coincides with consumer turnover, but the audit is reporting duplicate identity at the store/cursor boundary.

Two ordinary competing queue consumers do not receive the same available queue message simultaneously merely because both are connected. Redelivery after rollback, disconnect, or an ambiguous acknowledgement can still cause sequential or briefly overlapping duplicate processing, which is a separate condition.

## Capture the right evidence

For each occurrence, collect:

- exact broker version and persistence adapter;
- destination `DuplicateFromStoreCount`;
- `QueueSize`, `InFlightCount`, enqueue/dequeue counts, and consumer count;
- message ID and original destination from any DLQ evidence;
- network connector topology and reconnect timestamps;
- broker restart, failover, or disk errors;
- consumer connect/disconnect and transaction rollback rate;
- audit settings: `enableAudit`, `maxAuditDepth`, and `maxProducersToAudit`;
- whether `sendDuplicateFromStoreToDLQ` is explicitly configured.

The `QueueViewMBean` inherits the destination counters and effective audit settings from `DestinationViewMBean`. JMX does not distinguish an explicitly configured policy value from its default, so inspect the broker configuration for that distinction. Graph the counter's increase rather than alerting on its absolute cumulative value, which can be reset through `resetStatistics()`.

## Distinguish three duplicate problems

### Same JMS message ID in the broker path

This is what the destination audit detects. Investigate forwarding, send replay, cursor/store behavior, and known issues for the exact Classic release.

### A redelivery of one message

The consumer may receive the same JMS message again after rollback, disconnect, or an ambiguous acknowledgement. `JMSRedelivered` and `JMSXDeliveryCount` help identify this. Redelivery is expected at-least-once behavior, not necessarily a store duplicate.

### Two messages for one business operation

A producer may publish the same order twice with different JMS message IDs. Broker message audit cannot infer that both represent the same business action. The application needs a stable operation ID and idempotency enforcement.

These cases can overlap, but they require different fixes.

## A safe diagnostic sequence

1. **Check the version boundary.** Determine the effective duplicate-to-DLQ behavior and read release notes/issues between your patch version and the latest supported release.
2. **Find the event window.** Correlate the counter increase with network bridge interruption, failover, broker recovery, or consumer churn.
3. **Inspect, do not replay, DLQ evidence.** Verify whether the original business operation already completed.
4. **Review network connector and failover replay.** Lost replies create an inherently ambiguous send result. An application retry that receives a new JMS message ID is a business-level duplicate, not one this cursor audit can detect.
5. **Review audit capacity.** Increase audit depth only from observed producer and backlog characteristics; larger audits cost memory.
6. **Check store health.** Look for KahaDB I/O, index, checkpoint, and disk errors. Never delete journal files manually.
7. **Reproduce safely.** Exercise bridge disconnect and client failover in a test environment with stable business IDs.
8. **Upgrade if the signature matches a fixed broker defect.** Configuration changes cannot reliably compensate for a known code bug.

## Protect the business operation anyway

Even after the broker issue is corrected, failures can still cause redelivery or ambiguous send and acknowledgement outcomes. Consumers should atomically record a business idempotency key with the resulting state, or pass that key to the downstream service. Use broker message IDs for diagnostics and business IDs for correctness.

The useful interpretation of `duplicate from store` is narrow: Classic's destination audit protected dispatch when it encountered a repeated stored message identity. Treat consumer contention as context, then trace the real duplication path.

## Official Documentation

- [ActiveMQ Classic per-destination policies](https://activemq.apache.org/components/classic/documentation/per-destination-policies)
- [ActiveMQ Classic `QueueViewMBean` API](https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/QueueViewMBean.html)
- [Apache issue AMQ-4952: duplicate detected by cursor audit](https://issues.apache.org/jira/browse/AMQ-4952)
- [ActiveMQ Classic `BaseDestination` source](https://github.com/apache/activemq/blob/main/activemq-broker/src/main/java/org/apache/activemq/broker/region/BaseDestination.java)
- [ActiveMQ Classic message redelivery and DLQ handling](https://activemq.apache.org/components/classic/documentation/message-redelivery-and-dlq-handling)
