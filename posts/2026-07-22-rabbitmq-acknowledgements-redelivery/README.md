# RabbitMQ Acknowledgements and Redelivery: When Can the Same Work Run Twice?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Consumer Acknowledgement, Message Redelivery, At-Least-Once Delivery, Idempotency

Description: Place RabbitMQ acknowledgements safely, understand every redelivery path, and keep repeated deliveries from repeating business effects.

---

With RabbitMQ manual acknowledgements, the same work can run twice whenever a consumer completes its effect but the broker does not receive the acknowledgement. A process crash, connection loss, channel closure, acknowledgement timeout, or explicit requeue can return the unacknowledged delivery to the queue.

That is the intended at-least-once tradeoff. Acknowledge before processing and failure can lose work; acknowledge after processing and failure can repeat it. For important effects, acknowledge after durable completion and make the handler idempotent.

## What an acknowledgement confirms

A consumer acknowledgement tells RabbitMQ that a particular delivery was successfully processed and can be removed. It is not a general response to the publisher. Publisher confirms and consumer acknowledgements are independent:

- a publisher confirm covers the publisher-to-broker path;
- a consumer acknowledgement covers the broker-to-consumer path.

A confirmed publish can later be redelivered to a consumer. A consumer acknowledgement says nothing about whether the original publisher received its confirm.

In automatic acknowledgement mode, RabbitMQ considers a message delivered immediately after sending it. If the consumer process fails while handling it, the broker has no unsettled delivery to return. This favors throughput but can lose work and can overwhelm a consumer because there is no manual-ack prefetch safety boundary.

Manual acknowledgement keeps a delivery unacknowledged until the application calls `basic.ack`. If the channel or connection closes first, RabbitMQ automatically requeues outstanding deliveries. Detection is not instantaneous, so a replacement consumer and the old process can overlap at the application layer during a network partition.

## The duplicate window

Consider an order handler:

```text
receive delivery tag 57
commit shipment in database
-- connection disappears here --
send basic.ack for tag 57
```

RabbitMQ cannot observe the database commit. When the channel closes, it requeues the delivery. Another consumer creates the same shipment unless the database operation is idempotent.

Moving `basic.ack` before the database transaction only changes the failure:

```text
receive delivery tag 57
send basic.ack for tag 57
-- process crashes here --
commit shipment in database
```

Now RabbitMQ deletes the message and the shipment never happens. There is no ordering of two independent commits that provides exactly-once effects under every failure.

## Use manual acknowledgements deliberately

A Java consumer can acknowledge only after its local transaction commits:

```java
boolean autoAck = false;

channel.basicConsume("shipments", autoAck, (consumerTag, delivery) -> {
    long tag = delivery.getEnvelope().getDeliveryTag();

    try {
        applyIdempotently(
            delivery.getProperties().getMessageId(),
            delivery.getBody()
        );
        channel.basicAck(tag, false);
    } catch (RetryableException error) {
        channel.basicNack(tag, false, true);
    } catch (Exception terminal) {
        channel.basicNack(tag, false, false);
    }
}, consumerTag -> {});
```

This sketch omits connection recovery and retry topology, but its boundary is correct: only a durable success is acknowledged. A retryable error requeues; a terminal error rejects without requeue so a configured dead-letter exchange can route it.

Delivery tags are scoped to a channel. An acknowledgement sent on a different channel causes an unknown-delivery-tag channel error. A second acknowledgement of the same tag is also an error.

The `multiple` flag acknowledges every outstanding delivery up to and including the specified tag. Use it only when all earlier tags on that channel are complete. With parallel handlers, acknowledging tag 20 with `multiple=true` while tag 18 is still running can delete unfinished work.

## Understand every redelivery path

RabbitMQ can redeliver when:

- a consumer uses `basic.reject` or `basic.nack` with `requeue=true`;
- the channel or connection closes with unacknowledged deliveries;
- a client process or host fails and the broker eventually detects the lost connection;
- a broker-enforced consumer acknowledgement timeout closes a supported queue's channel;
- application recovery deliberately asks for unacknowledged messages again.

The AMQP 0-9-1 envelope includes a `redelivered` boolean. RabbitMQ sets it when it knows a delivery was previously sent. Treat it as diagnostic context, not a correctness gate. The protocol guidance treats it as a hint; the absence of a redelivery flag must never authorize a non-idempotent effect.

A message can be redelivered to the same consumer or another one. Code must not keep duplicate state only in process memory.

## Bound unacknowledged work with prefetch

Prefetch limits the number of unacknowledged deliveries RabbitMQ will allow before sending more. It controls both memory pressure and the maximum set of deliveries exposed to replay when a channel fails.

```java
channel.basicQos(50);
```

A large prefetch can improve throughput for small, uniform tasks, but creates a larger replay burst and lets slow messages sit in client memory. A prefetch of one is conservative and can reduce throughput substantially. Measure handler latency, consumer count, memory, and replay cost rather than copying a universal value.

