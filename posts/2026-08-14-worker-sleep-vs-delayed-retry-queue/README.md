# Move Failed Work to a Delayed Retry Queue Instead of Sleeping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Delayed Retry, Message Queue, Worker Pool, Backoff, Amazon SQS, Azure Service Bus

Description: Release worker capacity during long backoff by scheduling durable retry work while preserving delivery guarantees, metadata, fairness, and shutdown safety.

---

Sleeping is cheap only when the waiting task retains nothing scarce. A blocked operating-system thread clearly wastes a worker. An asynchronous timer may release the thread, but the suspended task can still hold a semaphore permit, message lease, response body, database connection, memory, and a place in an in-process queue.

For short in-request retries, a cancellation-aware timer is usually appropriate. For long-running worker retries, move the due time into durable queue or scheduler state and release execution capacity.

## Identify What the Sleep Retains

Before changing architecture, inspect the scope around the wait:

~~~text
worker receives message
acquires global concurrency permit
opens database transaction
calls dependency
dependency fails
sleeps for 60 seconds
retries
acknowledges message
releases everything
~~~

This design holds the permit for the whole minute and may hold much more. Moving only from <code>sleep</code> to an async delay does not fix the permit scope.

An attempt should generally:

1. acquire attempt-scoped capacity;
2. open required resources;
3. execute;
4. close resources and release capacity;
5. classify the result;
6. schedule durable retry if needed;
7. acknowledge the current delivery only after scheduling is safe.

## Choose In-Process Wait or Durable Scheduling

Use an in-process cancellation-aware wait when:

- the delay is short relative to request lifetime;
- the caller is waiting synchronously;
- losing the pending retry on process exit is acceptable or the original work remains leased;
- no scarce permit or connection is retained;
- the overall deadline will end soon.

Use a delayed retry queue or scheduler when:

- delays are seconds to days;
- workers restart or autoscale;
- the original caller is no longer connected;
- waiting work must survive a crash;
- queue fairness and independent retry capacity matter;
- pending work volume is too large to retain in memory.

Durable scheduling changes delivery semantics. Treat it as a message handoff, not as a fancy sleep.

## Define the Retry Envelope

Carry enough state to make the next attempt safe and bounded:

~~~json
{
  "original_message_id": "job_91c4",
  "operation_id": "resize_7b21",
  "attempt": 4,
  "first_seen_at": "2026-08-14T10:00:00Z",
  "due_at": "2026-08-14T10:01:12Z",
  "failure_class": "dependency_unavailable",
  "trace_context": "vendor-neutral propagated fields",
  "tenant_id": "tenant_42",
  "payload_reference": "object-version://jobs/job_91c4"
}
~~~

The consumer must validate internal metadata. Preserve the original operation and idempotency identity, increment attempts monotonically, and retain <code>first_seen_at</code> so republishing or restart cannot reset the maximum age.

Use an immutable payload or versioned reference. Do not place credentials that will expire during backoff in the message; acquire fresh authorization at attempt time.

## Make Publish and Acknowledge Recoverable

The dangerous handoff is:

~~~text
publish delayed copy
acknowledge original
~~~

If publish succeeds and the worker crashes before acknowledgement, both copies can be delivered. If it acknowledges first and publish fails, the job is lost.

Use the strongest mechanism the broker and data store offer:

- broker transaction or atomic dead-lettering;
- publish confirmation before acknowledgement;
- transactional outbox recorded with the business transaction;
- idempotent consumer keyed by stable operation ID;
- duplicate-tolerant handoff with reconciliation.

Publisher confirmation narrows uncertainty but a crash after confirmation and before acknowledgement still permits a duplicate. Consumer idempotency remains necessary for at-least-once systems.

## Understand Broker-Specific Delay Semantics

Amazon SQS offers several distinct mechanisms:

- a per-message timer hides a newly sent standard-queue message for up to 15 minutes;
- FIFO queues do not support individual message timers;
- a queue-level delay applies to messages sent to that queue;
- changing visibility delays redelivery of a message already received, up to the documented visibility limit;
- EventBridge Scheduler is the recommended AWS option for more advanced or longer scheduling.

Changing SQS visibility keeps the message in flight. In-flight quotas still matter, and a FIFO message blocks later messages with the same group ID. It can be reasonable for short processing extensions, but it is not a free long-term delayed queue.

Azure Service Bus scheduled messages do not become active in the queue until their scheduled enqueue time. While a message remains scheduled, the sequence number returned by the scheduling API can be used to request cancellation. Activation and cancellation are not mutually locked, however, so cancellation close to the due time can race and the message can still become active. On activation it is appended as newly enqueued work with a new sequence number, so design ordering and idempotency accordingly.

RabbitMQ can combine message TTL with dead-letter routing to create retry queues, but expiration and queue-head behavior require care. Per-message TTL can leave expired messages behind non-expired messages until they reach the head, and dead-letter routing has documented safety and cycle considerations.

Never assume a generic queue API supports an arbitrary per-message due time. Use the exact limits and ordering contract of the deployed broker.

## Separate New Work from Retry Work Fairly

A single worker pool that immediately reacquires permits for due retries can starve new work during dependency recovery. Options include:

- separate queues and concurrency limits for initial and retry work;
- weighted fair scheduling between new, retry, and tenant classes;
- a retry-token budget at dequeue time;
- per-destination concurrency limits;
- gradual redrive or due-work ramp-up.

Do not permanently prefer new work either; retries can age out and violate business objectives. Schedule by explicit priorities, maximum age, and tenant fairness.

For multi-tenant queues, retain a trustworthy tenant identity in the envelope. One tenant's failing workload should not occupy every delayed slot or due-work permit.

## Handle Shutdown and Cancellation

In-memory sleepers need cancellation and a bounded shutdown drain. Durable scheduled work normally stays in the broker, so workers can stop without retaining timers. Still ensure:

- a worker does not acknowledge until the retry handoff is safe;
- lease extension stops when the worker abandons the delivery;
- pending outbox records are flushed by a separate durable dispatcher;
- shutdown does not create a burst of immediate retries;
- process restart preserves attempt and due-time semantics.

If due times are stored as wall-clock instants for a distributed broker, tolerate clock skew and late delivery. Locally measuring a short delay should use a monotonic clock. Do not promise exact execution at <code>due_at</code>; promise no earlier than the broker's documented semantics and measure scheduling lag.

## Observe the Waiting Population

Track:

- delayed messages and scheduled work count;
- oldest and percentile scheduling lag;
- due work by failure class and destination;
- attempts and maximum age;
- publish-confirm and acknowledgement failures;
- duplicate operation detections;
- retry queue to new queue service ratio;
- worker permits held while no attempt is active;
- dead-letter and expired work.

Alert before a recovery wave becomes due. A large delayed population can be harmless while sleeping and dangerous when released simultaneously.

## Test Crash Points

Inject a crash:

- before retry publication;
- after publication but before confirmation;
- after confirmation but before acknowledgement;
- after acknowledgement;
- while an outbox record is undispatched;
- as delayed work becomes due.

Verify no permanent loss, bounded duplicates, stable attempt history, correct tenant routing, and idempotent effects. Also test broker delay limits, FIFO group behavior, and a backlog becoming due during partial dependency recovery.

## Official Documentation

- [Amazon SQS message timers](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-timers.html)
- [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Azure Service Bus message scheduling](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sequencing)
- [RabbitMQ time-to-live](https://www.rabbitmq.com/docs/ttl)
- [RabbitMQ dead-letter exchanges](https://www.rabbitmq.com/docs/dlx)

## Conclusion

An async sleep frees a thread but may still retain the worker's real bottleneck. For long delays, publish a durable retry with stable identity, attempt history, due time, and tenant scope, then release attempt resources. Make the publish-and-ack handoff recoverable and govern the recovery wave with fairness and retry budgets.
