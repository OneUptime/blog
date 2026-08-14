# Stop Poison Messages with Bounded Retries and a Dead-Letter Queue

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Message Queue, Dead-Letter Queue, Poison Messages, Backoff, Amazon SQS, RabbitMQ

Description: Keep one permanently failing message from cycling forever by classifying errors, bounding attempts and age, delaying retries, and quarantining safely.

---

A poison message fails for a durable reason: malformed data, an unsupported schema, a deleted tenant, an impossible state transition, or a handler bug triggered by that payload. Backoff reduces how often it runs, but time does not make the message valid. Without a terminal policy, it consumes delivery capacity forever and can block later work.

The correct control flow distinguishes permanent failure from transient failure, limits both retry count and age, and moves exhausted work to a dead-letter queue for diagnosis and controlled redrive.

## Prove Which Message Is Stalling Progress

Look for:

- the same message or business operation ID failing repeatedly;
- delivery or receive count increasing without completion;
- a stable exception type or validation reason;
- queue age rising while consumer throughput appears active;
- a FIFO message group whose later messages are not delivered;
- immediate requeue cycles with high CPU and broker traffic.

Do not identify a poison message from one failure. A dependency outage can make every valid message fail. Group failures by bounded reason and dependency, then compare one message's history with the fleet.

Keep payloads out of ordinary logs. Record a message ID, schema version, handler version, tenant cohort, first-seen time, attempt count, and low-cardinality failure class. Put sensitive payload inspection behind the DLQ's access controls.

## Classify Before Scheduling

Use three outcomes:

| Outcome | Examples | Action |
| --- | --- | --- |
| success | business effect committed and acknowledgement safe | acknowledge or delete |
| transient | timeout, documented throttling, temporary dependency failure | delayed bounded retry |
| permanent | invalid schema, unsupported version, failed invariant, forbidden operation | dead-letter immediately |

Unknown internal errors can receive a small bounded retry allowance because a deployment or transient runtime problem may clear. They must not retry forever.

If the handler partially committed, retry classification also depends on idempotency. The queue's at-least-once delivery means duplicates can occur even without an application retry loop. Give the business operation a stable identity and make its effects idempotent or deduplicated.

## Bound Attempts and Elapsed Age

An attempt limit alone resets accidentally if a worker republishes a message without preserving metadata. An age limit alone can permit a high-rate loop. Enforce both:

~~~text
retry only when:
  failure is transient
  AND delivery attempts < maximum attempts
  AND now - first_seen_at < maximum retry age
  AND retry budget permits another attempt
~~~

Prefer the broker's authoritative delivery count when it exists. If the application republishes into retry queues, carry an immutable original message ID, <code>first_seen_at</code>, and increasing attempt number. Do not trust producers to set arbitrary internal retry metadata without validation.

Choose limits from recovery data and business freshness. A webhook might be valuable for hours; an inventory reservation may become harmful after its client deadline expires.

## Delay Without an Immediate Requeue Loop

Rejecting and immediately requeueing places the same work back in competition with no recovery time. RabbitMQ explicitly warns that requeue loops can consume substantial network and CPU resources. Use one of:

- a broker visibility or redelivery delay;
- a delayed retry queue or scheduled message;
- retry queues with bounded TTL and dead-letter routing;
- a durable external scheduler for longer delays.

Apply jitter where many messages fail on the same dependency. Release the worker's execution and concurrency slot during delay. If the broker counts delayed or invisible messages against an in-flight quota, include that in capacity planning.

Do not hold a database transaction or network connection while waiting.

## Configure a Dead-Letter Boundary

In Amazon SQS, a source queue redrive policy names a DLQ and <code>maxReceiveCount</code>. SQS uses that receive-count threshold to decide when to move the message. Set the count high enough to tolerate real transient failures, but not so high that one durable failure circulates for days.

SQS visibility timeout hides a received message while it is processed. If it is not deleted, it becomes visible again and can be received again. The service is at-least-once, so duplicate delivery remains possible even during the visibility window.

For FIFO queues, one in-flight message blocks later messages in the same message group. Moving a poison message to a DLQ can unblock the group, but it removes that item from the original sequence. AWS cautions against a DLQ when an application must preserve exact FIFO order without interruption. Decide whether quarantine or complete-order halt is the correct business behavior.

In RabbitMQ, dead-letter exchanges can receive messages rejected without requeue, expired by TTL, dropped because of a length limit, or returned beyond a quorum queue delivery limit. Configure DLX behavior with policies where possible. RabbitMQ also documents dead-letter cycles and safety differences; quorum queues can provide at-least-once dead-lettering when configured appropriately.

## Preserve a Diagnostic Envelope

The dead-letter record should make remediation possible:

~~~json
{
  "original_message_id": "evt_7d3e",
  "first_seen_at": "2026-08-14T09:15:00Z",
  "last_failed_at": "2026-08-14T09:24:31Z",
  "attempts": 6,
  "failure_class": "unsupported_schema",
  "handler_version": "orders-2026.08.14.2",
  "source": "orders-v1",
  "payload_reference": "protected://dlq-payload/evt_7d3e"
}
~~~

Store a protected payload or reference according to retention and privacy policy. Do not lose trace context, tenant routing, schema identifier, or idempotency identity. Do not copy expiring credentials into the envelope.

The DLQ is not a successful sink. Alert on newly visible DLQ messages, age, and growth. In SQS, AWS recommends monitoring <code>ApproximateNumberOfMessagesVisible</code> for DLQ state because automatically moved messages do not behave like manually sent messages in every send metric.

## Redrive Only After the Cause Is Fixed

Before redrive:

1. reproduce the failure with a protected sample;
2. deploy or configure the fix;
3. verify the handler remains idempotent;
4. decide whether the message is still within its business validity window;
5. start at a low redrive rate;
6. watch normal queue age, failures, and dependency saturation;
7. stop if the same failure returns.

Amazon SQS supports controlled DLQ redrive velocity and recommends starting slowly to avoid overwhelming the destination. Redrive does not transform messages, so messages requiring schema repair need a separate reviewed remediation pipeline.

Never bulk redrive because an alert is inconvenient. A DLQ full of permanently invalid events will simply reproduce the outage.

## Test Ordering and Crash Boundaries

Test:

- permanent validation failure dead-letters without transient retries;
- transient failures use the intended delays and then succeed;
- attempts and first-seen age survive worker restart;
- a crash after business commit but before acknowledgement does not duplicate effects;
- a failed publish to the DLQ does not silently discard the source message;
- FIFO group behavior matches the chosen ordering policy;
- redrive rate limiting protects the recovered consumer;
- DLQ access and retention meet data policy.

The publish-and-ack transition needs broker-supported dead lettering, a transaction, publisher confirmation, or another recoverable protocol. A naive application that publishes to a DLQ and then crashes before acknowledging can duplicate; acknowledging first can lose the message.

## Official Documentation

- [Amazon SQS dead-letter queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Amazon SQS DLQ redrive](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-dead-letter-queue-redrive.html)
- [RabbitMQ dead-letter exchanges](https://www.rabbitmq.com/docs/dlx)
- [RabbitMQ negative acknowledgements](https://www.rabbitmq.com/docs/confirms)

## Conclusion

Backoff cannot repair a permanently invalid message. Classify the failure, cap attempts and age, delay transient work without holding a worker, and quarantine exhausted or permanent failures in an observable DLQ. Redrive only after remediation, at a controlled rate, with ordering and duplicate effects understood.
