# SQS Standard vs. FIFO: What Exactly-Once Processing Does and Does Not Guarantee

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Amazon SQS, FIFO Queue, Standard Queue, Exactly-Once Processing, Message Deduplication

Description: Compare SQS queue guarantees precisely and understand why FIFO deduplication still requires idempotent business processing.

---

Amazon SQS standard queues provide at-least-once delivery and best-effort ordering. FIFO queues add producer-side deduplication and strict ordering within each message group. AWS calls the FIFO feature “exactly-once processing,” but its documented mechanism does not make your database update and `DeleteMessage` one atomic operation.

A FIFO consumer can still execute business code again after its visibility timeout expires or after it commits an effect and fails before deleting the message. Use FIFO to control queue-introduced duplicates and per-group order; use application idempotency to control repeated effects.

## Compare the guarantees

| Property | Standard queue | FIFO queue |
|---|---|---|
| Delivery model | At least once | SQS does not introduce duplicates under FIFO deduplication rules |
| Ordering | Best effort; messages may arrive out of order | Strict within each `MessageGroupId` |
| Producer retry deduplication | None | Same deduplication ID suppressed within five minutes |
| Parallelism | Broad queue-level concurrency | Concurrent across groups, sequential within a group |
| Consumer visibility | Message hidden temporarily after receive | Same, plus later messages in that group are withheld |
| Need for idempotent effects | Yes | Yes |

The last row is the important one. Queue-level exactly-once language is narrower than end-to-end exactly-once business execution.

## Why standard queues can deliver duplicates

SQS stores message copies redundantly across multiple servers. AWS documents a rare case in which a server holding one copy is unavailable when another copy is received and deleted. The unavailable copy is not deleted and can be returned later.

Standard queues may also expose the familiar visibility-timeout retry: a message remains in the queue after receive, becomes visible again if it is not deleted, and can then be processed by another worker. They make a best-effort attempt at ordering but can return messages out of order.

Use standard queues when very high throughput and loose ordering fit the workload, and when consumers already treat duplicates and reordering as normal. Good examples include independent image jobs, telemetry enrichment, and cache invalidation keyed by version.

## What FIFO deduplication actually matches

Every FIFO send needs a `MessageGroupId` and a deduplication identity. You can supply `MessageDeduplicationId` explicitly or enable content-based deduplication.

With an explicit ID, sends using the same value during the five-minute deduplication interval are accepted but only one copy is introduced into the queue. SQS continues tracking the ID even after the message is received and deleted.

With content-based deduplication, SQS computes a SHA-256 hash from the message body. Message attributes are not included. Two messages with the same body but different attributes therefore collide, while semantically equivalent bodies with different JSON formatting may not.

An explicit business-derived ID is usually clearer:

```javascript
await sqs.send(new SendMessageCommand({
  QueueUrl: process.env.ORDERS_QUEUE_URL,
  MessageBody: JSON.stringify(event),
  MessageGroupId: event.orderId,
  MessageDeduplicationId: event.eventId
}));
```

Keep `eventId` stable for retries of the same logical event. A fresh UUID on every retry defeats deduplication. Do not reuse an ID for a different payload after correcting a message; SQS considers the identifier, not your business intent.

The five-minute window is also a boundary. Sending the same deduplication ID after that window can create another queued message. Long-lived API idempotency requires a durable application record, not just FIFO's recent-send memory.

## Ordering is scoped to a message group

FIFO order is not a total order across the entire queue unless every message uses the same group ID. SQS processes messages from one `MessageGroupId` in strict sequence and allows different groups to progress concurrently.

Choose a group key that matches the causal boundary:

- `order_id` for transitions of one order;
- `account_id` for a balance state machine;
- `device_id` for commands to one device.

Using one constant group ID preserves a global sequence but constrains concurrency. Using a random group ID for each event maximizes concurrency but destroys per-entity ordering. A stable, granular business key is usually the intended compromise.

When a message in a group is in flight, SQS does not make later messages from that group available in subsequent receives until the in-flight message is deleted or becomes visible again. Other groups can continue. A poisoned head message can therefore stall only its group if group IDs are well distributed.

## The consumer can still run twice

Consider a FIFO message for `order-417`:

```text
worker A receives the message
worker A commits status=shipped
worker A crashes before DeleteMessage
visibility timeout expires
worker B receives the same message
worker B runs the handler again
```

FIFO has not introduced a second queued send. The original message is being retried because it was never settled. This behavior preserves reliable processing after consumer failure.

