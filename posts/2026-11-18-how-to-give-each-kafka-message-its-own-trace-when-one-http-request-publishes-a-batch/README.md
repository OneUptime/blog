# How to Give Each Kafka Message Its Own Trace When One HTTP Request Publishes a Batch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Kafka, Distributed Tracing

Description: Create an independent root trace for each Kafka message published by one HTTP request, preserve causality with links, and prevent automatic header replacement.

One HTTP request publishing ten Kafka records normally produces related work, so sharing its trace ID is valid. If each record becomes a long-lived independent job, however, you may deliberately want ten separate traces. Creating ten ordinary child spans will not achieve that: children retain their parent's trace ID.

The required policy is explicit: start a new root for each message, link that root to the HTTP request, and inject the root's context into that message's own headers.

## Decide who owns Kafka instrumentation

Inspect the spans and headers emitted by your installed instrumentation first. If a Java agent, framework interceptor, or Kafka wrapper already creates producer spans and injects context, configure that path before introducing manual instrumentation. Otherwise it may replace your per-message context with the active HTTP context.

The code below owns producer tracing for this send path. Disable the overlapping Kafka producer instrumentation for this path or use its documented customization mechanism. A global disable can affect other producers, so evaluate its scope in your application.

The [messaging conventions](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/) distinguish message creation context from send operations and support links across traces. Their messaging model is still marked Development; check the convention version emitted by your instrumentation.

## Start one independent producer span per record

Kafka's `send` accepts one record even when the producer later batches records into network requests. This example models each application send as that message's creation context. It uses the existing configured `OpenTelemetry` instance:

```java
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.*;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.propagation.TextMapSetter;
import java.nio.charset.StandardCharsets;
import org.apache.kafka.clients.producer.Producer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.Headers;

public final class IndependentMessageTraces {
    private static final TextMapSetter<Headers> SETTER = (headers, key, value) -> {
        headers.remove(key);
        headers.add(key, value.getBytes(StandardCharsets.UTF_8));
    };

    public static void send(OpenTelemetry otel, Producer<String, String> producer,
                            String topic, String messageId, String payload) {
        SpanContext request = Span.current().getSpanContext();
        SpanBuilder builder = otel.getTracer("example.independent-messages")
            .spanBuilder("send " + topic)
            .setNoParent()
            .setSpanKind(SpanKind.PRODUCER)
            .setAttribute("messaging.destination.name", topic)
            .setAttribute("messaging.message.id", messageId);
        if (request.isValid()) {
            builder.addLink(request);
        }
        Span messageSpan = builder.startSpan();
        try {
            ProducerRecord<String, String> record =
                new ProducerRecord<>(topic, messageId, payload);
            otel.getPropagators().getTextMapPropagator().inject(
                Context.root().with(messageSpan), record.headers(), SETTER);
            producer.send(record, (metadata, failure) -> {
                try {
                    if (failure != null) {
                        messageSpan.recordException(failure);
                        messageSpan.setStatus(StatusCode.ERROR);
                    }
                } finally {
                    messageSpan.end();
                }
            });
        } catch (RuntimeException failure) {
            messageSpan.recordException(failure);
            messageSpan.setStatus(StatusCode.ERROR);
            messageSpan.end();
            throw failure;
        }
    }
}
```

Call `send` once per item while the HTTP request span is current. `setNoParent()` establishes independence; `addLink(request)` preserves the initiating relationship. The [Java tracing API](https://opentelemetry.io/docs/languages/java/api/) documents these operations and asynchronous span lifetimes.

The callback records send completion, not consumer completion. Maintain a separate delivery-result mechanism if the HTTP response promises broker acknowledgement; this void method alone does not implement that guarantee. A bounded producer shutdown and application error handling remain necessary.

The fresh `ProducerRecord` prevents headers from leaking between messages. Kafka headers permit duplicate keys; the setter removes prior values before adding them, as supported by the [Kafka Headers API](https://kafka.apache.org/41/javadoc/org/apache/kafka/common/header/Headers.html). Root context intentionally excludes HTTP baggage; copy only the baggage your messaging contract needs.

## Preserve the message trace on consumption

For a consumer processing one message, extract its headers into a clean base context and start the processing span with that extracted parent. Include a link to the message creation context according to your chosen messaging convention. Its trace ID should match the producer message root, while its span ID should be new.

A consumer processing an indivisible batch cannot have multiple parents. Use links to all message contexts and decide whether its processing span starts another trace. Do not choose the first record's context and silently attach unrelated records to it.

## Verify the policy under concurrency

For one HTTP request publishing three messages, assert the following against captured records and exported spans:

- Three message producer spans have no parent and three distinct trace IDs.
- Every producer root links to the HTTP request's span context.
- Each record contains exactly one `traceparent` whose IDs match its producer span.
- The HTTP span remains current after each call; no message scope leaks into the next send.
- Consumer processing continues the matching message context.

Repeat with two simultaneous requests, synchronous serialization errors, and failed delivery callbacks. The [Kafka producer documentation](https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html) explains asynchronous completion and failure behavior.

Independent roots also mean independent sampling decisions. A standard parent-based sampler does not automatically sample a new root because its linked HTTP request was sampled. Check your sampler and backend's support for cross-trace links before using this design for incident investigation.
