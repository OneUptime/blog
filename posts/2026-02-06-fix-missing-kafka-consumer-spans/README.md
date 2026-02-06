# How to Fix Missing Kafka Consumer Spans When OpenTelemetry Agent Cannot Hook Into the Consumer Group

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Kafka, Consumer Instrumentation

Description: Fix the issue where the OpenTelemetry Java agent does not produce spans for Kafka consumer operations despite active instrumentation.

The OpenTelemetry Java agent instruments Apache Kafka producers and consumers to create spans for message publishing and consumption. However, consumer spans frequently go missing due to how Kafka consumer groups work. The consumer polling loop, rebalancing, and the way records are processed can all interfere with the instrumentation.

## How Kafka Instrumentation Works

The agent instruments:
- **Producer**: Creates a PRODUCER span when `KafkaProducer.send()` is called. Injects trace context into Kafka headers.
- **Consumer**: Creates a CONSUMER span when records are processed. Extracts trace context from Kafka headers to link consumer spans to producer spans.

The expected trace:

```
order-service: publish_order     [====] 10ms  (PRODUCER span)
  payment-service: process_order   [========] 50ms  (CONSUMER span, linked to producer)
```

## Cause 1: Kafka Client Version Mismatch

The agent supports specific Kafka client versions. Check compatibility:

```bash
# Check your Kafka client version
mvn dependency:tree -Dincludes=org.apache.kafka

# Agent support: kafka-clients 0.11.0 to 3.x
```

If your version is outside the supported range, the instrumentation is silently skipped.

## Cause 2: Manual Record Processing Without Context Extraction

If you process records manually, the agent may not be able to hook in:

```java
// The agent instruments poll(), but context extraction happens per-record
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    for (ConsumerRecord<String, String> record : records) {
        // If you process here without the agent's hooks, spans may be missing
        processRecord(record);
    }
}
```

**Fix:** Make sure the agent is loaded and the Kafka instrumentation is enabled:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.instrumentation.kafka.enabled=true \
     -jar consumer-app.jar
```

## Cause 3: Spring Kafka Listener Not Instrumented

Spring Kafka's `@KafkaListener` requires the Spring Kafka instrumentation:

```java
@KafkaListener(topics = "orders")
public void listen(ConsumerRecord<String, String> record) {
    // Agent instruments this if spring-kafka instrumentation is enabled
    processOrder(record.value());
}
```

```bash
# Make sure both Kafka and Spring Kafka instrumentations are enabled
-Dotel.instrumentation.kafka.enabled=true
-Dotel.instrumentation.spring-kafka.enabled=true
```

## Cause 4: Consumer Group Rebalancing

During rebalancing, the consumer's partition assignment changes. The agent may lose context during this transition. This is a known edge case that can cause gaps in consumer traces.

**Mitigation:** Use static group membership to reduce rebalancing:

```java
Properties props = new Properties();
props.put(ConsumerConfig.GROUP_INSTANCE_ID_CONFIG, "consumer-instance-1");
// Static membership reduces rebalancing frequency
```

## Cause 5: Trace Context Not Propagated in Headers

The producer must inject trace context into Kafka headers for the consumer to extract it. If the producer does not have OpenTelemetry instrumentation, there is no context to extract.

Check the producer side:

```bash
# Producer also needs the agent
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.instrumentation.kafka.enabled=true \
     -jar producer-app.jar
```

## Verifying Context Propagation

Add a debug consumer to check if headers contain trace context:

```java
for (ConsumerRecord<String, String> record : records) {
    for (Header header : record.headers()) {
        if (header.key().equals("traceparent")) {
            System.out.println("Trace context found: " + new String(header.value()));
        }
    }
}
```

If `traceparent` headers are present, the producer instrumentation is working. If they are absent, the producer side needs fixing.

## Manual Context Propagation

If auto-instrumentation does not work for your setup, propagate context manually:

```java
// Producer side - inject context
Span span = tracer.spanBuilder("send_order")
    .setSpanKind(SpanKind.PRODUCER)
    .startSpan();

try (Scope scope = span.makeCurrent()) {
    ProducerRecord<String, String> record = new ProducerRecord<>("orders", order.toJson());

    // Inject trace context into Kafka headers
    GlobalOpenTelemetry.getPropagators().getTextMapPropagator()
        .inject(Context.current(), record.headers(), (headers, key, value) ->
            headers.add(key, value.getBytes(StandardCharsets.UTF_8)));

    producer.send(record);
} finally {
    span.end();
}
```

```java
// Consumer side - extract context
for (ConsumerRecord<String, String> record : records) {
    Context extractedContext = GlobalOpenTelemetry.getPropagators().getTextMapPropagator()
        .extract(Context.current(), record.headers(), new TextMapGetter<Headers>() {
            @Override
            public Iterable<String> keys(Headers carrier) {
                List<String> keys = new ArrayList<>();
                carrier.forEach(header -> keys.add(header.key()));
                return keys;
            }

            @Override
            public String get(Headers carrier, String key) {
                Header header = carrier.lastHeader(key);
                return header != null ? new String(header.value(), StandardCharsets.UTF_8) : null;
            }
        });

    try (Scope scope = extractedContext.makeCurrent()) {
        Span span = tracer.spanBuilder("process_order")
            .setSpanKind(SpanKind.CONSUMER)
            .startSpan();
        try (Scope s = span.makeCurrent()) {
            processOrder(record.value());
        } finally {
            span.end();
        }
    }
}
```

## Summary

Missing Kafka consumer spans are caused by version mismatches, disabled instrumentations, missing trace context in headers, or the producer not having OpenTelemetry enabled. Verify both producer and consumer have the agent, check Kafka headers for `traceparent`, and ensure the correct instrumentations are enabled.