There is no distributed transaction joining an arbitrary database or external API to SQS deletion. Deleting before the effect risks loss; deleting after the effect permits repetition. Keep the latter order and make the effect idempotent.

```sql
BEGIN;

INSERT INTO consumed_operation (consumer_name, event_id, processed_at)
VALUES ('order-worker', :event_id, now())
ON CONFLICT (consumer_name, event_id) DO NOTHING
RETURNING event_id;

-- Apply only for the row returned above.
UPDATE orders
SET status = 'shipped', version = :version
WHERE order_id = :order_id AND version < :version;

COMMIT;
```

Delete the SQS message after this transaction commits. A replay becomes a duplicate no-op. Retain the inbox row across the maximum message retention, dead-letter retention, and operational redrive period.

## Separate four kinds of duplicate

“Duplicate” is too broad for diagnosis. Record which identity repeated:

1. **Producer retry duplicate:** the same logical send is attempted again. FIFO can suppress it within the deduplication interval when the ID is stable.
2. **Independent producer duplicate:** two upstream workflows create the same business action, often with different event IDs. FIFO cannot infer they are the same.
3. **Consumer redelivery:** one queued message is received again after failed or incomplete settlement. The handler must be idempotent.
4. **Repeated downstream effect:** a remote service executes twice because the consumer retried an ambiguous request. The downstream API needs its own idempotency key or reconciliation path.

A FIFO queue directly addresses the first class and constrains order. It does not automatically solve the other three.

## Visibility and receipt handles still matter

Receiving does not remove a FIFO message. Size the visibility timeout above normal processing and extend it with `ChangeMessageVisibility` for long-running work. If it expires, the same message becomes eligible again and later messages in its group remain behind it.

Each receive gets a new receipt handle. Delete with the most recent handle. Do not use a receipt handle as the business idempotency key because it identifies a receive attempt rather than a logical operation.

For failed `ReceiveMessage` calls on FIFO queues, `ReceiveRequestAttemptId` can deduplicate receive attempts under AWS's documented conditions. It improves retry behavior at the API boundary; it does not replace handler idempotency after a crash or expired visibility.

## Partial batch failures need order-aware handling

AWS Lambda event source mappings invoke SQS handlers at least once. By default, one exception makes all messages in the batch visible again, including records already processed. Enabling `ReportBatchItemFailures` lets the function identify failed records and avoids needless retries of successful records.

For FIFO queues, AWS instructs handlers to stop after the first failure and report the failed and all unprocessed records. Continuing past the failed record would let later work in the group overtake it at the application layer, despite ordered delivery from the queue.

The same principle applies to custom batch consumers: do not delete later messages from a group while an earlier message failed if business order is required.

## Choose based on semantics, not the label

Choose a standard queue when:

- records are independent or can be version-checked;
- out-of-order arrival is acceptable;
- queue-level throughput and simple scaling dominate;
- consumer idempotency is already available.

Choose a FIFO queue when:

- retries of a send need a bounded deduplication window;
- events for the same business key must be delivered sequentially;
- group-based concurrency matches the domain;
- the throughput and integration constraints fit.

Before migrating, verify that every producing AWS service supports FIFO destinations. AWS lists some integrations that are not compatible. Also plan message-group distribution; a single hot group limits useful parallelism regardless of the queue's aggregate quota.

## Test the exact boundaries

For FIFO, send the same deduplication ID twice inside five minutes and confirm one message. Then repeat outside the window and observe that broker deduplication is no longer the durable business guard. Crash a consumer after its database commit but before deletion and confirm that the handler is invoked again while the database effect remains singular.

For both queue types, test visibility expiry, stale receipt handles, partial batch failure, dead-letter redrive, and duplicate upstream commands. Monitor receive count, duplicate-inbox conflicts, age per message group, visibility extensions, and dead-letter traffic.

FIFO gives valuable guarantees, but the precise design statement should be: “SQS suppresses duplicate FIFO sends within its documented identity and time scope, and orders each message group; our consumer separately guarantees idempotent business outcomes.”

## Official Documentation

- [Amazon SQS standard queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html)
- [Amazon SQS at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html)
- [Amazon SQS FIFO queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queues.html)
- [Amazon SQS FIFO exactly-once processing](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html)
- [Amazon SQS FIFO queue key terms](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-key-terms.html)
- [Amazon SQS FIFO delivery logic](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [AWS Lambda SQS error handling and partial batch responses](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html)
