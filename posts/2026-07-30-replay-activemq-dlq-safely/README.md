# How to Replay ActiveMQ DLQ Messages Safely Without Losing or Duplicating Them

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ, ActiveMQ Classic, Dead Letter Queue, Message Replay, JMS

Description: Replay ActiveMQ Classic dead-letter messages with a canary-first, idempotent workflow that preserves evidence and prevents another retry storm.

---

A dead-letter replay is a new production write. It can repeat a side effect that already happened, reorder old work ahead of new work, or immediately recreate the incident that filled the DLQ. “Move everything back” is therefore not a safe runbook.

This article covers ActiveMQ Classic management operations. Artemis has different CLI and management APIs.

## Know what the Classic broker can do

The Classic `QueueViewMBean` exposes several operations:

- `retryMessage(messageId)` moves one DLQ message back to its original destination;
- `retryMessages()` retries messages from the DLQ;
- `moveMessageTo(messageId, destinationName)` moves one message to an explicit destination;
- `moveMatchingMessagesTo(selector, destinationName, maximumMessages)` moves a bounded matching set;
- the corresponding `copy...` operations retain the source copy.

Those are different safety choices. `retryMessage` depends on the broker retaining usable original-destination metadata. `moveMessageTo` is explicit but puts responsibility for the target on the operator. `copy` intentionally creates two copies and needs a later disposition step; it is useful for analysis, not as an accidental substitute for replay.

## Satisfy the replay preconditions

Do not replay until all of these are true:

- the original failure has been identified;
- the fixed consumer version is deployed and healthy;
- the handler is idempotent or each side effect can be reconciled;
- the source queue has enough capacity;
- downstream services can absorb the replay rate plus live traffic;
- message TTL and business deadlines have been reviewed;
- an owner can stop the replay immediately;
- a snapshot or export of the selected message metadata exists.

If a database write may have committed before the acknowledgement was lost, query by the business idempotency key first. A broker message ID identifies a delivery artifact; it does not prove the business operation did not complete.

## Select messages, not just a queue

Build a replay cohort from a bounded browse:

- source destination;
- failure reason or application error class;
- producer/schema version;
- time window;
- tenant or workload;
- delivery count;
- expiry and business validity;
- stable operation ID.

Exclude messages that are legally or operationally stale. Record the selector and message IDs in the incident record. JMS selector syntax operates on headers and properties, not arbitrary JSON body fields; body-based selection requires an external inspection or quarantine process.

When several workflows share `ActiveMQ.DLQ`, never run an unfiltered bulk operation simply because the broker exposes one.

## Use a canary-first sequence

### 1. Quiesce the broken path

Stop the old consumer deployment and disable any automatic DLQ reprocessor. If live traffic would obscure results, direct replay to a controlled quarantine queue consumed by the fixed version.

### 2. Capture a baseline

Record:

- DLQ and source `QueueSize`;
- cumulative enqueue/dequeue counters;
- source `ConsumerCount` and `InFlightCount`;
- broker store and memory usage;
- downstream error and saturation metrics;
- the exact candidate message IDs.

### 3. Retry one message

Use `retryMessage(messageId)` when original-destination routing is verified. Otherwise use `moveMessageTo` with a reviewed explicit destination. Follow that single message through broker dequeue, consumer logs, and the final business state.

Success means more than disappearance from the queue. Confirm the intended side effect occurred exactly once and no replacement dead letter was created.

### 4. Replay a small bounded batch

Increase from one to a small maximum count. Watch processing latency, error rate, DLQ re-entry, downstream rate limits, queue depth, and duplicate-suppression events. Pause between batches long enough to observe delayed failures.

### 5. Ramp within a rate budget

Continue in auditable batches. Do not allow replay to starve live traffic; use a quarantine queue, a dedicated consumer pool, or application-level rate limiting when necessary.

### 6. Reconcile and close

Compare the selected count with successful, rejected, expired, and still-pending outcomes. Account for every message before deleting exports or purging a queue.

## Choose move, retry, or copy deliberately

| Operation | Good use | Main risk |
|---|---|---|
| Retry one to original | Canary with trustworthy original routing | Original destination may no longer be valid |
| Move one to explicit queue | Controlled reroute or quarantine | Typo or policy mismatch sends work to the wrong place |
| Move a bounded selector | Homogeneous, reviewed cohort | Selector may be broader than expected |
| Copy to analysis queue | Forensics while preserving evidence | Two live copies can both be consumed |
| Retry all | Small, single-purpose, fully reviewed DLQ | Unbounded load and mixed failure causes |
| Purge | Confirmed disposable data after reconciliation | Irrecoverable message loss |

The MBean documentation notes that a message already dispatched to a consumer cannot always be removed. Quiescing consumers makes the administered set more predictable.

## Make replay idempotent

Broker delivery is at least once across failure boundaries. Build replay protection at the business layer:

```text
begin transaction
  if operation_id already completed:
      return recorded result
  apply business change
  record operation_id as completed
commit
acknowledge message
```

Where the side effect is an external API call, use the downstream service's idempotency key if available. Otherwise record an outbox/reconciliation state before retrying. Never use `JMSMessageID` as the only key if a producer can regenerate the same business operation as a new JMS message.

## Preserve ordering assumptions

Replayed messages re-enter a system that may already contain newer work. Ask:

- Does the consumer reject stale versions?
- Is a message group (`JMSXGroupID`) involved?
- Can an old “create” arrive after a new “delete”?
- Does the target queue have priority enabled?
- Will replay to a different destination bypass security or ordering policy?

If strict business ordering matters, pause the affected key's live flow, rebuild its sequence, or use a reconciliation job. A bulk queue move cannot reconstruct causality.

## Stop conditions

Automate or state explicit abort thresholds:

- any canary creates a new DLQ message;
- duplicate side effects appear;
- downstream errors or latency exceed the agreed limit;
- store or memory usage approaches its limit;
- replay throughput exceeds consumer capacity;
- messages land on an unexpected destination;
- the selected and observed counts diverge.

Stopping early is a successful safeguard, not a failed replay.

## Official Documentation

- [ActiveMQ Classic `QueueViewMBean` API](https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/broker/jmx/QueueViewMBean.html)
- [ActiveMQ Classic JMX reference](https://activemq.apache.org/components/classic/documentation/jmx)
- [ActiveMQ Classic message redelivery and DLQ handling](https://activemq.apache.org/components/classic/documentation/message-redelivery-and-dlq-handling)
- [Jakarta Messaging selector syntax and delivery semantics](https://jakarta.ee/specifications/messaging/3.1/jakarta-messaging-spec-3.1)
