# How to Correlate One HTTP Request with Multiple Message Consumers at Both Request and Message Level

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Distributed Tracing, OpenTelemetry, Correlation ID, Kafka, RabbitMQ

Description: Model HTTP-to-message fan-out with a request trace, per-message creation context, distinct consumer identity, and durable workflow lineage.

---

One HTTP request can publish several messages, and one published message can be delivered to multiple consumer groups or subscriptions. Request-level correlation should answer “what work did this request initiate?” Message-level correlation should answer “which message and consumer attempt produced this outcome?” A single shared trace ID cannot answer both precisely.

Use W3C context for execution relationships, unique message IDs and creation contexts for each message, and a durable workflow/conversation ID when the work outlives one practical trace.

## Model the Request Boundary First

Extract W3C `traceparent` and optional `tracestate` at the HTTP server and create a server span. The active server trace represents the request's execution. Generate or validate a separate workflow ID if the domain needs long-lived lookup.

~~~text
HTTP server span: POST /checkout
trace_id: T1
workflow_id: W1
~~~

Do not copy the inbound parent span ID into messages. Start producer/create spans, then let the configured propagator inject their current contexts. The trace ID normally remains T1, while each message gets the appropriate producer span ID as its propagated parent.

## Give Each Message Its Own Identity and Context

If the request produces three messages, model them independently:

~~~text
HTTP POST /checkout                       trace T1
  create payment-requested   span P1     message M1, workflow W1
  create inventory-reserve   span P2     message M2, workflow W1
  create confirmation-send   span P3     message M3, workflow W1
  send batch                 span S1     links P1, P2, P3
~~~

OpenTelemetry's messaging semantic conventions define create spans for a single message, which is especially useful when one batch send needs a distinct creation context for every item. When per-message attributes differ, place them on the associated links rather than claiming one message ID represents the batch.

Inject into a fresh carrier per message:

~~~text
for message in messages:
    create = start_create_span(message.destination)
    with make_current(create):
        message.headers = new_headers()
        propagator.inject(current_context(), message.headers, setter)
        message.headers["workflow-id"] = W1
        message.headers["message-id"] = message.id
    create.end()
~~~

Use library auto-instrumentation when it covers the client; avoid duplicating spans. Messaging conventions are currently marked Development, so verify emitted attributes and pin instrumentation versions.

## Identify Every Consumer Scope

Kafka consumer groups and messaging subscriptions are distinct delivery scopes. Two groups can receive the same record independently. RabbitMQ exchange and queue topology can likewise route one publication into several queues. Record destination, consumer group or subscription, service identity, and message ID on each process span.

At the message level, an operator should be able to distinguish:

~~~text
M1 / fraud-check group / attempt 1
M1 / payment-authorizer group / attempt 1
M1 / audit subscription / attempt 2
~~~

Do not interpret the same message ID in multiple consumers as duplication. It may be intentional fan-out. The consumer scope and attempt complete the identity.

## Choose One of Two Trace Shapes

### Continue the request trace

Each consumer extracts its message's creation context, links its processing span to that context, and—for a single-message process operation—may also use it as the remote parent. All consumer branches then share trace T1. This gives a direct end-to-end graph for bounded, promptly processed work.

### Start consumer traces with links

Each independently scheduled consumer starts a new trace and links its process span to the extracted message creation context. All telemetry also carries W1 and M1. This keeps long delays, different retention domains, or many fan-out branches from producing an enormous trace.

Both parent shapes can be correct, and both retain the creation-context link recommended by the current messaging conventions. Set policy based on latency, backend limits, trust boundaries, and investigation needs. Do not let individual teams choose differently without documentation, because the resulting graph becomes unpredictable.

For one batch process operation that handles several messages, use links to all message contexts rather than making the first message the parent. Supply known links at span creation so head sampling can consider them.

## Preserve Request-Level Search Without High Cardinality Metrics

At request level, search by trace T1 while it is retained, and by workflow W1 for the durable business view. At message level, search by M1 plus consumer group/subscription and attempt.

Put exact IDs on spans, structured logs, and the workflow/message system of record. Avoid trace, workflow, and message IDs as ordinary metric labels. Use bounded metric dimensions:

~~~text
service, destination, consumer_group, outcome, attempt_bucket
~~~

Metrics show that one consumer group's failures increased; exemplars can point from selected measurements to a trace. Logs then provide exact W1/M1 fields, and traces provide causality and timing.

If workflow ID is carried in W3C Baggage, remember that baggage is not automatically copied to span/log attributes and can cross downstream boundaries. Allowlist it, validate size, explicitly enrich needed telemetry, and remove it before unrelated third-party calls.

## Handle Acknowledgement and Retry Correctly

End the processing span when the attempt's work actually completes, then record settlement/acknowledgement according to instrumentation semantics. A broker acknowledgement confirms consumption state, not necessarily every external side effect unless application ordering guarantees that.

Create a new span for every retry or redelivery. Preserve M1 for the same logical message and increment attempt metadata. If the framework republishes to a retry topic or queue as a new envelope, create M2 and retain `original_message_id=M1` plus a causation relationship. A manual replay after long DLQ residence should usually start a new trace linked to prior context and retain W1.

## Verify Both Correlation Levels

Run an integration test that sends one HTTP request, publishes at least two messages, and delivers one message to at least two consumer groups/subscriptions. Capture actual broker headers and exported spans. Assert:

1. the HTTP and per-message create spans share the intended request trace;
2. each message has a unique ID and correct propagated parent span;
3. a batch send links every creation context;
4. each consumer reports its group/subscription and attempt;
5. every consumer has its creation-context link and its parentage matches the documented policy;
6. logs contain active trace/span ID plus workflow and message IDs;
7. retry attempts receive new span IDs;
8. concurrent requests never exchange metadata.

Also test a missing or malformed trace header. The consumer should start a clean trace while retaining only validated application identifiers, not inherit the previous delivery's context.

## Conclusion

HTTP-to-message fan-out needs layered correlation. Use the request trace for the initiating execution, a creation context and ID for every message, consumer group/subscription plus attempt for each delivery, and a workflow ID for durable business search. Keep message creation links on consumer spans; optionally continuing the trace through a parent-child edge suits bounded single-message work, while a local or new parent suits independent long-lived consumers. With those roles explicit, one request remains navigable without erasing message-level truth.

## Official References

- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Semantic Conventions for Messaging Spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
- [OpenTelemetry Trace API: Links](https://opentelemetry.io/docs/specs/otel/trace/api/#link)
- [OpenTelemetry Baggage](https://opentelemetry.io/docs/concepts/signals/baggage/)
- [Apache Kafka ConsumerRecord API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRecord.html)
- [RabbitMQ AMQP 0-9-1 Protocol](https://www.rabbitmq.com/amqp-0-9-1-protocol)
