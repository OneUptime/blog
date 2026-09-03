# Preserve Signal Correlation Across Retries and Dead-Letter Queues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Distributed Tracing, Correlation ID, Dead Letter Queue, Kafka, RabbitMQ

Description: Preserve workflow and message lineage across delivery attempts, republished retries, dead-letter routing, and manual replay without reusing spans or losing origin evidence.

---

Retries create new execution attempts, while redelivery may reuse the same message envelope and dead-lettering may republish it to another destination. A single “correlation ID” cannot distinguish those facts. Preserve three layers: a durable conversation/workflow ID, immutable message lineage, and a new span for every processing attempt.

The trace model can continue an existing trace for short retries or start a new trace linked to the original context for delayed replay. In either case, never reuse a finished consumer span as the current attempt.

## Define Identity Before Implementing Retries

Carry explicit metadata:

~~~text
workflow_id / conversation_id   stable business process
message_id                      current logical message/envelope
original_message_id             first message in retry chain
causation_id                    operation or message that produced this one
attempt                         application-observed attempt number
first_enqueued_at               original source timestamp
traceparent / tracestate        current propagatable trace context
~~~

The current OpenTelemetry messaging registry includes `messaging.message.id` and `messaging.message.conversation_id`, but messaging conventions are marked Development. Pin instrumentation and semantic-convention versions before relying on exact attribute names.

Do not use broker coordinates as the only domain identity. Kafka topic/partition/offset identifies a record in one cluster; a retry topic creates another record and offset. RabbitMQ delivery tags are channel-scoped. Preserve those coordinates as transport evidence alongside application message IDs.

## Create One Span per Attempt

When a consumer receives a message, extract its creation context and start a new process span with a link to that context. For a single-message operation, the process span may also use the creation context as parent; for a batch, link every message and do not select an arbitrary message as parent. Record attempt, destination, consumer group/subscription, message ID, and outcome. On a retry, start another span:

~~~text
message msg-42, workflow wf-9
  attempt 1: process span A -> timeout
  attempt 2: process span B -> rejected
  attempt 3: process span C -> success
~~~

Spans A, B, and C must have distinct span IDs. They can share a trace ID when they are close continuations and the backend can represent the lifecycle clearly. For long backoff, DLQ residence, or manual replay days later, start a new trace and link the new span to the most relevant retained attempt or creation context. Keep the workflow and original message IDs for durable search because the prior trace may be sampled or expired.

Add links when creating the new span if the prior context is known; OpenTelemetry head samplers can only consider links available at creation time. Do not reconstruct a W3C `traceparent` with a finished span ID by hand.

## Distinguish Broker Redelivery from Republish

RabbitMQ sets the `redelivered` flag when a delivery may have been seen before. Its reliability guide notes the useful asymmetry: if the flag is false, the message definitely has not been seen; if true, a consumer should assume it may have been processed and use idempotency. A requeue returns the delivery rather than proving the prior application transaction rolled back.

RabbitMQ dead-letter exchanges republish messages after rejection without requeue, expiry, queue-length limits, or quorum-queue delivery limits. Dead-lettering can change exchange and routing key and records history in the AMQP 0.9.1 `x-death` header plus first/last-death headers; AMQP 1.0 uses the `x-opt-deaths` message annotation and corresponding first/last-death annotations. Preserve and parse that broker evidence, but do not depend on its human presentation as your cross-broker contract.

Kafka's default processing model is commonly at least once: a consumer can process a record and fail before its offset is committed, causing the record to be read again. Retry and dead-letter topics are usually application or framework patterns that create new Kafka records. Preserve the source topic, partition, offset, original message ID, and causation relationship when republishing.

Kafka transactions can atomically commit consumed offsets with output records for Kafka-to-Kafka processing, but “exactly once” does not automatically include arbitrary external databases or APIs. Correlation and idempotency remain necessary at those boundaries.

## Inject Context into New Envelopes

For an application republish, create the retry send span first and inject its current context into a fresh headers collection:

~~~text
retry_send = start_span("send orders.retry", links=[failed_attempt])
with make_current(retry_send):
    retry.headers = new_headers()
    propagator.inject(current_context(), retry.headers, setter)
    retry.message_id = new_id()
    retry.original_message_id = original_id
    retry.causation_id = failed_message_id
    retry.attempt = prior_attempt + 1
    publish(retry)
retry_send.end()
~~~

Whether a republished retry keeps the same `message_id` is a domain decision. A clear default is: broker redelivery of the same record retains it; creation of a new envelope gets a new ID and keeps `original_message_id`. Document the rule so deduplication code and observability agree.

Never reuse a mutable Kafka/RabbitMQ headers object across attempts. Kafka `ConsumerRecord` documentation warns that its returned headers are mutable and the record is not thread-safe. Copy allowlisted application metadata into a new producer record.

## Make Processing Idempotent

Telemetry cannot prevent duplicated side effects. Before acknowledging or committing, make the domain operation idempotent using a business key, inbox table, conditional write, or transactional pattern appropriate to the system.

Record:

- idempotency decision (`new`, `duplicate`, `conflict`);
- attempt and redelivery evidence;
- acknowledgement or offset-commit result;
- retry policy and scheduled delay;
- dead-letter reason and destination;
- final disposition (`completed`, `retrying`, `dead_lettered`, `discarded`).

Do not put message or workflow IDs in ordinary metric labels; they are unbounded. Use bounded labels such as destination, outcome, and attempt bucket. Keep exact IDs on logs, spans, and durable message records.

## Treat DLQ Replay as a Controlled Transition

A replay tool should not simply copy every header. Validate the payload schema, destination, tenant, expiration, and retry policy. Allowlist metadata, create a new replay operation ID, and record operator/tool provenance. Strip stale vendor state or unsafe baggage at the trust boundary, then inject a fresh trace context and link to the original when available.

Preserve immutable dead-letter evidence before republishing. Otherwise, successful replay can erase why the message entered the DLQ. Make replay idempotent and rate-limited; a bulk replay can recreate the outage or overload downstream dependencies.

## Test the Full State Machine

Exercise successful first delivery, consumer crash before acknowledgement, application retry topic, RabbitMQ requeue, dead-letter routing, TTL expiry, retry exhaustion, manual replay, and duplicate replay. Assert unique attempt spans, correct links/parents, stable workflow/original IDs, new envelope IDs where required, broker coordinates, and no cross-message context leakage.

Also verify the failure path when old trace context is invalid or the trace has expired. The workflow must remain searchable without requiring the trace backend to be a system of record.

## Conclusion

Correlation survives retries when execution, message, and workflow identity remain separate. Create a new span for every attempt, preserve immutable origin and broker evidence, use fresh context on republished envelopes, link delayed replays instead of pretending an old span is active, and make side effects idempotent. That produces a complete lineage even when delivery is duplicated and traces age out.

## Official References

- [OpenTelemetry Semantic Conventions for Messaging Spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
- [OpenTelemetry Messaging Attribute Registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/)
- [OpenTelemetry Trace API: Links](https://opentelemetry.io/docs/specs/otel/trace/api/#link)
- [Apache Kafka Design: Message Delivery Semantics](https://kafka.apache.org/43/design/design/#message-delivery-semantics)
- [Apache Kafka ConsumerRecord API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRecord.html)
- [RabbitMQ Reliability Guide](https://www.rabbitmq.com/docs/reliability)
- [RabbitMQ Dead Letter Exchanges](https://www.rabbitmq.com/docs/dlx)
