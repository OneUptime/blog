# Why Messages Land in ActiveMQ.DLQ-and How to Diagnose the Poison Message

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ, ActiveMQ Classic, Dead Letter Queue, JMS, Troubleshooting

Description: Trace an ActiveMQ Classic dead-letter message back to its source, distinguish poison acknowledgements from expiry and duplicate detection, and fix the actual failure safely.

---

`ActiveMQ.DLQ` is evidence, not a root cause. In ActiveMQ Classic it is the default shared dead-letter queue, so messages from unrelated destinations and several failure paths can arrive together. The safest investigation starts by preserving that evidence and identifying the exact path that sent each message there.

This article covers ActiveMQ Classic. Artemis configures dead-letter addresses per address settings and uses different management operations.

## The common paths into the DLQ

### A consumer exhausted its redeliveries

When a Classic client exceeds its configured `maximumRedeliveries`, it sends a poison acknowledgement. The broker applies the destination's dead-letter strategy and normally moves a persistent message to the DLQ.

The application exception is only the beginning of the chain:

```text
listener failure
  -> transaction rollback or session recovery
  -> repeated delivery
  -> poison acknowledgement
  -> broker dead-letter strategy
```

If the listener framework catches the exception and acknowledges anyway, the message will not enter the DLQ. If it continually rolls back with unlimited redeliveries, it may never enter the DLQ.

### A message expired

The default dead-letter strategy processes expired messages. A short producer time-to-live, time spent behind a backlog, or clock problems can therefore create DLQ traffic even when no consumer threw an exception.

Set `processExpired="false"` only if discarding expired data is an explicit product decision. It reduces DLQ noise but removes forensic evidence and any chance of recovery.

### The store cursor detected a duplicate

Classic has a destination audit that can detect a duplicate while paging messages from the store. Versions before 5.17.0 sent evidence of that condition to a DLQ by default. From 5.17.0, `sendDuplicateFromStoreToDLQ` defaults to `false`; setting it to `true` sends a copy to the DLQ.

This failure is not the same as a business handler rejecting a payload. Investigate network connectors, failover, broker version, and the destination's `DuplicateFromStoreCount`.

### Broker policy selected the DLQ destination-or discarded the message instead

Classic can use a shared DLQ, an individual DLQ prefix such as `DLQ.`, or a discarding strategy that drops the message instead of sending it to a DLQ. Non-persistent messages are not dead-lettered by default; `processNonPersistent="true"` changes that. Always inspect the effective destination policy instead of assuming all queues behave alike.

## Freeze the evidence before replaying anything

Do not begin with “Retry all.” First:

1. stop or pause automated replay;
2. prevent a known-bad consumer version from receiving the same work;
3. record the DLQ queue size and arrival rate;
4. browse a bounded sample without consuming it;
5. export message identifiers, source destination, timestamps, delivery properties, and application correlation IDs;
6. protect sensitive message bodies in tickets and logs.

The ActiveMQ Classic `QueueViewMBean` supports browsing and retrieving a message by ID. Browsing is non-destructive, but it is paged and should not be treated as a consistent snapshot of a busy queue.

## Build a failure fingerprint

Group messages by facts that can reveal a common cause:

| Signal | What it can reveal |
|---|---|
| Original/source destination | A single broken workflow or routing rule |
| Producer application and version | A bad deployment or schema change |
| Message type or schema version | Payloads an older consumer cannot parse |
| First-seen time | Correlation with a release or dependency incident |
| Delivery count / redelivered flag | Whether normal consumer retry was involved |
| Expiration and timestamp | TTL too short for the observed backlog |
| Business key | One poison entity repeatedly generating work |
| Failure classification in app logs | Permanent validation error versus transient dependency error |

Provider-specific diagnostic fields vary by Classic version and transport. Do not build the only recovery procedure around one internal property name. Correlate the broker's message ID with structured consumer logs.

## Check the broker counters in context

For the source queue and `ActiveMQ.DLQ`, inspect:

- `QueueSize`: currently unacknowledged messages;
- `EnqueueCount` and `DequeueCount`: cumulative counts since statistics were reset;
- `InFlightCount`: dispatched but not yet acknowledged;
- `ConsumerCount`: active consumers;
- `ExpiredCount`: messages expired at the destination;
- `DuplicateFromStoreCount`: store duplicates detected;
- broker `StorePercentUsage` and `MemoryPercentUsage`.

`EnqueueCount - DequeueCount` is not a reliable substitute for `QueueSize`; the former are lifecycle counters and can include events that make the arithmetic misleading.

Also inspect the source consumer:

- Was its connection actually started?
- Is the session transacted, `CLIENT_ACKNOWLEDGE`, or automatically acknowledged?
- Does the framework roll back on this exception class?
- Is prefetch hiding many messages in one slow worker?
- Did a deploy, certificate expiry, schema migration, or dependency outage begin at the same time?

## Separate permanent and transient failures

A malformed JSON document will not become valid after ten immediate retries. A downstream timeout might recover, but only if retries are delayed and bounded.

Classify failures before changing `maximumRedeliveries`:

- **Permanent:** invalid schema, missing required business data, unsupported command, deterministic authorization denial. Quarantine and correct the data or producer.
- **Transient:** connection reset, brief dependency outage, deadlock victim, rate limit with a meaningful retry window. Use capped backoff and jitter.
- **Ambiguous side effect:** timeout after a write may have succeeded. Require an idempotency key or reconciliation before replay.
- **Broker/storage:** duplicate-from-store, KahaDB, network bridge, or failover evidence. Fix the messaging path rather than the payload.

## Prefer individual dead-letter queues

A shared `ActiveMQ.DLQ` is convenient initially but weakens ownership and alerting. Classic supports an individual dead-letter strategy:

```xml
<policyEntry queue=">">
  <deadLetterStrategy>
    <individualDeadLetterStrategy
        queuePrefix="DLQ."
        useQueueForQueueMessages="true"/>
  </deadLetterStrategy>
</policyEntry>
```

Test the policy in a staging broker and verify authorization for browsing and administering the resulting DLQs, as well as writing to the original destinations during replay. A wildcard policy can affect every queue.

## Diagnose before changing the retry count

Raising the retry limit may temporarily reduce DLQ ingress while multiplying downstream calls and delaying good messages behind poison ones. Lowering it may expose a latent transient outage as immediate quarantine.

The durable fix usually includes:

1. correct the consumer, producer, or dependency;
2. add explicit error classification;
3. make side effects idempotent;
4. set a bounded retry schedule;
5. route each workflow to an owned DLQ;
6. replay a canary message and observe it end to end;
7. alert on DLQ arrival rate, not merely a nonzero historical queue.

The goal is not an empty DLQ at any cost. It is a system in which every dead-lettered message has an explainable cause, an owner, and a safe disposition.

## Official Documentation

- [ActiveMQ Classic message redelivery and DLQ handling](https://activemq.apache.org/components/classic/documentation/message-redelivery-and-dlq-handling)
- [ActiveMQ Classic redelivery policy](https://activemq.apache.org/components/classic/documentation/redelivery-policy)
- [ActiveMQ Classic per-destination policies](https://activemq.apache.org/components/classic/documentation/per-destination-policies)
- [ActiveMQ Classic JMX reference](https://activemq.apache.org/components/classic/documentation/jmx)
- [ActiveMQ Classic `QueueViewMBean` API](https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/QueueViewMBean.html)
