# SQS Visibility Timeouts: Preventing Two Workers from Processing the Same Message

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Amazon SQS, Visibility Timeout, At-Least-Once Delivery, Message Consumer, Idempotency

Description: Size and extend SQS visibility timeouts safely while using idempotency and fencing to control overlapping message processing.

---

An Amazon SQS visibility timeout is a temporary lease, not a lock and not an acknowledgement. Receiving a message leaves it in the queue but hides it from other receives. If the worker does not delete it before the timeout expires, SQS can give it to another worker while the first worker is still running.

Set the initial timeout above normal processing time, extend it with heartbeats for variable work, and delete only after durable success. Even with those measures, design the effect to be idempotent: AWS documents that the at-least-once model can deliver a message more than once during the visibility period, particularly for standard queues.

## See the overlap window

Assume a queue has a 30-second visibility timeout:

```text
00s  worker A receives message M with receipt handle R1
25s  worker A is still calling a slow dependency
30s  M becomes visible again
32s  worker B receives M with receipt handle R2
36s  worker A commits the business effect
40s  worker B commits the same effect
```

Nothing in SQS stops worker A at 30 seconds. Expiry only changes queue visibility. The application now has two live attempts, and each receive has a different receipt handle.

The same overlap can occur when a worker pauses for garbage collection, loses network access, exhausts a database pool, waits behind its own internal queue, or completes processing but cannot delete the message before expiry.

## Receiving is not deleting

An SQS message has three relevant phases:

1. **Available:** a consumer can receive it.
2. **In flight:** it has been received but not deleted and is temporarily invisible.
3. **Deleted:** SQS has accepted a delete using the appropriate receipt handle.

The queue's default visibility timeout is 30 seconds unless configured otherwise. A consumer can set a visibility timeout on a receive and can call `ChangeMessageVisibility` for the current receipt handle while work is in progress. Setting it to zero makes the delivery visible immediately.

Visibility changes are per received message and are not persisted as the queue's new default. AWS limits visibility to 12 hours from the original receive; extending it does not reset that clock. Work that can exceed that boundary should be split into durable steps or moved to an orchestration service suited to long-running execution.

## Choose an initial timeout from measurements

Do not set the timeout equal to average handler latency. Averages hide the tail that creates overlaps. Start from a high percentile of end-to-end duration, including:

- time waiting in the worker's local executor;
- database and remote API latency;
- retry and backoff inside the handler;
- time to commit the result;
- time and network margin for `DeleteMessage`.

A workload with a measured p99 of 52 seconds might begin with a 75-second timeout, then be adjusted from observed expiry and recovery behavior. A timeout that is too short creates concurrent attempts; one that is too long delays recovery after a real crash.

Keep local prefetch or concurrency bounded. Receiving hundreds of messages into an internal queue starts all of their visibility clocks before a handler is ready. Either receive only available capacity or extend waiting deliveries carefully.

## Extend long work with a heartbeat

For variable-duration work, renew visibility well before expiry. Store the monotonic time of the last successful renewal and treat a failed or uncertain renewal as loss of the lease.

```text
receive with 90s visibility
every 30s while active:
    ChangeMessageVisibility(message, 90s)
    record successful renewal time
after durable success:
    DeleteMessage(message, latest receipt handle)
```

Renewing at one-third or one-half of the timeout leaves room for a transient API failure. Add jitter so a large worker fleet does not renew every message simultaneously. Bound total processing time and renewal attempts; heartbeats should not keep a poisoned or deadlocked operation invisible forever.

Stop applying new side effects if the renewal deadline passes without confirmation. This is only an application rule—the old thread is still running—so cancellation must propagate into database and HTTP operations where possible.

## Receipt handles belong to receive attempts

Each receive returns a new `ReceiptHandle`. Use the most recent handle for `DeleteMessage` and `ChangeMessageVisibility`, not the stable `MessageId`. AWS states that deleting with an old handle can return success while the message might not be deleted.

This creates an important stale-worker race. Worker A has R1; after expiry, worker B receives R2. A late delete with R1 is not a safe ownership test. Design the business store to reject A's stale write rather than relying on SQS settlement as fencing.

Also handle an ambiguous delete. A request can time out after SQS accepts it, or a standard-queue replica can later return a copy in a documented rare case. Retrying the business operation must still be safe.

## Make the effect idempotent