If handlers run concurrently, keep channel usage compatible with the client library's threading rules and serialize acknowledgements as required. Track every in-flight delivery so shutdown stops intake, waits for a bounded drain, acknowledges completed work, and closes the channel to requeue the rest.

## Avoid immediate requeue loops

An always-failing message combined with `requeue=true` can circulate rapidly among consumers, consuming CPU and network while useful work waits. Classify failures:

- retry transient dependency failures with delay and a limit;
- reject malformed or unauthorized messages as terminal;
- move exhausted messages to a dead-letter destination with failure context;
- alert on redelivery count and dead-letter arrival.

RabbitMQ quorum queues track unsuccessful delivery attempts and expose counts in headers. Modern quorum queues have a delivery limit, and RabbitMQ recommends dead-letter configuration so exhausted messages are not discarded unintentionally. Check the documentation for the exact counter behavior in the RabbitMQ version you operate; `basic.nack`, `basic.reject`, consumer loss, and timeouts do not all update counters identically across versions.

Delay retries using an explicit retry queue or supported delayed-retry mechanism rather than sleeping while holding an unacknowledged delivery. A sleeping consumer consumes prefetch capacity, extends the acknowledgement window, and makes recovery slower.

## Make the business operation idempotent

Publish a stable message ID or business operation ID. Do not generate it when the consumer receives the message, because each redelivery would get a different value.

For a relational database, enforce uniqueness in the same transaction as the effect:

```sql
BEGIN;

INSERT INTO message_inbox (consumer_name, message_id, received_at)
VALUES ('shipment-worker', :message_id, now())
ON CONFLICT (consumer_name, message_id) DO NOTHING
RETURNING message_id;

-- Execute only if the INSERT returned a row.
INSERT INTO shipments (order_id, status)
VALUES (:order_id, 'requested');

COMMIT;
```

If a repeated delivery reaches the handler, the unique constraint prevents a second effect. It is then safe to acknowledge the duplicate after confirming the first transaction is committed.

For naturally idempotent state changes, use conditional transitions such as “set version to 12 if current version is below 12.” For a remote API, reuse a downstream idempotency key derived from the original message ID. A local inbox cannot atomically protect an unrelated remote service.

Retain deduplication entries for at least the maximum time a message can return, including dead-letter redrive and manual replay. If entries expire after one day but an operator redrives a week-old message, the supposedly idempotent consumer will apply it again.

## Ordering changes the retry design

With several active consumers, RabbitMQ dequeues in FIFO order but processing finishes concurrently, and requeueing can alter the observed order. If strict order matters, use a stream or a queue with Single Active Consumer as RabbitMQ documents.

Even a single active consumer must decide what happens behind a failed message. Immediate requeue can block or reorder progress; dead-lettering allows later messages through but breaks strict business sequence. A version check or per-entity state machine often gives safer semantics than assuming delivery order alone.

## Test the acknowledgement boundaries

Automate at least these failure points:

1. Exit before the business transaction commits: no effect should remain, and the message should return.
2. Exit after the transaction commits but before `basic.ack`: the message should return, but the effect should remain singular.
3. Close the channel with several unacknowledged deliveries: all unfinished deliveries should be safe to replay.
4. Send the same delivery through two consumers concurrently: the uniqueness boundary should choose one winner.
5. Requeue a permanent failure until its configured limit: it should reach the intended dead-letter path.
6. Lose the acknowledgement response: retry and recovery should not create another business result.

Monitor ready and unacknowledged message counts, redelivery rates, acknowledgement latency, channel closures, consumer capacity, dead-letter traffic, and inbox conflicts. A rising inbox-conflict rate is evidence that the idempotency mechanism is protecting the system, but it also signals a retry or stability issue worth investigating.

RabbitMQ acknowledgements decide when the broker may forget a delivery. They cannot prove that the rest of a distributed workflow ran exactly once. Put the acknowledgement after durable success, then make every vulnerable effect converge when RabbitMQ legitimately sends the work again.

## Official Documentation

- [RabbitMQ consumer acknowledgements and publisher confirms](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ consumers guide](https://www.rabbitmq.com/docs/consumers)
- [RabbitMQ consumer prefetch](https://www.rabbitmq.com/docs/consumer-prefetch)
- [RabbitMQ queue ordering](https://www.rabbitmq.com/docs/queues#message-ordering)
- [RabbitMQ quorum queue poison-message handling](https://www.rabbitmq.com/docs/quorum-queues#poison-message-handling)
- [RabbitMQ AMQP 0-9-1 compatibility and conformance](https://www.rabbitmq.com/docs/specification)
- [PostgreSQL `INSERT` and `ON CONFLICT`](https://www.postgresql.org/docs/current/sql-insert.html)
