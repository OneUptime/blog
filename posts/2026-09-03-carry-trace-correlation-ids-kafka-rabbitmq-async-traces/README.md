# How to Carry Trace and Correlation IDs Through Kafka or RabbitMQ Without Breaking Async Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Distributed Tracing, OpenTelemetry, Kafka, RabbitMQ, Correlation ID

Description: Carry standards-based trace context and application correlation identifiers through Kafka or RabbitMQ while modeling asynchronous work correctly.

---

A broker does not preserve an in-process context object. Producers must inject a serialized context into message metadata, and consumers must extract it before creating processing spans. The message payload should remain independent of the tracing vendor, while the message's headers or properties carry propagation fields.

Keep two concepts separate. W3C `traceparent` and optional `tracestate` allow tracing instrumentation to reconstruct span relationships. An application correlation ID identifies a business conversation, order, or workflow and may outlive many traces. RabbitMQ's AMQP `correlation-id` property can hold the latter; it is not a substitute for `traceparent`.

## Define a Message Metadata Contract

For each published message, use metadata such as:

~~~text
traceparent:   W3C Trace Context value, injected by a propagator
tracestate:    optional W3C vendor state, injected by a propagator
baggage:       optional, allowlisted W3C Baggage
correlation-id: stable application workflow ID, when needed
message-id:    unique ID for this logical message
causation-id:  message-id or operation ID that caused this message
~~~

Do not manufacture `traceparent` from the correlation ID. A W3C trace ID is 16 bytes with defined validity and propagation behavior; a business key has different lifecycle and security requirements. Avoid putting these values in the payload unless the domain schema itself requires them.

Kafka `ProducerRecord` and `ConsumerRecord` expose record headers. RabbitMQ clients expose AMQP message properties, including application headers, `message-id`, and `correlation-id`. Because libraries represent header values differently, define UTF-8 encoding and a single-value policy. A tracing propagator's carrier adapter should perform the actual injection and extraction.

## Inject at Publish Time

Create the producer or send span first, make it current, and then inject its context into a new message carrier:

~~~text
publish_span = tracer.start_span("send orders", kind=PRODUCER)
with make_current(publish_span):
    headers = fresh_headers()
    propagator.inject(current_context(), headers, message_setter)
    headers["correlation-id"] = workflow_id
    headers["message-id"] = message_id
    broker.publish(destination="orders", headers=headers, body=payload)
publish_span.end()
~~~

Never reuse a mutable headers object across messages. Injection updates parent information, and concurrent reuse can attach the wrong span to another record. In Kafka, copy the desired application headers into each `ProducerRecord`; in RabbitMQ, build new basic properties for each publish.

Publisher confirmation belongs to the send operation's outcome, but confirmation does not mean a consumer processed the message. Kafka acknowledgements report broker durability according to producer configuration; RabbitMQ publisher confirms report broker acceptance. Record consumer success separately.

## Extract Before Consumer Work

At delivery, extract before starting the consumer processing span:

~~~text
remote = propagator.extract(root_context, delivery.headers, message_getter)
process_span = tracer.start_span(
    "process orders",
    kind=CONSUMER,
    parent=remote,
    links=[link(remote)]
)
with make_current(process_span):
    log_context.set("correlation_id", delivery.correlation_id)
    process(delivery.body)
process_span.end()
~~~

This optional parent model is appropriate only for processing a single message when the producer's creation context is the causal predecessor. Current OpenTelemetry messaging conventions still say that a process or receive span should link to every message creation context, including this one. If processing already has a valid ambient parent, keep that parent and link the message context instead. Broker receive/poll operations may have their own client spans. Follow the behavior of your instrumentation rather than layering a second, contradictory span tree on top.

For a batch containing unrelated messages, do not pick the first message as the parent of the whole batch. Start a batch span with no arbitrary remote parent and add one link per extracted message context. Record per-message attributes on those links when values differ. OpenTelemetry explicitly uses links for batch correlation, and links should be supplied when the span is created so a head sampler can consider them.

## Model Fan-Out Without One Giant Trace

One message may reach multiple subscriptions or consumer groups. In both designs below, each process span links to the message creation context. The parent can be chosen in two legitimate ways:

- for a single-message operation, optionally use the creation context as parent and continue the producer trace into each consumer; or
- use a local or new root as parent for each independently scheduled consumer while retaining the creation-context link.

The second model is often easier for long delays, retention differences, or operationally independent consumers. It prevents a workflow lasting days from becoming an enormous trace while preserving causality through links and stable workflow identifiers. This is a modeling policy, not a requirement imposed by Kafka or RabbitMQ.

Use `messaging.system`, `messaging.destination.name`, operation type, consumer group or subscription attributes, and message ID according to the current OpenTelemetry semantic conventions. Messaging conventions are still marked Development, so pin instrumentation versions and test attribute names before building permanent queries.

## Handle Retries and Redelivery Deliberately

A retry attempt is new processing work. Give it a new span ID and record attempt metadata; do not replay an old consumer span ID as if the previous attempt were still running. Preserve the original `message-id` only if it remains the same logical message. If a retry publishes a new envelope, issue a new message ID and carry `causation-id` and workflow ID.

RabbitMQ sets a redelivered flag when a delivery may have been seen before. Its dead-letter mechanism can modify exchange and routing information and records death history in headers such as `x-death`. Kafka retries and dead-letter topics are application or framework patterns, so define equivalent attempt and origin metadata explicitly.

Treat all incoming propagation fields as untrusted. If extraction fails, start a new trace and retain a sanitized correlation ID only if it passes validation. Apply maximum lengths, never use identifiers for authorization, and avoid propagating baggage to destinations outside its intended trust domain.

## Validate the Complete Path

Test with real broker clients rather than only mocked carriers:

1. publish two records concurrently and prove their traceparents differ as expected;
2. consume one record and verify its processing span references the producer context;
3. batch unrelated records and verify links exist for every message;
4. retry a failed delivery and verify a new attempt span plus stable workflow lineage;
5. send malformed, duplicate, and absent propagation headers;
6. inspect Kafka serialization or RabbitMQ properties at the broker boundary;
7. confirm logs contain active trace/span IDs and the separate correlation ID;
8. check that acknowledgements occur only after the application's required success point.

A trace UI alone can conceal faulty metadata because auto-instrumentation may still create local spans. Assert trace IDs, parent span IDs, links, message IDs, and destination attributes in exported telemetry.

## Conclusion

Async trace continuity depends on propagator-driven injection and extraction, fresh per-message metadata, and a trace model that reflects real causality. Use W3C fields for tracing, separate domain identifiers for workflow search, links for batches or independent fan-out, and new spans for retry attempts. Those choices preserve useful correlation without turning every long-lived message flow into a misleading single span tree.

## Official References

- [OpenTelemetry Semantic Conventions for Messaging Spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
- [OpenTelemetry Trace API: Links](https://opentelemetry.io/docs/specs/otel/trace/api/#link)
- [Apache Kafka ConsumerRecord API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRecord.html)
- [Apache Kafka ProducerRecord API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/ProducerRecord.html)
- [RabbitMQ AMQP 0-9-1 Protocol](https://www.rabbitmq.com/amqp-0-9-1-protocol)
- [RabbitMQ Consumer Acknowledgements and Publisher Confirms](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ Reliability Guide](https://www.rabbitmq.com/docs/reliability)