The simplest strong boundary is a database uniqueness rule keyed by a stable operation ID carried in the message:

```sql
BEGIN;

WITH claimed AS (
    INSERT INTO message_inbox (consumer_name, operation_id, processed_at)
    VALUES ('invoice-worker', :operation_id, now())
    ON CONFLICT (consumer_name, operation_id) DO NOTHING
    RETURNING operation_id
)
INSERT INTO invoices (invoice_id, account_id, amount_minor)
SELECT :invoice_id, :account_id, :amount_minor
FROM claimed;

COMMIT;
```

If workers A and B race, the unique constraint lets one transaction apply the result. The other sees a committed duplicate and can delete its delivery without repeating the effect.

Do not use the SQS receipt handle as the idempotency key because it changes on every receive. `MessageId` can identify a sent SQS message, but a producer that sends the same logical operation twice creates different messages. A business `operation_id` generated before the first send survives producer retries, redrive, and republishing.

For a remote API, reuse that operation ID through the provider's documented idempotency mechanism. If the provider offers no idempotency key, retain an `unknown` state and reconcile an ambiguous timeout before sending the request again.

## Add fencing when stale work must stop

Idempotency prevents duplicate outcomes, but it may not prevent wasted concurrent work. Generate a unique attempt ID for each receive; a durable lease can then fence stale attempts:

```sql
UPDATE work_item
SET owner = :attempt_id,
    lease_version = lease_version + 1,
    lease_until = now() + interval '90 seconds'
WHERE operation_id = :operation_id
  AND (lease_until IS NULL OR lease_until < now() OR owner = :attempt_id)
RETURNING lease_version;
```

Every later state change includes the most recently returned `lease_version` in its condition. Once another attempt increments the version, the stale attempt's update affects zero rows. This protects a local database state machine even when the old process keeps running.

Use care around external calls: a database lease cannot revoke an API request already accepted by another service. Stable downstream idempotency and reconciliation remain necessary.

## Handle failures intentionally

If a retryable dependency fails and another worker should try immediately, call `ChangeMessageVisibility` with zero. Otherwise, let the current timeout expire. Do not delete a message merely because handling threw an exception.

Configure a dead-letter queue and choose `maxReceiveCount` high enough for plausible transient failures. `ApproximateReceiveCount` helps diagnose repeated receives, but it is not a substitute for an application operation ID or an exact business attempt ledger.

For poison messages, record the failure class and relevant correlation IDs without logging secrets. Alert on dead-letter arrivals and provide a controlled redrive process. Inbox retention must cover redrive age, or an old message can outlive its deduplication record.

## Standard and FIFO queues differ, but both need safe handlers

Standard queues provide at-least-once delivery and can occasionally return a copy even inside the visibility period. FIFO queues preserve receive order within a `MessageGroupId`. One receive call can return multiple messages from the same group in a batch; while those messages are in flight, later receive calls do not return more messages from that group.

If a FIFO message's visibility expires, it becomes eligible for redelivery. Once received again, it is in flight and later receive calls for its group wait until the received message is deleted or becomes visible again. FIFO producer deduplication prevents certain duplicate sends; it does not atomically join your business transaction to `DeleteMessage`. A crash after the effect and before deletion can therefore run the handler again.

## Operate the lease, not just the queue

Monitor:

- age of the oldest message and receive count;
- visible and not-visible message estimates;
- processing duration percentiles versus configured visibility;
- visibility-extension successes, failures, and lateness;
- delete latency and errors;
- concurrent duplicate or inbox-conflict counts;
- dead-letter depth and redrive age.

Test with a handler that deliberately runs beyond the timeout. Verify that another worker receives the message and that only one durable effect exists. Then inject a timeout after `ChangeMessageVisibility` and after `DeleteMessage`, pause a worker process, and redrive an old message.

The safe mental model is a renewable lease with at-least-once delivery. Visibility buys time for one attempt; idempotency and fencing keep the system correct when that attempt overlaps another.

## Official Documentation

- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Amazon SQS `ChangeMessageVisibility` API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ChangeMessageVisibility.html)
- [Amazon SQS `DeleteMessage` API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_DeleteMessage.html)
- [Amazon SQS message and receipt-handle identifiers](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-message-identifiers.html)
- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS dead-letter queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)
- [PostgreSQL `INSERT` and `ON CONFLICT`](https://www.postgresql.org/docs/current/sql-insert.html)
